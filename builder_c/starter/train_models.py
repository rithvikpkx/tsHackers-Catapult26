from __future__ import annotations

import json
from pathlib import Path

from builder_c.starter.config import (
    DEMO_TASK_SCORES_PATH,
    FEATURE_MANIFEST_PATH,
    RISK_PRIOR_METRICS_PATH,
    RISK_PRIOR_MODEL_PATH,
    SEED_DATA_PATH,
    VALIDATION_PREDICTIONS_PATH,
)
from builder_c.starter.data_loader import load_demo_tasks, task_to_seed_record
from builder_c.starter.explanations import build_course_prior_explanation, build_task_risk_explanation
from builder_c.starter.modeling import RiskPriorModelBundle, load_bundle, save_bundle, train_risk_prior_model
from builder_c.starter.task_risk import ScoredTask, risk_bucket, score_task_risk


def train_and_save(force_refresh: bool = True) -> dict[str, str]:
    from builder_c.starter.oulad_pipeline import build_training_frame

    frame = build_training_frame(force_refresh=force_refresh)
    bundle, validation = train_risk_prior_model(frame)
    save_bundle(bundle)
    VALIDATION_PREDICTIONS_PATH.write_text(validation.to_csv(index=False), encoding="utf-8")
    demo_payload = generate_demo_payload(bundle)
    DEMO_TASK_SCORES_PATH.write_text(json.dumps(demo_payload, indent=2), encoding="utf-8")
    SEED_DATA_PATH.write_text(json.dumps([item["seed_task"] for item in demo_payload], indent=2), encoding="utf-8")
    return {
        "model": str(RISK_PRIOR_MODEL_PATH),
        "metrics": str(RISK_PRIOR_METRICS_PATH),
        "manifest": str(FEATURE_MANIFEST_PATH),
        "validation": str(VALIDATION_PREDICTIONS_PATH),
        "demo": str(DEMO_TASK_SCORES_PATH),
        "seed_tasks": str(SEED_DATA_PATH),
    }


def ensure_bundle(force_retrain: bool = False) -> RiskPriorModelBundle:
    if RISK_PRIOR_MODEL_PATH.exists() and not force_retrain:
        return load_bundle()
    train_and_save(force_refresh=True)
    return load_bundle()


def generate_demo_payload(bundle: RiskPriorModelBundle) -> list[dict[str, object]]:
    payload: list[dict[str, object]] = []
    for record in load_demo_tasks():
        course_risk_prior = bundle.predict_course_risk_prior(record.course_snapshot)
        record.task.course_risk_prior = course_risk_prior
        failure_risk, drivers = score_task_risk(record.task, record.personalization_signals)
        course_prior_explanation = build_course_prior_explanation(
            record.course_snapshot,
            course_risk_prior,
            bundle.thresholds,
        )
        risk_explanation = build_task_risk_explanation(
            record.task,
            failure_risk,
            drivers,
            record.personalization_signals,
            course_prior_explanation,
        )
        scored = ScoredTask(
            task_id=record.task.task_id,
            title=record.task.title,
            course=record.task.course,
            task_type=record.task.task_type,
            estimate_hours=record.task.estimate_hours,
            corrected_effort_hours=record.task.corrected_effort_hours,
            course_risk_prior=course_risk_prior,
            failure_risk=failure_risk,
            risk_bucket=risk_bucket(failure_risk),
            risk_explanation=risk_explanation,
            drivers=drivers,
        )
        payload.append(
            {
                "task_score": scored.to_dict(),
                "course_snapshot": record.course_snapshot.to_feature_dict(),
                "personalization_signals": record.personalization_signals.__dict__,
                "seed_task": task_to_seed_record(
                    task=record.task,
                    due_date=record.due_date,
                    failure_risk=failure_risk,
                    course_risk_prior=course_risk_prior,
                    risk_explanation=risk_explanation,
                ),
            }
        )
    return payload


def main() -> None:
    artifacts = train_and_save(force_refresh=True)
    print("OULAD bootstrap risk prior artifacts generated:")
    for key, value in artifacts.items():
        print(f"- {key}: {value}")


if __name__ == "__main__":
    main()
