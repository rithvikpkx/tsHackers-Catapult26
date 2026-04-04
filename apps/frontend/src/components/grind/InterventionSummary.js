import React, { useState } from "react";
import { RiskBadge, ActionButton } from "./DesignSystem";

const InterventionSummary = ({ data, onAccept, acceptLabel = "Accept changes", actionBusy = false }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="intervention-summary">
      <div className="summary-header">
        <h3>Intervention Summary</h3>
      </div>

      <div className="summary-section">
        <h4>Task</h4>
        <p className="summary-task">{data.taskName}</p>
      </div>

      <div className="summary-section">
        <h4>Success Probability</h4>
        <div className="probability-display">
          <div className="before-after">
            <div className="stat">
              <span className="label">Before</span>
              <RiskBadge risk={data.originalRisk} size="large" />
            </div>
            <div className="arrow">-&gt;</div>
            <div className="stat">
              <span className="label">After</span>
              <RiskBadge risk={data.newRisk} size="large" />
            </div>
          </div>
        </div>
      </div>

      <div className="summary-section">
        <h4>What Changed</h4>
        <ul className="changes-list">
          {data.changes.map((change, idx) => (
            <li key={idx}>
              <span className="check">+</span>
              {change}
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-actions">
        <ActionButton
          label={acceptLabel}
          variant="primary"
          size="medium"
          onClick={onAccept}
          disabled={!onAccept}
          loading={actionBusy}
        />
        <ActionButton
          label={showDetails ? "Hide details" : "View details"}
          variant="secondary"
          size="medium"
          onClick={() => setShowDetails(!showDetails)}
        />
      </div>

      {showDetails && (
        <div className="summary-section">
          <h4>Why this helps</h4>
          <p className="summary-task">
            The new plan protects dedicated work time before the deadline and gives you a smaller next step to
            start from.
          </p>
        </div>
      )}
    </div>
  );
};

export default InterventionSummary;

