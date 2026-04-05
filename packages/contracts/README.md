# Shared Contracts

Freeze these early so Builder A/B/C can work in parallel.

- `task.schema.json`: source of truth for task records
- `intervention.schema.json`: before/after schedule payload
- `student-course-snapshot.schema.json`: Builder A to Builder C course-context snapshot
- `task-risk-response.schema.json`: Builder C output for task-level risk scoring

