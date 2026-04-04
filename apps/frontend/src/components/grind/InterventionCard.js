export default function InterventionCard({ intervention, onOpen }) {
  const badgeClass =
    intervention.probBefore >= 70 ? "high" : intervention.probBefore >= 45 ? "medium" : "low";
  const badgeLabel =
    intervention.probBefore >= 70 ? "Urgent" : intervention.probBefore >= 45 ? "Watch" : "Stable";

  return (
    <div className="card">
      <div className="intervention-header">
        <div>
          <div className="intervention-tag">Active intervention</div>
          <div className="intervention-title">What changed today</div>
        </div>
        <span className={`badge ${badgeClass}`} style={{ fontSize: 12 }}>
          {badgeLabel}
        </span>
      </div>
      <p className="intervention-desc">{intervention.description}</p>
      <div className="prob-row">
        <span className="prob-from">{intervention.probBefore}%</span>
        <span className="prob-arrow">-&gt;</span>
        <span className="prob-to">{intervention.probAfter}%</span>
        <span className="prob-label">success probability</span>
      </div>
      <button className="open-btn" onClick={onOpen}>
        Open intervention ->
      </button>
    </div>
  );
}
