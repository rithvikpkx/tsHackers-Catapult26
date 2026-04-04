export default function InterventionCard({ intervention, onOpen }) {
  return (
    <div className="card">
      <div className="intervention-header">
        <div>
          <div className="intervention-tag">Active intervention</div>
          <div className="intervention-title">What changed today</div>
        </div>
        <span className="badge high" style={{ fontSize: 12 }}>High risk</span>
      </div>
      <p className="intervention-desc">{intervention.description}</p>
      <div className="prob-row">
        <span className="prob-from">{intervention.probBefore}%</span>
        <span className="prob-arrow">→</span>
        <span className="prob-to">{intervention.probAfter}%</span>
        <span className="prob-label">success probability</span>
      </div>
      <button className="open-btn" onClick={onOpen}>
        Open intervention ↗
      </button>
    </div>
  );
}