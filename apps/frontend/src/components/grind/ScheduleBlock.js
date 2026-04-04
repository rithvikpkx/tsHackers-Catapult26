import React from 'react';

const ScheduleBlock = ({ block }) => {
  const getColorClass = (color) => {
    const colorMap = {
      'bg-green-100': '#d4f4dd',
      'bg-blue-100': '#d6e8ff',
      'bg-orange-100': '#ffe4d6',
      'bg-red-100': '#ffd6d6',
    };
    return colorMap[color] || '#f0f0f0';
  };

  const getBorderColor = (color) => {
    const borderMap = {
      'bg-green-100': '#22c55e',
      'bg-blue-100': '#3b82f6',
      'bg-orange-100': '#f97316',
      'bg-red-100': '#ef4444',
    };
    return borderMap[color] || '#999';
  };

  return (
    <div
      className="schedule-block"
      style={{
        backgroundColor: getColorClass(block.color),
        borderLeft: `4px solid ${getBorderColor(block.color)}`,
        height: `${block.duration === '1.5h' ? '60px' : '80px'}`,
      }}
    >
      <div className="block-content">
        <div className="block-task">{block.task}</div>
        {block.label && <span className="block-label">{block.label}</span>}
        <div className="block-duration">{block.duration}</div>
      </div>
    </div>
  );
};

export default ScheduleBlock;
