import React, { useState } from 'react';
import { RiskBadge, ActionButton } from './DesignSystem';

const InterventionSummary = ({ data }) => {
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
            <div className="arrow">→</div>
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
              <span className="check">✓</span>
              {change}
            </li>
          ))}
        </ul>
      </div>

      <div className="summary-actions">
        <ActionButton 
          label="Accept Changes" 
          variant="primary"
          size="medium"
          onClick={() => console.log('Changes accepted')}
        />
        <ActionButton 
          label="View Details" 
          variant="secondary"
          size="medium"
          onClick={() => setShowDetails(!showDetails)}
        />
      </div>
    </div>
  );
};

export default InterventionSummary;
