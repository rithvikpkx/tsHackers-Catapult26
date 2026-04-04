import "./Intervention.css";

const BEFORE = [
  { time: "Thu 5:00 PM", label: "Gym",            type: "removed" },
  { time: "Thu 7:00 PM", label: "Study group",    type: "moved"   },
  { time: "Fri 11:59 PM", label: "OS due",        type: "neutral" },
];

const AFTER = [
  { time: "Thu 6:00 PM – 10:00 PM", label: "Focus block: OS Problem Set", type: "added"   },
  { time: "Fri 3:00 PM",            label: "Study group moved",            type: "moved"   },
  { time: "Fri 4:30 PM",            label: "Gym removed from critical window", type: "removed" },
];

export default function InterventionPage() {
  return (
    <div className="intervention-page">
      <div className="iv-header">
        <div className="iv-risk-tag">78% failure risk</div>
        <h1 className="iv-title">Your OS Problem Set has a high chance of failing</h1>
        <p className="iv-desc">
          Based on your history, this assignment type takes about 5h 15m. You currently have
          only 2h 30m of usable time before the deadline. Grind rescheduled two flexible
          commitments to create a protected focus block.
        </p>
      </div>

      <div className="iv-schedule">
        <div className="iv-col">
          <div className="iv-col-label">Before</div>
          {BEFORE.map((item, i) => (
            <div key={i} className={`iv-event ${item.type}`}>
              <div className="iv-event-time">{item.time}</div>
              <div className="iv-event-label">{item.label}</div>
            </div>
          ))}
        </div>
        <div className="iv-divider">→</div>
        <div className="iv-col">
          <div className="iv-col-label">After</div>
          {AFTER.map((item, i) => (
            <div key={i} className={`iv-event ${item.type}`}>
              <div className="iv-event-time">{item.time}</div>
              <div className="iv-event-label">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="iv-prob-card">
        <div className="iv-prob-row">
          <div className="iv-prob-block">
            <div className="iv-prob-label">Before</div>
            <div className="iv-prob-num red">22%</div>
            <div className="iv-prob-sub">success probability</div>
          </div>
          <div className="iv-prob-arrow">→</div>
          <div className="iv-prob-block">
            <div className="iv-prob-label">After</div>
            <div className="iv-prob-num green">91%</div>
            <div className="iv-prob-sub">success probability</div>
          </div>
        </div>
        <p className="iv-cta-text">Start by 6:00 PM tonight to lock in this success rate.</p>
        <button className="iv-start-btn">Open Start Mode →</button>
      </div>
    </div>
  );
}
