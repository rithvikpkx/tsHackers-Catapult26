from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BUILDER_C_ROOT = PROJECT_ROOT / "builder_c"
DATA_DIR = BUILDER_C_ROOT / "data"
ARTIFACTS_DIR = BUILDER_C_ROOT / "artifacts"
CONTRACTS_DIR = BUILDER_C_ROOT / "contracts"

TASK_TYPES = [
    "problem_set",
    "project",
    "essay",
    "reading",
    "lab",
]

REALISTIC_FOCUS_FRACTION = 1.0 / 12.0
MODEL_SNAPSHOT_PATH = ARTIFACTS_DIR / "model_snapshot.json"
EXAMPLE_PREDICTIONS_PATH = ARTIFACTS_DIR / "example_predictions.json"
