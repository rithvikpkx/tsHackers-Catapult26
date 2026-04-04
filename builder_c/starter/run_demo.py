from __future__ import annotations

import json

from builder_c.starter.data_loader import load_demo_tasks
from builder_c.starter.train_models import ensure_models, score_task


def main() -> None:
    distortion_model, risk_model = ensure_models()
    payload = [
        score_task(task, distortion_model, risk_model).to_dict()
        for task in load_demo_tasks()
    ]
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
