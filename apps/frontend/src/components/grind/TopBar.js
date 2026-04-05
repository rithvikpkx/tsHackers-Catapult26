export default function TopBar({ onMenuClick }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" aria-label="Menu" onClick={onMenuClick}>☰</button>
        <a href="/" className="logo">
          <span className="logo-dot" />
          <span className="logo-text">
            <span className="logo-text-main">GRIND</span>
            <span className="logo-text-sub">Pulse</span>
          </span>
        </a>
      </div>
    </header>
  );
}
