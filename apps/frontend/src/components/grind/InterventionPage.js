import "./Intervention.css";

function fmt(isoValue) {
  return new Date(isoValue).toLocaleString();
}

export default function InterventionPage({ plan, hotTask, loading }) {
  if (loading) {
    return <div className="intervention-page">Loading intervention plan...</div>;
  }

  if (!plan || !hotTask) {
    return (
      <div className="intervention-page">
        <div className="iv-header">
          <div className="iv-risk-tag">Pipeline waiting</div>
          <h1 className="iv-title">No intervention plan available yet</h1>
          <p className="iv-desc">
            Start backend, ingest tasks, and refresh to load live intervention values.
          </p>
        </div>
      </div>
    );
  }

  const riskBefore = Math.round((plan.risk_before || 0) * 100);
  const riskAfter = Math.round((plan.risk_after || 0) * 100);

  return (
    <div className="intervention-page">
      <div className="iv-header">
        <div className="iv-risk-tag">{riskBefore}% failure risk</div>
        <h1 className="iv-title">{hotTask.title} has elevated failure risk</h1>
        <p className="iv-desc">{hotTask.risk_explanation || "Backend generated an intervention plan."}</p>
      </div>

      <div className="iv-schedule">
        <div className="iv-col">
          <div className="iv-col-label">Before</div>
          {plan.before.map((item, i) => (
            <div key={i} className="iv-event neutral">
              <div className="iv-event-time">{fmt(item.start)} to {fmt(item.end)}</div>
              <div className="iv-event-label">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="iv-divider">-&gt;</div>
        <div className="iv-col">
          <div className="iv-col-label">After</div>
          {plan.after.map((item, i) => (
            <div key={i} className="iv-event added">
              <div className="iv-event-time">{fmt(item.start)} to {fmt(item.end)}</div>
              <div className="iv-event-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="iv-prob-card">
        <div className="iv-prob-row">
          <div className="iv-prob-block">
            <div className="iv-prob-label">Before</div>
            <div className="iv-prob-num red">{riskBefore}%</div>
            <div className="iv-prob-sub">failure risk</div>
          </div>
          <div className="iv-prob-arrow">-&gt;</div>
          <div className="iv-prob-block">
            <div className="iv-prob-label">After</div>
            <div className="iv-prob-num green">{riskAfter}%</div>
            <div className="iv-prob-sub">failure risk</div>
          </div>
        </div>
        <p className="iv-cta-text">{plan.smallest_next_step}</p>
        <button className="iv-start-btn">Open Start Mode -&gt;</button>
      </div>
    </div>
  );
}

