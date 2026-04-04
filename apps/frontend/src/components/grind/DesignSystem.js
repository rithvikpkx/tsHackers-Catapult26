import React from 'react';
import './DesignSystem.css';

// Risk Badge Component
export const RiskBadge = ({ risk, size = 'medium' }) => {
  const getRiskColor = (riskValue) => {
    if (riskValue >= 70) return 'critical';
    if (riskValue >= 40) return 'warning';
    return 'safe';
  };

  const riskColor = getRiskColor(risk);

  return (
    <span className={`risk-badge risk-badge-${size} risk-${riskColor}`}>
      {risk}%
    </span>
  );
};

// Time Estimate Component
export const TimeEstimate = ({ original, corrected, showDiff = true }) => {
  const diff = corrected - original;
  const diffPercent = Math.round((diff / original) * 100);

  return (
    <div className="time-estimate">
      <div className="estimate-group">
        <span className="estimate-label">Original</span>
        <span className="estimate-value original">{original}h</span>
      </div>
      {showDiff && (
        <div className="estimate-arrow">
          {diff > 0 ? '↑' : diff < 0 ? '↓' : '='}
        </div>
      )}
      <div className="estimate-group">
        <span className="estimate-label">Corrected</span>
        <span className="estimate-value corrected">
          {corrected}h
          {showDiff && <span className="diff-percent">{diffPercent > 0 ? '+' : ''}{diffPercent}%</span>}
        </span>
      </div>
    </div>
  );
};

// Action Button Component
export const ActionButton = ({ 
  label, 
  onClick, 
  variant = 'primary', 
  size = 'medium',
  icon,
  loading = false,
  disabled = false 
}) => {
  return (
    <button
      className={`action-btn action-btn-${variant} action-btn-${size}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <span className="btn-spinner"></span>}
      {icon && <span className="btn-icon">{icon}</span>}
      {label}
    </button>
  );
};

// Loading State Component
export const LoadingState = ({ message = 'Loading...' }) => {
  return (
    <div className="loading-state">
      <div className="spinner-large"></div>
      <p>{message}</p>
    </div>
  );
};

// Empty State Component
export const EmptyState = ({ icon = '📭', title, description, action, actionLabel }) => {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && actionLabel && (
        <button className="action-btn action-btn-primary" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// Status Indicator Component
export const StatusIndicator = ({ status, label }) => {
  const statusColors = {
    calm: '#22c55e',
    busy: '#eab308',
    risk: '#f97316',
    critical: '#dc2626'
  };

  return (
    <div className="status-indicator">
      <div 
        className="status-dot pulse"
        style={{ backgroundColor: statusColors[status] }}
      ></div>
      <span className="status-label">{label}</span>
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ value, maxValue = 100, color = 'primary' }) => {
  const percentage = (value / maxValue) * 100;

  return (
    <div className="progress-bar">
      <div className={`progress-fill progress-${color}`} style={{ width: `${percentage}%` }}></div>
    </div>
  );
};

// Card Component
export const Card = ({ children, hoverable = false, onClick }) => {
  return (
    <div 
      className={`card ${hoverable ? 'hoverable' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Alert Component
export const Alert = ({ type = 'info', title, message, dismissible = true, onDismiss }) => {
  return (
    <div className={`alert alert-${type}`}>
      <div className="alert-content">
        {title && <h4>{title}</h4>}
        {message && <p>{message}</p>}
      </div>
      {dismissible && (
        <button className="alert-close" onClick={onDismiss}>✕</button>
      )}
    </div>
  );
};
