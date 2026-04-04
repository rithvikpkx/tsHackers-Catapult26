from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from builder_c.starter.data_loader import task_from_dict
from builder_c.starter.train_models import ensure_models, score_task


DISTORTION_MODEL, RISK_MODEL = ensure_models()


class BuilderCHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload: dict, status_code: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/health":
            self._send_json({"error": "Not found"}, status_code=404)
            return
        self._send_json({"status": "ok", "service": "builder-c-starter"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/score":
            self._send_json({"error": "Not found"}, status_code=404)
            return
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
            task = task_from_dict(payload)
            scored = score_task(task, DISTORTION_MODEL, RISK_MODEL).to_dict()
            self._send_json(scored)
        except Exception as error:  # pragma: no cover - defensive demo handler
            self._send_json({"error": str(error)}, status_code=400)


def main() -> None:
    server = HTTPServer(("127.0.0.1", 8000), BuilderCHandler)
    print("Builder C starter API listening on http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
