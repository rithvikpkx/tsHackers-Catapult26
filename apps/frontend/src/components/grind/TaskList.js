import { useState } from "react";

export default function TaskList({ tasks = [], label = "Today", onFinishTask }) {
  const [taskModes, setTaskModes] = useState({});

  function currentMode(taskId) {
    return taskModes[taskId] || "idle";
  }

  function startTask(taskId) {
    setTaskModes((prev) => ({ ...prev, [taskId]: "running" }));
  }

  function togglePause(taskId) {
    const mode = currentMode(taskId);
    setTaskModes((prev) => ({ ...prev, [taskId]: mode === "paused" ? "running" : "paused" }));
  }

  function finishTask(taskId) {
    setTaskModes((prev) => ({ ...prev, [taskId]: "done" }));
    if (typeof onFinishTask === "function") {
      onFinishTask(taskId);
    }
  }

  return (
    <div className="card">
      <div className="card-label">{label}</div>
      {!tasks.length && (
        <div className="task-item">
          <span className="task-dot gray" />
          <div className="task-info">
            <div className="task-name">No upcoming calendar tasks found</div>
            <div className="task-sub">Add events in Google Calendar, then sign in again.</div>
          </div>
          <span className="badge low">--</span>
        </div>
      )}

      {tasks.map((task) => (
        <div key={task.id} className="task-item">
          <span className={`task-dot ${task.dot}`} />
          <div className="task-info">
            <div className={`task-name ${task.completed ? "completed" : ""}`}>{task.name}</div>
            <div className="task-sub">{task.subtitle}</div>
          </div>
          <div className="task-actions">
            {!task.completed && currentMode(task.id) === "idle" && (
              <button
                type="button"
                className="task-control-btn play"
                aria-label={`Start ${task.name}`}
                onClick={() => startTask(task.id)}
              >
                Start
              </button>
            )}

            {!task.completed && currentMode(task.id) !== "idle" && (
              <div className="task-controls-inline">
                <button
                  type="button"
                  className={`task-control-btn ${currentMode(task.id) === "paused" ? "resume" : "stop"}`}
                  aria-label={currentMode(task.id) === "paused" ? `Resume ${task.name}` : `Stop ${task.name}`}
                  onClick={() => togglePause(task.id)}
                >
                  {currentMode(task.id) === "paused" ? "Resume" : "Stop"}
                </button>
                <button
                  type="button"
                  className="task-control-btn finish"
                  aria-label={`Finish ${task.name}`}
                  onClick={() => finishTask(task.id)}
                >
                  Finish
                </button>
              </div>
            )}

            {task.completed && <span className="task-complete-chip">Done</span>}
            <span className={`badge ${task.badge}`}>{task.label}</span>
          </div>
        </div>
      ))}

      <div className="task-legend">
        <span><span className="legend-dot assignment" />Assignment</span>
        <span><span className="legend-dot lecture" />Lecture</span>
        <span><span className="legend-dot other" />Other</span>
      </div>
    </div>
  );
}
