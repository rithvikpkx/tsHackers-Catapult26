from __future__ import annotations

from dataclasses import dataclass
import json
from typing import Any

import numpy as np

from builder_c.starter.config import FEATURE_MANIFEST_PATH, RISK_PRIOR_METRICS_PATH, RISK_PRIOR_MODEL_PATH
from builder_c.starter.data_loader import StudentCourseSnapshot

NUMERIC_FEATURES = [
    "studied_credits",
    "num_of_prev_attempts",
    "days_registered_before_start",
    "module_presentation_length",
    "unregistered_by_day_30",
    "day_of_unregistration_capped",
    "assessments_due_30d",
    "assessments_submitted_30d",
    "assessment_mean_score_30d",
    "weighted_score_pct_30d",
    "missing_submissions_30d",
    "late_submissions_30d",
    "banked_count_30d",
    "total_clicks_30d",
    "active_days_30d",
    "unique_sites_30d",
    "unique_activity_types_30d",
    "pre_start_clicks",
    "post_start_clicks",
    "clicks_resource",
    "clicks_oucontent",
    "clicks_subpage",
    "clicks_url",
    "clicks_forumng",
    "clicks_quiz",
]

CATEGORICAL_FEATURES = [
    "code_module",
    "code_presentation",
    "gender",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
]

TARGET_COLUMN = "at_risk"


def _sigmoid(values: np.ndarray) -> np.ndarray:
    clipped = np.clip(values, -35, 35)
    return 1.0 / (1.0 + np.exp(-clipped))


def _roc_auc_score(y_true: np.ndarray, y_score: np.ndarray) -> float:
    positive = y_true == 1
    negative = y_true == 0
    n_positive = int(positive.sum())
    n_negative = int(negative.sum())
    if n_positive == 0 or n_negative == 0:
        return 0.5
    order = np.argsort(y_score)
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, len(y_score) + 1)
    rank_sum = ranks[positive].sum()
    return float((rank_sum - n_positive * (n_positive + 1) / 2.0) / (n_positive * n_negative))


def _average_precision_score(y_true: np.ndarray, y_score: np.ndarray) -> float:
    total_positive = int((y_true == 1).sum())
    if total_positive == 0:
        return 0.0
    order = np.argsort(-y_score)
    y_sorted = y_true[order]
    cumulative_true = np.cumsum(y_sorted == 1)
    precision = cumulative_true / np.arange(1, len(y_sorted) + 1)
    return float(precision[y_sorted == 1].sum() / total_positive)


def _brier_score_loss(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    return float(np.mean((y_prob - y_true) ** 2))


@dataclass
class RiskPriorModelBundle:
    weights: list[float]
    bias: float
    numeric_features: list[str]
    categorical_features: list[str]
    numeric_stats: dict[str, dict[str, float]]
    categorical_levels: dict[str, list[str]]
    thresholds: dict[str, float]
    metrics: dict[str, Any]

    def predict_course_risk_prior(self, snapshot: StudentCourseSnapshot) -> float:
        vector = _vectorize_row(
            snapshot.to_feature_dict(),
            self.numeric_features,
            self.categorical_features,
            self.numeric_stats,
            self.categorical_levels,
        )
        probability = float(_sigmoid(np.dot(vector, np.array(self.weights)) + self.bias))
        return round(probability, 2)


def train_risk_prior_model(frame) -> tuple[RiskPriorModelBundle, Any]:
    import pandas as pd

    usable = frame[NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET_COLUMN]].copy()
    train = usable.sample(frac=0.8, random_state=42)
    validation = usable.drop(index=train.index)

    numeric_stats = _build_numeric_stats(train)
    categorical_levels = _build_categorical_levels(train)
    X_train = _build_matrix(train, numeric_stats, categorical_levels)
    y_train = train[TARGET_COLUMN].astype(int).to_numpy()
    X_validation = _build_matrix(validation, numeric_stats, categorical_levels)
    y_validation = validation[TARGET_COLUMN].astype(int).to_numpy()

    weights, bias = _fit_logistic_regression(X_train, y_train)

    train_probs = _sigmoid(X_train @ weights + bias)
    validation_probs = _sigmoid(X_validation @ weights + bias)
    dummy_prob = float(y_train.mean())
    dummy_probs = np.full_like(validation_probs, fill_value=dummy_prob)

    metrics = {
        "train_rows": int(len(train)),
        "validation_rows": int(len(validation)),
        "model": {
            "auroc": round(_roc_auc_score(y_validation, validation_probs), 4),
            "pr_auc": round(_average_precision_score(y_validation, validation_probs), 4),
            "brier_score": round(_brier_score_loss(y_validation, validation_probs), 4),
            "train_brier_score": round(_brier_score_loss(y_train, train_probs), 4),
        },
        "dummy": {
            "auroc": round(_roc_auc_score(y_validation, dummy_probs), 4),
            "pr_auc": round(_average_precision_score(y_validation, dummy_probs), 4),
            "brier_score": round(_brier_score_loss(y_validation, dummy_probs), 4),
        },
    }

    validation_output = validation.copy()
    validation_output["target_at_risk"] = y_validation
    validation_output["course_risk_prior"] = np.round(validation_probs, 4)
    validation_output["dummy_risk_prior"] = np.round(dummy_probs, 4)

    bundle = RiskPriorModelBundle(
        weights=weights.tolist(),
        bias=float(bias),
        numeric_features=NUMERIC_FEATURES[:],
        categorical_features=CATEGORICAL_FEATURES[:],
        numeric_stats=numeric_stats,
        categorical_levels=categorical_levels,
        thresholds=_build_thresholds(frame),
        metrics=metrics,
    )
    return bundle, validation_output


