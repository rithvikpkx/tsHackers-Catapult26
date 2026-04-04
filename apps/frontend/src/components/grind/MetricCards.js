export default function MetricCards({ metrics }) {
  return (
    <div className="metric-grid">
      <div className="metric-card">
        <div className="metric-label">Semester health</div>
        <div className="metric-value green">{metrics.healthScore}</div>
        <div className="metric-sub">{metrics.healthLabel}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">At-risk tasks</div>
        <div className="metric-value red">{metrics.atRiskCount}</div>
        <div className="metric-sub">This week</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Distortion avg</div>
        <div className="metric-value">{metrics.distortionMultiplier}x</div>
        <div className="metric-sub">You underestimate</div>
      </div>
    </div>
  );
}

