from __future__ import annotations

import json
from datetime import datetime, timezone

from builder_c.starter.config import ARTIFACTS_DIR, EXAMPLE_PREDICTIONS_PATH, MODEL_SNAPSHOT_PATH, TASK_TYPES
from builder_c.starter.data_loader import load_demo_tasks, load_distortion_training_samples, load_risk_training_samples
from builder_c.starter.explanations import build_risk_explanation
from builder_c.starter.modeling import DistortionModel, RiskModel, ScoredTask, risk_bucket


def train_models() -> tuple[DistortionModel, RiskModel]:
    distortion_model = DistortionModel().fit(load_distortion_training_samples())
    risk_model = RiskModel().fit(load_risk_training_samples(), distortion_model)
    return distortion_model, risk_model


def score_task(task, distortion_model: DistortionModel, risk_model: RiskModel) -> ScoredTask:
    multiplier = distortion_model.predict_multiplier(task)
    corrected_effort = round(task.estimate_hours * multiplier, 2)
    failure_probability = risk_model.predict_probability(task, corrected_effort)
    explanation = build_risk_explanation(task, corrected_effort, failure_probability)
    return ScoredTask(
        task_id=task.task_id,
        title=task.title,
        course=task.course,
        task_type=task.task_type,
        estimate_hours=task.estimate_hours,
        corrected_effort_hours=corrected_effort,
        distortion_multiplier=multiplier,
        failure_probability=failure_probability,
        risk_bucket=risk_bucket(failure_probability),
        risk_explanation=explanation,
    )


def _snapshot_payload(distortion_model: DistortionModel, risk_model: RiskModel) -> dict:
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "task_types": TASK_TYPES,
        "distortion_model": {
            "feature_names": distortion_model.feature_names,
            "weights": distortion_model.weights,
            "notes": "Predicts a distortion multiplier that converts raw estimate_hours into corrected effort.",
        },
        "risk_model": {
            "feature_names": risk_model.feature_names,
            "weights": risk_model.weights,
            "notes": "Predicts the probability that a task misses its deadline based on corrected effort and timing pressure.",
        },
    }


def load_models_from_snapshot() -> tuple[DistortionModel, RiskModel] | None:
    if not MODEL_SNAPSHOT_PATH.exists():
        return None
    payload = json.loads(MODEL_SNAPSHOT_PATH.read_text(encoding="utf-8"))
    distortion_model = DistortionModel(weights=payload["distortion_model"]["weights"])
    risk_model = RiskModel(weights=payload["risk_model"]["weights"])
    return distortion_model, risk_model


def ensure_models(force_retrain: bool = False) -> tuple[DistortionModel, RiskModel]:
    if not force_retrain:
        loaded = load_models_from_snapshot()
        if loaded:
            return loaded
    distortion_model, risk_model = train_models()
    save_artifacts(distortion_model, risk_model)
    return distortion_model, risk_model


def save_artifacts(
    distortion_model: DistortionModel,
    risk_model: RiskModel,
) -> tuple[str, str]:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    MODEL_SNAPSHOT_PATH.write_text(
        json.dumps(_snapshot_payload(distortion_model, risk_model), indent=2),
        encoding="utf-8",
    )

    scored_demo_tasks = [
        score_task(task, distortion_model, risk_model).to_dict()
        for task in load_demo_tasks()
    ]
    EXAMPLE_PREDICTIONS_PATH.write_text(
        json.dumps(scored_demo_tasks, indent=2),
        encoding="utf-8",
    )
    return str(MODEL_SNAPSHOT_PATH), str(EXAMPLE_PREDICTIONS_PATH)


def train_and_save_artifacts(force_retrain: bool = True) -> tuple[str, str]:
    distortion_model, risk_model = ensure_models(force_retrain=force_retrain)
    return str(MODEL_SNAPSHOT_PATH), str(EXAMPLE_PREDICTIONS_PATH)


def main() -> None:
    distortion_model, risk_model = ensure_models(force_retrain=True)
    snapshot_path, predictions_path = save_artifacts(distortion_model, risk_model)
    print("Builder C starter artifacts generated:")
    print(f"- snapshot: {snapshot_path}")
    print(f"- predictions: {predictions_path}")


if __name__ == "__main__":
    main()
