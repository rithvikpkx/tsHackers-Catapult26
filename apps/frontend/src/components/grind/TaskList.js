export default function TaskList({ tasks }) {
  return (
    <div className="card">
      <div className="card-label">Today</div>
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
