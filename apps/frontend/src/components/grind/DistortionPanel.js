export default function DistortionPanel({ insights }) {
  return (
    <div className="card">
      <div className="card-label">Distortion profile</div>
      {insights.map((text, i) => (
        <div key={i} className="distortion-item">
          <span className="dist-dot" />
          {text}
        </div>
      ))}
    </div>
  );
}
