import json
import unittest
from pathlib import Path

from builder_c.starter.config import EXAMPLE_PREDICTIONS_PATH, MODEL_SNAPSHOT_PATH
from builder_c.starter.data_loader import load_demo_tasks
from builder_c.starter.train_models import ensure_models, score_task, train_and_save_artifacts


class BuilderCPipelineTest(unittest.TestCase):
    def test_demo_task_scores_are_usable(self) -> None:
        distortion_model, risk_model = ensure_models(force_retrain=True)
        task = load_demo_tasks()[0]
        scored = score_task(task, distortion_model, risk_model)

        self.assertGreaterEqual(scored.corrected_effort_hours, task.estimate_hours)
        self.assertGreaterEqual(scored.failure_probability, 0.0)
        self.assertLessEqual(scored.failure_probability, 1.0)
        self.assertTrue(scored.risk_explanation)

    def test_training_writes_snapshot_and_predictions(self) -> None:
        train_and_save_artifacts(force_retrain=True)

        self.assertTrue(Path(MODEL_SNAPSHOT_PATH).exists())
        self.assertTrue(Path(EXAMPLE_PREDICTIONS_PATH).exists())

        snapshot = json.loads(Path(MODEL_SNAPSHOT_PATH).read_text(encoding="utf-8"))
        predictions = json.loads(Path(EXAMPLE_PREDICTIONS_PATH).read_text(encoding="utf-8"))

        self.assertIn("distortion_model", snapshot)
        self.assertGreaterEqual(len(predictions), 1)


if __name__ == "__main__":
    unittest.main()
