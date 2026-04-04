import React, { useState } from 'react';
import ScheduleCalendar from './ScheduleCalendar';
import InterventionSummary from './InterventionSummary';
import { LoadingState } from './DesignSystem';
import './UpdatedSchedule.css';

const UpdatedSchedulePage = () => {
  const [loading] = useState(false);
  const [interventionData] = useState({
    taskName: 'OS Problem Set',
    originalRisk: 78,
    newRisk: 91,
    originalBlocks: [
      { day: 'Wed', time: '2:00 PM', duration: '1.5h', task: 'Lecture', color: 'bg-blue-100' },
      { day: 'Thu', time: '9:00 PM', duration: '2h', task: 'Problem Set', color: 'bg-orange-100' },
    ],
    newBlocks: [
      { day: 'Mon', time: '3:00 PM', duration: '2h', task: 'OS Study', color: 'bg-green-100', label: 'NEW' },
      { day: 'Tue', time: '7:00 PM', duration: '1.5h', task: 'Problem Set', color: 'bg-green-100', label: 'MOVED' },
      { day: 'Wed', time: '2:00 PM', duration: '1.5h', task: 'Lecture', color: 'bg-blue-100' },
    ],
    changes: [
      'Moved gym session from Tuesday to Friday',
      'Reserved 4-hour focus block for OS problem set',
      'Recovered 3h from Thursday evening',
    ]
  });

  if (loading) {
    return <LoadingState message="Loading your updated schedule..." />;
  }

  return (
    <div className="updated-schedule-page">
      <div className="page-header">
        <h1>Updated Schedule</h1>
        <p className="subtitle">Review your new schedule and the changes Grind made</p>
      </div>

      <div className="schedule-container">
        <div className="schedule-main">
          <ScheduleCalendar blocks={interventionData.newBlocks} />
        </div>
        
        <aside className="schedule-sidebar">
          <InterventionSummary data={interventionData} />
        </aside>
      </div>
    </div>
  );
};

export default UpdatedSchedulePage;
