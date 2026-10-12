import React from 'react';

export const TornCalendar = ({ dateString }) => {
  const dt = dateString ? new Date(dateString) : new Date();
  const dayName = dt.toLocaleDateString('id-ID', { weekday: 'short' });
  const dayNum = dt.getDate();
  const monthName = dt.toLocaleDateString('id-ID', { month: 'short' });

  return (
    <div className="torn-calendar">
      <div className="torn-calendar-header">
        {monthName}
      </div>
      <div className="torn-calendar-body">
        {dayNum}
      </div>
      <div className="torn-calendar-footer">
        {dayName}
      </div>
    </div>
  );
};

export default TornCalendar;
