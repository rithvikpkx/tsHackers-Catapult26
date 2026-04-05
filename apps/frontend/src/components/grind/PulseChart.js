import { useEffect, useRef } from "react";
import {
  Chart, LineElement, PointElement, LineController,
  CategoryScale, LinearScale
} from "chart.js";

Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale);

const POINTS = 220;
const BASE_AMPLITUDE = 18;
const BASE_FREQ = 0.07;

function pulseTone(completedToday, totalToday) {
  const total = Math.max(Number(totalToday) || 0, 0);
  const completed = Math.max(Number(completedToday) || 0, 0);
  const ratio = total > 0 ? completed / total : 0;

  if (ratio < 1 / 3) {
    return { base: "#E24B4A", glow: "#F8D2D2", amplitudeScale: 2.8, frequencyScale: 5 };
  }
  if (ratio < 2 / 3) {
    return { base: "#BA7517", glow: "#F5E3C5", amplitudeScale: 1.4, frequencyScale: 3 };
  }
  return { base: "#1D9E75", glow: "#D4EFE7", amplitudeScale: 1.4, frequencyScale: 1 };
}

function waveformPoint(phase, amplitudeScale, frequencyScale) {
  const amplitude = BASE_AMPLITUDE * amplitudeScale;
  return 50 + Math.sin(phase * frequencyScale) * amplitude;
}

function buildSeed(amplitudeScale) {
  const points = [];
  for (let i = 0; i < POINTS; i++) {
    points.push(waveformPoint(i * BASE_FREQ, amplitudeScale, 1));
  }
  return points;
}

export default function PulseChart({ completedToday = 0, totalToday = 2 }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const phaseRef = useRef(0);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const tone = pulseTone(completedToday, totalToday);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const amplitude = BASE_AMPLITUDE * tone.amplitudeScale;
    const yPadding = Math.max(10, amplitude * 0.25);
    const yMin = 50 - amplitude - yPadding;
    const yMax = 50 + amplitude + yPadding;

    function makeGradient() {
      const w = canvas.offsetWidth || 600;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, tone.glow);
      g.addColorStop(0.25, tone.base);
      g.addColorStop(0.75, tone.base);
      g.addColorStop(1, tone.glow);
      return g;
    }

    function slice(startPhase) {
      const pts = [];
      for (let i = 0; i < POINTS; i++) {
        pts.push(
          waveformPoint(
            startPhase + i * BASE_FREQ,
            tone.amplitudeScale,
            tone.frequencyScale
          )
        );
      }
      return pts;
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: Array.from({ length: POINTS }, (_, i) => i),
        datasets: [{
          data: buildSeed(tone.amplitudeScale),
          borderColor: makeGradient(),
          borderWidth: 4,
          pointRadius: 0,
          tension: 0.92,
          fill: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        layout: { padding: { top: 6, bottom: 6 } },
        scales: { x: { display: false }, y: { display: false, min: yMin, max: yMax } },
      },
    });

    function tick(ts) {
      if (ts - lastRef.current > 80) {
        lastRef.current = ts;
        phaseRef.current += 0.13;
        const chart = chartRef.current;
        if (chart) {
          chart.data.datasets[0].data = slice(phaseRef.current);
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
  }, [tone.base, tone.glow, tone.amplitudeScale, tone.frequencyScale]);

  return (
    <div className="card">
      <div className="pulse-header">
        <span className="card-label" style={{ marginBottom: 0 }}>Pulse Board</span>
        <span className="pulse-resting">Tasks completed today <strong>({completedToday}/{totalToday})</strong></span>
      </div>
      <div className="pulse-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
