from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from builder_c.starter.config import REALISTIC_FOCUS_FRACTION, TASK_TYPES
from builder_c.starter.data_loader import DistortionTrainingSample, RiskTrainingSample, TaskInput


def clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def dot(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


def sigmoid(value: float) -> float:
    if value >= 0:
        exp_term = 2.718281828459045 ** (-value)
        return 1.0 / (1.0 + exp_term)
    exp_term = 2.718281828459045 ** value
    return exp_term / (1.0 + exp_term)


def one_hot(task_type: str) -> list[float]:
    return [1.0 if task_type == known else 0.0 for known in TASK_TYPES]


def urgency_score(hours_until_due: float) -> float:
    return clamp((72.0 - hours_until_due) / 72.0, 0.0, 1.0)


def available_focus_hours(task: TaskInput) -> float:
    return max(1.0, task.hours_until_due * REALISTIC_FOCUS_FRACTION)


@dataclass
class ScoredTask:
    task_id: str
    title: str
    course: str
    task_type: str
    estimate_hours: float
    corrected_effort_hours: float
    distortion_multiplier: float
    failure_probability: float
    risk_bucket: str
    risk_explanation: str

    def to_dict(self) -> dict[str, Any]:
        return self.__dict__.copy()


class DistortionModel:
    feature_names = [
        "bias",
        "estimate_scale",
        "start_delay_scale",
        "urgency_scale",
        "weekly_course_load_scale",
        *[f"type::{task_type}" for task_type in TASK_TYPES],
    ]

    def __init__(self, weights: list[float] | None = None) -> None:
        default = [1.0] + [0.0] * (len(self.feature_names) - 1)
        self.weights = weights[:] if weights else default

    def vectorize(self, task: TaskInput) -> list[float]:
        return [
            1.0,
            task.estimate_hours / 8.0,
            task.start_delay_hours / 24.0,
            urgency_score(task.hours_until_due),
            task.weekly_course_load / 18.0,
            *one_hot(task.task_type),
        ]

    def fit(
        self,
        samples: list[DistortionTrainingSample],
        epochs: int = 1400,
        learning_rate: float = 0.055,
    ) -> "DistortionModel":
        feature_count = len(self.feature_names)
        self.weights = [1.0] + [0.0] * (feature_count - 1)
        sample_count = max(len(samples), 1)
        for _ in range(epochs):
            gradients = [0.0] * feature_count
            for sample in samples:
                features = self.vectorize(sample)
                target_ratio = sample.actual_hours / max(sample.estimate_hours, 0.5)
                prediction = dot(self.weights, features)
                error = prediction - target_ratio
                for index, value in enumerate(features):
                    gradients[index] += (2.0 / sample_count) * error * value
            for index in range(feature_count):
                self.weights[index] -= learning_rate * gradients[index]
        return self

    def predict_multiplier(self, task: TaskInput) -> float:
        return round(clamp(dot(self.weights, self.vectorize(task)), 0.75, 2.5), 2)

    def predict_corrected_effort(self, task: TaskInput) -> float:
        return round(task.estimate_hours * self.predict_multiplier(task), 2)


class RiskModel:
    feature_names = [
        "bias",
        "pressure_ratio",
        "corrected_effort_scale",
        "start_delay_scale",
        "urgency_scale",
        "weekly_course_load_scale",
        *[f"type::{task_type}" for task_type in TASK_TYPES],
    ]

    def __init__(self, weights: list[float] | None = None) -> None:
        default = [-1.0] + [0.0] * (len(self.feature_names) - 1)
        self.weights = weights[:] if weights else default

    def vectorize(self, task: TaskInput, corrected_effort_hours: float) -> list[float]:
        pressure_ratio = corrected_effort_hours / available_focus_hours(task)
        return [
            1.0,
            pressure_ratio,
            corrected_effort_hours / 8.0,
            task.start_delay_hours / 24.0,
            urgency_score(task.hours_until_due),
            task.weekly_course_load / 18.0,
            *one_hot(task.task_type),
        ]

    def fit(
        self,
        samples: list[RiskTrainingSample],
        distortion_model: DistortionModel,
        epochs: int = 2200,
        learning_rate: float = 0.18,
    ) -> "RiskModel":
        feature_count = len(self.feature_names)
        self.weights = [-1.0] + [0.0] * (feature_count - 1)
        sample_count = max(len(samples), 1)
        for _ in range(epochs):
            gradients = [0.0] * feature_count
            for sample in samples:
                corrected_effort = distortion_model.predict_corrected_effort(sample)
                features = self.vectorize(sample, corrected_effort)
                label = 1.0 if sample.missed_deadline else 0.0
                prediction = sigmoid(dot(self.weights, features))
                error = prediction - label
                for index, value in enumerate(features):
                    gradients[index] += (1.0 / sample_count) * error * value
            for index in range(feature_count):
                self.weights[index] -= learning_rate * gradients[index]
        return self

    def predict_probability(self, task: TaskInput, corrected_effort_hours: float) -> float:
        raw_probability = sigmoid(dot(self.weights, self.vectorize(task, corrected_effort_hours)))
        return round(clamp(raw_probability, 0.02, 0.98), 2)


def risk_bucket(probability: float) -> str:
    if probability >= 0.7:
        return "high"
    if probability >= 0.4:
        return "medium"
    return "low"