def _build_numeric_stats(frame) -> dict[str, dict[str, float]]:
    stats: dict[str, dict[str, float]] = {}
    for feature in NUMERIC_FEATURES:
        series = frame[feature]
        median = float(series.median())
        filled = series.fillna(median).astype(float)
        mean = float(filled.mean())
        std = float(filled.std()) or 1.0
        stats[feature] = {"median": median, "mean": mean, "std": std}
    return stats


def _build_categorical_levels(frame) -> dict[str, list[str]]:
    levels: dict[str, list[str]] = {}
    for feature in CATEGORICAL_FEATURES:
        series = frame[feature].astype("string").fillna("missing")
        levels[feature] = sorted(series.astype(str).unique().tolist())
    return levels


def _build_matrix(frame, numeric_stats: dict[str, dict[str, float]], categorical_levels: dict[str, list[str]]) -> np.ndarray:
    numeric_parts: list[np.ndarray] = []
    for feature in NUMERIC_FEATURES:
        stats = numeric_stats[feature]
        series = frame[feature].fillna(stats["median"]).astype(float)
        numeric_parts.append(((series - stats["mean"]) / stats["std"]).to_numpy())

    categorical_parts: list[np.ndarray] = []
    for feature in CATEGORICAL_FEATURES:
        levels = categorical_levels[feature]
        series = frame[feature].astype("string").fillna("missing").astype(str)
        for level in levels:
            categorical_parts.append((series == level).astype(float).to_numpy())

    columns = numeric_parts + categorical_parts
    return np.column_stack(columns)


def _vectorize_row(
    row: dict[str, Any],
    numeric_features: list[str],
    categorical_features: list[str],
    numeric_stats: dict[str, dict[str, float]],
    categorical_levels: dict[str, list[str]],
) -> np.ndarray:
    values: list[float] = []
    for feature in numeric_features:
        stats = numeric_stats[feature]
        raw_value = float(row.get(feature, stats["median"]))
        normalized = (raw_value - stats["mean"]) / stats["std"]
        values.append(normalized)
    for feature in categorical_features:
        raw_value = str(row.get(feature, "missing"))
        for level in categorical_levels[feature]:
            values.append(1.0 if raw_value == level else 0.0)
    return np.array(values, dtype=float)


def _fit_logistic_regression(X: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, float]:
    weights = np.zeros(X.shape[1], dtype=float)
    bias = 0.0
    learning_rate = 0.12
    regularization = 0.001
    positive_weight = len(y) / max(2 * int((y == 1).sum()), 1)
    negative_weight = len(y) / max(2 * int((y == 0).sum()), 1)
    sample_weights = np.where(y == 1, positive_weight, negative_weight)

    for _ in range(2200):
        logits = X @ weights + bias
        probs = _sigmoid(logits)
        error = (probs - y) * sample_weights
        grad_w = (X.T @ error) / len(y) + regularization * weights
        grad_b = float(error.mean())
        weights -= learning_rate * grad_w
        bias -= learning_rate * grad_b

    return weights, bias


def _build_thresholds(frame) -> dict[str, float]:
    return {
        "weighted_score_pct_30d_low": round(float(frame["weighted_score_pct_30d"].quantile(0.25)), 2),
        "total_clicks_30d_low": round(float(frame["total_clicks_30d"].quantile(0.25)), 2),
        "active_days_30d_low": round(float(frame["active_days_30d"].quantile(0.25)), 2),
        "recent_score_good": round(float(frame["weighted_score_pct_30d"].quantile(0.6)), 2),
    }


def save_bundle(bundle: RiskPriorModelBundle) -> None:
    RISK_PRIOR_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    model_payload = {
        "weights": bundle.weights,
        "bias": bundle.bias,
        "numeric_features": bundle.numeric_features,
        "categorical_features": bundle.categorical_features,
        "numeric_stats": bundle.numeric_stats,
        "categorical_levels": bundle.categorical_levels,
        "thresholds": bundle.thresholds,
        "metrics": bundle.metrics,
    }
    RISK_PRIOR_MODEL_PATH.write_text(json.dumps(model_payload, indent=2), encoding="utf-8")
    FEATURE_MANIFEST_PATH.write_text(
        json.dumps(
            {
                "numeric_features": bundle.numeric_features,
                "categorical_features": bundle.categorical_features,
                "thresholds": bundle.thresholds,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    RISK_PRIOR_METRICS_PATH.write_text(json.dumps(bundle.metrics, indent=2), encoding="utf-8")


def load_bundle() -> RiskPriorModelBundle:
    payload = json.loads(RISK_PRIOR_MODEL_PATH.read_text(encoding="utf-8"))
    return RiskPriorModelBundle(
        weights=list(payload["weights"]),
        bias=float(payload["bias"]),
        numeric_features=list(payload["numeric_features"]),
        categorical_features=list(payload["categorical_features"]),
        numeric_stats=dict(payload["numeric_stats"]),
        categorical_levels=dict(payload["categorical_levels"]),
        thresholds=dict(payload["thresholds"]),
        metrics=dict(payload["metrics"]),
    )
