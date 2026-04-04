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

async function safeFetch(path, fallback, options = {}) {
  try {
    return await fetchJson(path, options);
  } catch {
    return fallback;
  }
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

function totalBusyHours(blocks) {
  return (blocks || []).reduce((sum, block) => {
    const start = new Date(block.start);
    const end = new Date(block.end);
    return sum + Math.max((end - start) / 3600000, 0);
  }, 0);
}

function serializeBlock(block, index, isNew = false) {
  const start = new Date(block.start);
  return {
    id: `${block.label}-${index}-${block.start}`,
    day: dayName(start),
    slotHour: start.getHours(),
    time: timeLabel(start),
    duration: durationHours(block.start, block.end),
    task: block.label,
    color: isNew ? "bg-green-100" : "bg-orange-100",
    label: isNew ? "NEW" : undefined,
  };
}

export async function loadDashboardPayload() {
  const tasks = await safeFetch("/api/tasks", []);
  const summary = await safeFetch("/api/dashboard/summary", {
    health_score: 74,
    health_label: "Stable",
    resting_rate: 68,
    distortion_average: 1.0,
    at_risk_count: 0,
    distortion_notes: [],
  });
  const calendarStatus = await safeFetch("/api/calendar/status", {
    connected: false,
    provider: "google",
    has_refresh_token: false,
  });
  const schedule = await safeFetch("/api/calendar/schedule?days=7", {
    status: calendarStatus,
    blocks: [],
  });

  const sortedTasks = [...tasks].sort(
    (left, right) => (right.failure_risk || right.course_risk_prior || 0) - (left.failure_risk || left.course_risk_prior || 0)
  );
  const hotTask = sortedTasks.find((task) => task.status !== "done") || sortedTasks[0] || null;

  let plan = null;
  if (hotTask) {
    plan = await safeFetch("/api/interventions/plan", null, {
      method: "POST",
      body: JSON.stringify({
        task_id: hotTask.id,
        current_schedule: schedule.blocks || [],
      }),
    });
  }

  const mappedTasks = sortedTasks.map((task) => {
    const riskPercent = toPercent(task.failure_risk || task.course_risk_prior);
    return {
      id: task.id,
      name: task.title,
      subtitle: formatDueText(task.due_date),
      status: task.status,
      course: task.course,
      dot: riskToDot(riskPercent),
      badge: riskToBadge(riskPercent),
      label: `${riskPercent}%`,
      riskPercent,
      riskExplanation: task.risk_explanation,
      dueDate: task.due_date,
    };
  });

  const metrics = {
    healthScore: summary.health_score,
    healthLabel: summary.health_label,
    atRiskCount: summary.at_risk_count,
    distortionMultiplier: summary.distortion_average,
    calendarHours: totalBusyHours(schedule.blocks).toFixed(1),
  };

  const interventionCard = plan
    ? {
        probBefore: Math.max(0, 100 - toPercent(plan.risk_before)),
        probAfter: Math.max(0, 100 - toPercent(plan.risk_after)),
        description: calendarStatus.connected
          ? "Grind pulled your schedule, protected a focus block, and updated the risk path for the hottest task."
          : "Grind built an intervention plan. Connect Google Calendar to turn it into a live schedule change.",
      }
    : {
        probBefore: 45,
        probAfter: 62,
        description: "No intervention plan is available yet. Load tasks first, then sync your calendar.",
      };

  const updatedScheduleData = plan
    ? {
        taskName: hotTask ? hotTask.title : "Top Risk Task",
        originalRisk: toPercent(plan.risk_before),
        newRisk: toPercent(plan.risk_after),
        originalBlocks: plan.before.map((block, index) => serializeBlock(block, index, false)),
        newBlocks: plan.after.map((block, index) =>
          serializeBlock(block, index, index >= (plan.before || []).length)
        ),
        changes: [
          `Failure risk moves from ${toPercent(plan.risk_before)}% to ${toPercent(plan.risk_after)}%.`,
          calendarStatus.connected
            ? "A protected focus block is ready to write into Google Calendar."
            : "Connect Google Calendar to push this focus block into your real schedule.",
          plan.smallest_next_step,
        ],
      }
    : null;

  return {
    summary,
    metrics,
    tasks: mappedTasks.slice(0, 5),
    allTasks: mappedTasks,
    rawTasks: sortedTasks,
    distortion: summary.distortion_notes || [],
    interventionCard,
    interventionPlan: plan,
    hotTask,
    updatedScheduleData,
    calendar: {
      status: schedule.status || calendarStatus,
      blocks: schedule.blocks || [],
      totalBusyHours: totalBusyHours(schedule.blocks || []),
      windowStart: schedule.window_start,
      windowEnd: schedule.window_end,
    },
  };
}

export async function startCalendarConnection() {
  return fetchJson("/api/calendar/connect/start");
}

export async function syncCalendarSchedule(days = 7) {
  return fetchJson(`/api/calendar/schedule?days=${days}`);
}

export async function createFocusBlock(plan, hotTask) {
  if (!plan || !hotTask || !plan.after || plan.after.length === 0) {
    throw new Error("No intervention plan available");
  }
  const block = plan.after[plan.after.length - 1];
  return fetchJson("/api/calendar/focus-block", {
    method: "POST",
    body: JSON.stringify({
      task_id: hotTask.id,
      title: block.label,
      start: block.start,
      end: block.end,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    }),
  });
}

export async function updateTaskStatus(taskId, status) {
  return fetchJson(`/api/tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function logTaskEvent(eventType, taskId, metadata = {}) {
  return fetchJson("/api/events", {
    method: "POST",
    body: JSON.stringify({
      event_type: eventType,
      task_id: taskId,
      occurred_at: new Date().toISOString(),
      metadata,
    }),
  });
}
