export default function TaskList({ tasks }) {
  const rows = tasks && tasks.length > 0 ? tasks : [
    { id: "none", name: "No tasks loaded", subtitle: "Run ingest on backend", dot: "gray", badge: "low", label: "n/a" },
  ];
  return (
    <div className="card">
      <div className="card-label">Today</div>
      {rows.map((task) => (
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
