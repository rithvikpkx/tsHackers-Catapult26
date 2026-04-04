export default function TopBar({ onMenuClick }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" aria-label="Menu" onClick={onMenuClick}>☰</button>
        <a href="/" className="logo">
          <span className="logo-dot" />
          <span className="logo-text">GRIND</span>
        </a>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="Focus mode">◎</button>
        <button className="icon-btn" aria-label="Settings">⊙</button>
      </div>
    </header>
  );
}