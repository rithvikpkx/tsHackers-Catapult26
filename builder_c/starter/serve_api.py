from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler, HTTPServer

from builder_c.starter.data_loader import personalization_from_dict, snapshot_from_dict, task_from_dict
from builder_c.starter.explanations import build_course_prior_explanation, build_task_risk_explanation
from builder_c.starter.task_risk import risk_bucket, score_task_risk
from builder_c.starter.train_models import ensure_bundle

BUNDLE = ensure_bundle()


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
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)
        try:
            payload = json.loads(raw_body.decode("utf-8"))
            if self.path == "/predict/risk-prior":
                snapshot = snapshot_from_dict(payload)
                course_risk_prior = BUNDLE.predict_course_risk_prior(snapshot)
                explanation = build_course_prior_explanation(snapshot, course_risk_prior, BUNDLE.thresholds)
                self._send_json(
                    {
                        "course_risk_prior": course_risk_prior,
                        "risk_bucket": risk_bucket(course_risk_prior),
                        "risk_explanation": explanation,
                    }
                )
                return
            if self.path == "/predict/task-score":
                task = task_from_dict(payload["task"])
                course_risk_prior = float(payload["course_risk_prior"])
                task.course_risk_prior = course_risk_prior
                personalization = personalization_from_dict(payload.get("personalization_signals"))
                failure_risk, drivers = score_task_risk(task, personalization)
                course_prior_explanation = str(payload.get("course_risk_explanation", "The course context is contributing risk."))
                explanation = build_task_risk_explanation(task, failure_risk, drivers, personalization, course_prior_explanation)
                self._send_json(
                    {
                        "course_risk_prior": course_risk_prior,
                        "failure_risk": failure_risk,
                        "risk_bucket": risk_bucket(failure_risk),
                        "risk_explanation": explanation,
                        "drivers": drivers,
                    }
                )
                return
            self._send_json({"error": "Not found"}, status_code=404)
        except Exception as error:  # pragma: no cover - defensive demo handler
            self._send_json({"error": str(error)}, status_code=400)


def main() -> None:
    server = HTTPServer(("127.0.0.1", 8000), BuilderCHandler)
    print("Builder C starter API listening on http://127.0.0.1:8000")
    server.serve_forever()


if __name__ == "__main__":
    main()
