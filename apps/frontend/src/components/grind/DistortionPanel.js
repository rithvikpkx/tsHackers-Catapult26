export default function DistortionPanel({ insights }) {
  const lines = insights && insights.length > 0 ? insights : ["No distortion notes from backend yet."];
  return (
    <div className="card">
      <div className="card-label">Distortion profile</div>
      {lines.map((text, i) => (
        <div key={i} className="distortion-item">
          <span className="dist-dot" />
          {text}
        </div>
      ))}
    </div>
  );
}
