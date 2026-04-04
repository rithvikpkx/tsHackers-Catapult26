const BACKEND_BASE_URL =
  process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:8000";

async function fetchJson(path, options = {}) {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Backend request failed: ${path} (${response.status})`);
  }
  return response.json();
}

function riskToBadge(riskPercent) {
  if (riskPercent >= 70) return "high";
  if (riskPercent >= 40) return "medium";
  return "low";
}

function riskToDot(riskPercent) {
  if (riskPercent >= 70) return "red";
  if (riskPercent >= 40) return "amber";
  return "green";
}

function toPercent(value) {
  return Math.round((value || 0) * 100);
}

function formatDueText(isoValue) {
  const date = new Date(isoValue);
  return `Due ${date.toLocaleString()}`;
}

function dayName(date) {
  return date.toLocaleDateString(undefined, { weekday: "short" });
}

function timeLabel(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function durationHours(startIso, endIso) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const hours = Math.max((end - start) / 3600000, 0.5);
  return `${hours.toFixed(1)}h`;
}

export async function loadDashboardPayload() {
  const [summary, tasks] = await Promise.all([
    fetchJson("/api/dashboard/summary"),
    fetchJson("/api/tasks"),
  ]);

  const sortedTasks = [...tasks].sort(
    (left, right) => (right.failure_risk || 0) - (left.failure_risk || 0)
  );
  const hotTask = sortedTasks[0] || null;

  let plan = null;
  if (hotTask) {
    try {
      plan = await fetchJson("/api/interventions/plan", {
        method: "POST",
        body: JSON.stringify({
          task_id: hotTask.id,
          current_schedule: [
            {
              start: "2026-04-05T14:00:00Z",
              end: "2026-04-05T15:00:00Z",
              label: "Gym",
            },
          ],
        }),
      });
    } catch {
      plan = null;
    }
  }

  const mappedTasks = sortedTasks.slice(0, 5).map((task) => {
    const riskPercent = toPercent(task.failure_risk);
    return {
      id: task.id,
      name: task.title,
      subtitle: formatDueText(task.due_date),
      dot: riskToDot(riskPercent),
      badge: riskToBadge(riskPercent),
      label: `${riskPercent}%`,
    };
  });

  const metrics = {
    healthScore: summary.health_score,
    healthLabel: summary.health_label,
    atRiskCount: summary.at_risk_count,
    distortionMultiplier: summary.distortion_average,
  };

  const interventionCard = plan
    ? {
        probBefore: Math.max(0, 100 - toPercent(plan.risk_before)),
        probAfter: Math.max(0, 100 - toPercent(plan.risk_after)),
        description:
          "Grind generated a survivable intervention plan from the backend pipeline and identified the smallest next step.",
      }
    : {
        probBefore: 22,
        probAfter: 91,
        description:
          "Intervention is temporarily unavailable. Start backend and ingest tasks to enable full pipeline values.",
      };

  const updatedScheduleData = plan
    ? {
        taskName: hotTask ? hotTask.title : "Top Risk Task",
        originalRisk: toPercent(plan.risk_before),
        newRisk: toPercent(plan.risk_after),
        originalBlocks: plan.before.map((block) => {
          const start = new Date(block.start);
          return {
            day: dayName(start),
            time: timeLabel(start),
            duration: durationHours(block.start, block.end),
            task: block.label,
            color: "bg-orange-100",
          };
        }),
        newBlocks: plan.after.map((block, index) => {
          const start = new Date(block.start);
          return {
            day: dayName(start),
            time: timeLabel(start),
            duration: durationHours(block.start, block.end),
            task: block.label,
            color: "bg-green-100",
            label: index >= (plan.before || []).length ? "NEW" : undefined,
          };
        }),
        changes: [
          `Risk changed from ${toPercent(plan.risk_before)}% to ${toPercent(
            plan.risk_after
          )}%`,
          "A protected focus block was added to your schedule",
          plan.smallest_next_step,
        ],
      }
    : null;

  return {
    summary,
    metrics,
    tasks: mappedTasks,
    distortion: summary.distortion_notes || [],
    interventionCard,
    interventionPlan: plan,
    hotTask,
    updatedScheduleData,
  };
}
