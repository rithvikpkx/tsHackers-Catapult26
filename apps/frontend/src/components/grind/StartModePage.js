export default function StartModePage({
  hotTask,
  plan,
  loading,
  actionBusy,
  onStartTask,
  onCompleteFocusBlock,
  onCompleteTask,
}) {
  if (loading) {
    return <div className="main">Loading start mode...</div>;
  }

  if (!hotTask) {
    return (
      <div className="main">
        <div className="card">
          <div className="card-label">Start mode</div>
          <div className="start-title">No active task is loaded yet.</div>
          <p className="start-copy">Import tasks or refresh the dashboard to pull in your hottest task.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main">
      <div className="card start-card">
        <div className="card-label">Start mode</div>
        <div className="start-title">{hotTask.title}</div>
        <p className="start-copy">
          {hotTask.risk_explanation || "This is the task Grind believes needs your next protected focus block."}
        </p>

        <div className="start-stat-row">
          <div className="start-stat">
            <span className="start-stat-label">Course</span>
            <strong>{hotTask.course}</strong>
          </div>
          <div className="start-stat">
            <span className="start-stat-label">Risk</span>
            <strong>{Math.round((hotTask.failure_risk || hotTask.course_risk_prior || 0) * 100)}%</strong>
          </div>
          <div className="start-stat">
            <span className="start-stat-label">Status</span>
            <strong>{hotTask.status.replace("_", " ")}</strong>
          </div>
        </div>

        <div className="start-step">
          <div className="start-step-label">Smallest next step</div>
          <div className="start-step-copy">
            {plan?.smallest_next_step || "Open the task materials and complete the first meaningful slice."}
          </div>
        </div>

        <div className="start-actions">
          <button className="topbar-pill" onClick={onStartTask} disabled={actionBusy}>
            Mark started
          </button>
          <button className="topbar-pill" onClick={onCompleteFocusBlock} disabled={actionBusy}>
            Finish focus block
          </button>
          <button className="topbar-pill topbar-pill-primary" onClick={onCompleteTask} disabled={actionBusy}>
            Mark complete
          </button>
        </div>
      </div>
    </div>
  );
}
