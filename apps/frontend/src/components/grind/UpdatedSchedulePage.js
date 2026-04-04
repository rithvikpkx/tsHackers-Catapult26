import React, { useState } from 'react';
import ScheduleCalendar from './ScheduleCalendar';
import InterventionSummary from './InterventionSummary';
import { LoadingState } from './DesignSystem';
import './UpdatedSchedule.css';

const UpdatedSchedulePage = ({ interventionData, loading }) => {
  const [showFallback] = useState(!interventionData);
  const fallbackData = {
    taskName: 'No plan available',
    originalRisk: 0,
    newRisk: 0,
    originalBlocks: [],
    newBlocks: [],
    changes: ['Start backend and ingest tasks to populate this screen.'],
  };
  const data = interventionData || fallbackData;

  if (loading) {
    return <LoadingState message="Loading your updated schedule..." />;
  }

  return (
    <div className="updated-schedule-page">
      <div className="page-header">
        <h1>Updated Schedule</h1>
        <p className="subtitle">
          {showFallback
            ? 'Pipeline waiting for intervention data'
            : 'Review your new schedule and the changes Grind made'}
        </p>
      </div>

      <div className="schedule-container">
        <div className="schedule-main">
          <ScheduleCalendar blocks={data.newBlocks} />
        </div>
        
        <aside className="schedule-sidebar">
          <InterventionSummary data={data} />
        </aside>
      </div>
    </div>
  );
};

export default UpdatedSchedulePage;
