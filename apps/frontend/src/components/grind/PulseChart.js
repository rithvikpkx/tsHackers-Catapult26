import { useEffect, useRef } from "react";
import {
  Chart, LineElement, PointElement, LineController,
  CategoryScale, LinearScale
} from "chart.js";

Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale);

const POINTS = 80;

function buildSeed() {
  const buf = [];
  let phase = 0;
  for (let i = 0; i < POINTS * 4; i++) {
    const zone  = Math.floor(i / POINTS);
    const amp   = [8, 14, 22, 32][zone % 4];
    const freq  = [0.38, 0.55, 0.82, 1.15][zone % 4];
    phase += freq;
    buf.push(Math.sin(phase) * amp + (Math.random() - 0.5) * amp * 0.3 + 50);
  }
  return buf;
}

export default function PulseChart({ restingRate = 68 }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const bufRef    = useRef(buildSeed());
  const offsetRef = useRef(0);
  const rafRef    = useRef(null);
  const lastRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");

    function makeGradient() {
      const w = canvas.offsetWidth || 600;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0,    "#1D9E75");
      g.addColorStop(0.35, "#BA7517");
      g.addColorStop(0.65, "#E8580A");
      g.addColorStop(1,    "#E24B4A");
      return g;
    }

    function slice() {
      const buf = bufRef.current;
      const pts = [];
      for (let i = 0; i < POINTS; i++) pts.push(buf[(offsetRef.current + i) % buf.length]);
      return pts;
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from({ length: POINTS }, (_, i) => i),
        datasets: [{
          data: slice(),
          borderColor: makeGradient(),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.45,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 5, max: 95 } },
      },
    });

    function extendBuffer() {
      const buf = bufRef.current;
      if (buf.length - offsetRef.current < POINTS * 2) {
        let phase = 0;
        for (let i = 0; i < POINTS * 4; i++) {
          const zone = Math.floor(i / POINTS) % 4;
          const amp  = [8, 14, 22, 32][zone];
          const freq = [0.38, 0.55, 0.82, 1.15][zone];
          phase += freq;
          buf.push(Math.sin(phase) * amp + (Math.random() - 0.5) * amp * 0.3 + 50);
        }
      }
    }

    function tick(ts) {
      if (ts - lastRef.current > 80) {
        lastRef.current = ts;
        offsetRef.current += 1;
        extendBuffer();
        const chart = chartRef.current;
        if (chart) {
          chart.data.datasets[0].data = slice();
          chart.data.datasets[0].borderColor = makeGradient();
          chart.update("none");
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      chartRef.current?.destroy();
    };
  }, []);

  return (
    <div className="card">
      <div className="pulse-header">
        <span className="card-label" style={{ marginBottom: 0 }}>Pulse Board</span>
        <span className="pulse-resting">Resting rate <strong>{restingRate}</strong></span>
      </div>
      <div className="pulse-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
      <div className="pulse-zones">
        <span>Calm</span>
        <span>Busy</span>
        <span>Risk building</span>
        <span className="red">Red zone</span>
      </div>
    </div>
  );
}
