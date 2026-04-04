import React from 'react';
import ScheduleBlock from './ScheduleBlock';

const ScheduleCalendar = ({ blocks }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  const parseHour = (block) => {
    if (Number.isFinite(block.slotHour)) return block.slotHour;
    const match = String(block.time || "").match(/(\d+):/);
    if (!match) return -1;
    const hour = parseInt(match[1], 10);
    const isPm = String(block.time).includes("PM") && hour !== 12;
    const isMidnight = String(block.time).includes("AM") && hour === 12;
    if (isMidnight) return 0;
    return isPm ? hour + 12 : hour;
  };

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
                    const blockHour = parseHour(block);
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
