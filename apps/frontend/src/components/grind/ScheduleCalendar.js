import React from 'react';
import ScheduleBlock from './ScheduleBlock';

const ScheduleCalendar = ({ blocks }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 8 PM

  // Group blocks by day
  const blocksByDay = {};
  days.forEach(day => blocksByDay[day] = []);
  blocks.forEach(block => {
    if (blocksByDay[block.day]) {
      blocksByDay[block.day].push(block);
    }
  });

  return (
    <div className="schedule-calendar">
      <div className="calendar-header">
        <div className="time-column"></div>
        {days.map(day => (
          <div key={day} className="day-header">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {hours.map(hour => (
          <div key={hour} className="hour-row">
            <div className="time-slot">
              {hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`}
            </div>
            {days.map(day => (
              <div key={`${day}-${hour}`} className="day-slot">
                {blocksByDay[day]
                  .filter(block => {
                    const blockHour = parseInt(block.time.split(':')[0]);
                    return blockHour === hour;
                  })
                  .map((block, idx) => (
                    <ScheduleBlock key={idx} block={block} />
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
