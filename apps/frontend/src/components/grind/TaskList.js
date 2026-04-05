export default function TaskList({ tasks = [], label = "Today" }) {
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
            <div className="task-name">{task.name}</div>
            <div className="task-sub">{task.subtitle}</div>
          </div>
          <span className={`badge ${task.badge}`}>{task.label}</span>
        </div>
      ))}
    </div>
  );
}
