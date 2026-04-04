from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd

from builder_c.starter.config import FEATURE_CACHE_PATH, MAJOR_ACTIVITY_TYPES, OBSERVATION_WINDOW_DAYS, resolve_oulad_data_dir

COURSE_KEYS = ["code_module", "code_presentation"]
STUDENT_COURSE_KEYS = ["code_module", "code_presentation", "id_student"]

STUDENT_INFO_DTYPES = {
    "code_module": "category",
    "code_presentation": "category",
    "id_student": "int32",
    "gender": "category",
    "highest_education": "category",
    "imd_band": "category",
    "age_band": "category",
    "num_of_prev_attempts": "int16",
    "studied_credits": "int16",
    "disability": "category",
    "final_result": "category",
}

STUDENT_VLE_DTYPES = {
    "code_module": "category",
    "code_presentation": "category",
    "id_student": "int32",
    "id_site": "int32",
    "date": "int16",
    "sum_click": "int32",
}


def _read_csv(data_dir: Path, filename: str, **kwargs: Any) -> pd.DataFrame:
    return pd.read_csv(data_dir / filename, **kwargs)


def _safe_numeric(series: pd.Series, fill_value: float = 0.0) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(fill_value)


def build_training_frame(force_refresh: bool = False) -> pd.DataFrame:
    if FEATURE_CACHE_PATH.exists() and not force_refresh:
        return pd.read_csv(FEATURE_CACHE_PATH)

    data_dir = resolve_oulad_data_dir()
    if not data_dir.exists():
        raise FileNotFoundError(
            f"OULAD data directory was not found at '{data_dir}'. Set OULAD_DATA_DIR before training."
        )

    student_info = _read_csv(
        data_dir,
        "studentInfo.csv",
        dtype=STUDENT_INFO_DTYPES,
        usecols=[
            "code_module",
            "code_presentation",
            "id_student",
            "gender",
            "highest_education",
            "imd_band",
            "age_band",
            "num_of_prev_attempts",
            "studied_credits",
            "disability",
            "final_result",
        ],
    )
    courses = _read_csv(data_dir, "courses.csv")
    registrations = _read_csv(data_dir, "studentRegistration.csv")

    frame = student_info.merge(courses, on=COURSE_KEYS, how="left")
    frame = frame.merge(registrations, on=STUDENT_COURSE_KEYS, how="left")

    frame["date_registration"] = _safe_numeric(frame["date_registration"])
    frame["date_unregistration"] = pd.to_numeric(frame["date_unregistration"], errors="coerce")
    frame["days_registered_before_start"] = (-frame["date_registration"]).clip(lower=0)
    frame["unregistered_by_day_30"] = (
        frame["date_unregistration"].notna() & (frame["date_unregistration"] <= OBSERVATION_WINDOW_DAYS)
    ).astype(int)
    frame["day_of_unregistration_capped"] = frame["date_unregistration"].fillna(OBSERVATION_WINDOW_DAYS + 1).clip(
        lower=0,
        upper=OBSERVATION_WINDOW_DAYS + 1,
    )
    frame["module_presentation_length"] = _safe_numeric(frame["module_presentation_length"])
    frame["at_risk"] = frame["final_result"].isin(["Fail", "Withdrawn"]).astype(int)

    assessment_features = _build_assessment_features(data_dir)
    frame = frame.merge(assessment_features, on=STUDENT_COURSE_KEYS, how="left")

    vle_features = _build_vle_features(data_dir)
    frame = frame.merge(vle_features, on=STUDENT_COURSE_KEYS, how="left")

    frame["imd_band"] = frame["imd_band"].astype("string").fillna("missing")
    frame["highest_education"] = frame["highest_education"].astype("string").fillna("missing")
    frame["age_band"] = frame["age_band"].astype("string").fillna("missing")
    frame["disability"] = frame["disability"].astype("string").fillna("N")
    frame["gender"] = frame["gender"].astype("string").fillna("unknown")

    numeric_fill_columns = [
        "num_of_prev_attempts",
        "studied_credits",
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
        *[f"clicks_{activity_type}" for activity_type in MAJOR_ACTIVITY_TYPES],
    ]
    for column in numeric_fill_columns:
        frame[column] = _safe_numeric(frame[column])

    FEATURE_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(FEATURE_CACHE_PATH, index=False)
    return frame


