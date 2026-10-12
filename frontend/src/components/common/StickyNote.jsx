import React from 'react';
import { Pin } from 'lucide-react';

export const StickyNote = ({ text, date, author, className = '' }) => {
  return (
    <div className={`sticky-note ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px dashed rgba(113,63,18,0.2)', paddingBottom: '4px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{author || 'Catatan Wali Kelas'}</span>
        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>{date}</span>
      </div>
      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>"{text}"</p>
    </div>
  );
};

export default StickyNote;
