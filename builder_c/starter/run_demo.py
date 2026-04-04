from __future__ import annotations

import json

from builder_c.starter.train_models import ensure_bundle, generate_demo_payload


def main() -> None:
    bundle = ensure_bundle()
    print(json.dumps(generate_demo_payload(bundle), indent=2))


if __name__ == "__main__":
    main()
