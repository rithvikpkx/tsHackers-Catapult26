import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BUILDER_C_ROOT = PROJECT_ROOT / "builder_c"
DATA_DIR = BUILDER_C_ROOT / "data"
ARTIFACTS_DIR = BUILDER_C_ROOT / "artifacts"
CONTRACTS_DIR = BUILDER_C_ROOT / "contracts"
SEED_DATA_PATH = PROJECT_ROOT / "data" / "seed" / "tasks.json"

DEFAULT_OULAD_DATA_DIR = Path(r"C:\Users\athar\Downloads\archive (2)")
OBSERVATION_WINDOW_DAYS = 30

MAJOR_ACTIVITY_TYPES = [
    "resource",
    "oucontent",
    "subpage",
    "url",
    "forumng",
    "quiz",
]

TASK_TYPES = [
    "problem_set",
    "project",
    "essay",
    "reading",
    "lab",
    "quiz",
]

RISK_PRIOR_MODEL_PATH = ARTIFACTS_DIR / "risk_prior_model.json"
RISK_PRIOR_METRICS_PATH = ARTIFACTS_DIR / "risk_prior_metrics.json"
FEATURE_MANIFEST_PATH = ARTIFACTS_DIR / "feature_manifest.json"
VALIDATION_PREDICTIONS_PATH = ARTIFACTS_DIR / "validation_predictions.csv"
DEMO_TASK_SCORES_PATH = ARTIFACTS_DIR / "demo_task_scores.json"
FEATURE_CACHE_PATH = ARTIFACTS_DIR / "oulad_feature_cache.csv"

COURSE_PRIOR_WEIGHT = 0.58
URGENCY_WEIGHT = 0.18
START_DELAY_WEIGHT = 0.08
COMPLETION_PENALTY_WEIGHT = 0.08
OVERDUE_PENALTY_WEIGHT = 0.08
FOCUS_PENALTY_WEIGHT = 0.06
START_LAG_TREND_WEIGHT = 0.05
FOCUS_ACCEPTANCE_WEIGHT = 0.03
STATUS_WEIGHTS = {
    "todo": 0.06,
    "in_progress": 0.0,
    "blocked": 0.14,
    "done": -0.45,
}


def resolve_oulad_data_dir() -> Path:
    env_value = os.getenv("OULAD_DATA_DIR")
    if env_value:
        return Path(env_value)
    return DEFAULT_OULAD_DATA_DIR
