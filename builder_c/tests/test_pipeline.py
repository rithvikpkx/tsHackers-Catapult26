import unittest

from builder_c.starter.data_loader import PersonalizationSignals, TaskInput
from builder_c.starter.explanations import build_task_risk_explanation
from builder_c.starter.task_risk import risk_bucket, score_task_risk


class TaskRiskPipelineTest(unittest.TestCase):
    def test_high_prior_and_urgency_raise_failure_risk(self) -> None:
        task = TaskInput(
            task_id="task-1",
            title="OS problem set",
            course="OS",
            task_type="problem_set",
            estimate_hours=3.0,
            corrected_effort_hours=5.0,
            hours_until_due=18.0,
            start_delay_hours=16.0,
            status="todo",
            course_risk_prior=0.81,
        )
        personalization = PersonalizationSignals(
            recent_completion_rate=0.4,
            recent_overdue_count=2.0,
            start_lag_hours=10.0,
            focus_block_accept_rate=0.5,
            focus_block_completion_rate=0.4,
        )
        failure_risk, drivers = score_task_risk(task, personalization)
        explanation = build_task_risk_explanation(
            task,
            failure_risk,
            drivers,
            personalization,
            "The course context already looks risky because early assessment scores are trailing.",
        )

        self.assertGreaterEqual(failure_risk, 0.7)
        self.assertEqual(risk_bucket(failure_risk), "high")
        self.assertIn("high risk", explanation)

    def test_done_tasks_get_a_low_risk_floor(self) -> None:
        task = TaskInput(
            task_id="task-2",
            title="History reflection",
            course="History",
            task_type="essay",
            estimate_hours=1.5,
            corrected_effort_hours=1.5,
            hours_until_due=48.0,
            start_delay_hours=0.0,
            status="done",
            course_risk_prior=0.22,
        )
        failure_risk, _drivers = score_task_risk(task, PersonalizationSignals())
        self.assertLessEqual(failure_risk, 0.35)


if __name__ == "__main__":
    unittest.main()