def _build_assessment_features(data_dir: Path) -> pd.DataFrame:
    assessments = _read_csv(data_dir, "assessments.csv")
    student_assessment = _read_csv(data_dir, "studentAssessment.csv")
    roster = _read_csv(data_dir, "studentInfo.csv", usecols=STUDENT_COURSE_KEYS).drop_duplicates()

    assessments["date"] = pd.to_numeric(assessments["date"], errors="coerce")
    early_assessments = assessments[assessments["date"].notna() & (assessments["date"] <= OBSERVATION_WINDOW_DAYS)].copy()

    course_due = (
        early_assessments.groupby(COURSE_KEYS, observed=True)
        .agg(
            assessments_due_30d=("id_assessment", "count"),
            total_weight_due_30d=("weight", "sum"),
        )
        .reset_index()
    )

    merged = student_assessment.merge(
        early_assessments[["id_assessment", "code_module", "code_presentation", "date", "weight"]],
        on="id_assessment",
        how="inner",
    )
    merged["date_submitted"] = pd.to_numeric(merged["date_submitted"], errors="coerce")
    merged["score"] = pd.to_numeric(merged["score"], errors="coerce")
    merged["submitted_by_day_30"] = merged["date_submitted"].notna() & (merged["date_submitted"] <= OBSERVATION_WINDOW_DAYS)
    merged["late_submission"] = merged["submitted_by_day_30"] & (merged["date_submitted"] > merged["date"])
    merged["score_by_day_30"] = merged["score"].where(merged["submitted_by_day_30"])
    merged["weighted_score_component"] = (
        merged["score_by_day_30"].fillna(0.0) / 100.0 * pd.to_numeric(merged["weight"], errors="coerce").fillna(0.0)
    )
    merged["banked_count_30d"] = merged["is_banked"].fillna(0) * merged["submitted_by_day_30"].astype(int)

    by_student = (
        merged.groupby(STUDENT_COURSE_KEYS, observed=True)
        .agg(
            assessments_submitted_30d=("submitted_by_day_30", "sum"),
            assessment_mean_score_30d=("score_by_day_30", "mean"),
            weighted_score_sum_30d=("weighted_score_component", "sum"),
            late_submissions_30d=("late_submission", "sum"),
            banked_count_30d=("banked_count_30d", "sum"),
        )
        .reset_index()
    )

    by_student = roster.merge(course_due, on=COURSE_KEYS, how="left").merge(by_student, on=STUDENT_COURSE_KEYS, how="left")
    by_student["assessments_due_30d"] = _safe_numeric(by_student["assessments_due_30d"])
    by_student["assessments_submitted_30d"] = _safe_numeric(by_student["assessments_submitted_30d"])
    by_student["missing_submissions_30d"] = (
        by_student["assessments_due_30d"] - by_student["assessments_submitted_30d"]
    ).clip(lower=0)
    by_student["weighted_score_pct_30d"] = 0.0
    has_weight = by_student["total_weight_due_30d"].fillna(0.0) > 0
    by_student.loc[has_weight, "weighted_score_pct_30d"] = (
        by_student.loc[has_weight, "weighted_score_sum_30d"] / by_student.loc[has_weight, "total_weight_due_30d"] * 100.0
    )

    return by_student[
        STUDENT_COURSE_KEYS
        + [
            "assessments_due_30d",
            "assessments_submitted_30d",
            "assessment_mean_score_30d",
            "weighted_score_pct_30d",
            "missing_submissions_30d",
            "late_submissions_30d",
            "banked_count_30d",
        ]
    ]


def _build_vle_features(data_dir: Path) -> pd.DataFrame:
    student_vle = _read_csv(
        data_dir,
        "studentVle.csv",
        dtype=STUDENT_VLE_DTYPES,
        usecols=["code_module", "code_presentation", "id_student", "id_site", "date", "sum_click"],
    )
    vle = _read_csv(data_dir, "vle.csv", usecols=["id_site", "code_module", "code_presentation", "activity_type"])

    early_vle = student_vle[student_vle["date"] <= OBSERVATION_WINDOW_DAYS].copy()
    early_vle = early_vle.merge(vle, on=["id_site", "code_module", "code_presentation"], how="left")
    early_vle["pre_start_clicks"] = early_vle["sum_click"].where(early_vle["date"] < 0, 0)
    early_vle["post_start_clicks"] = early_vle["sum_click"].where(early_vle["date"] >= 0, 0)
    for activity_type in MAJOR_ACTIVITY_TYPES:
        early_vle[f"clicks_{activity_type}"] = early_vle["sum_click"].where(
            early_vle["activity_type"] == activity_type,
            0,
        )

    aggregated = (
        early_vle.groupby(STUDENT_COURSE_KEYS, observed=True)
        .agg(
            total_clicks_30d=("sum_click", "sum"),
            active_days_30d=("date", "nunique"),
            unique_sites_30d=("id_site", "nunique"),
            unique_activity_types_30d=("activity_type", "nunique"),
            pre_start_clicks=("pre_start_clicks", "sum"),
            post_start_clicks=("post_start_clicks", "sum"),
            **{f"clicks_{activity_type}": (f"clicks_{activity_type}", "sum") for activity_type in MAJOR_ACTIVITY_TYPES},
        )
        .reset_index()
    )
    return aggregated
