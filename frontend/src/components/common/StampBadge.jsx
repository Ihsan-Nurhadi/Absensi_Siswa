import React from 'react';

export const StampBadge = ({ status, lupaPulang = false }) => {
  if (lupaPulang) {
    return (
      <span className="stamp-badge" style={{ background: '#fef2f2', borderColor: '#ef4444', color: '#b91c1c', transform: 'rotate(-2deg)' }}>
        LUPA ABSEN PULANG
      </span>
    );
  }

  let stampClass = 'stamp-hadir';
  let label = 'HADIR';

  switch (status?.toUpperCase()) {
    case 'HADIR':
      stampClass = 'stamp-hadir';
      label = 'HADIR';
      break;
    case 'TERLAMBAT':
      stampClass = 'stamp-terlambat';
      label = 'TERLAMBAT';
      break;
    case 'IZIN':
      stampClass = 'stamp-izin';
      label = 'IZIN';
      break;
    case 'SAKIT':
      stampClass = 'stamp-sakit';
      label = 'SAKIT';
      break;
    case 'ALPA':
      stampClass = 'stamp-alpa';
      label = 'ALPA';
      break;
    case 'PULANG':
      stampClass = 'stamp-hadir';
      label = 'PULANG';
      break;
    default:
      stampClass = 'stamp-alpa';
      label = 'BELUM ABSEN';
  }

  return (
    <span className={`stamp-badge ${stampClass}`}>
      {label}
    </span>
  );
};

export default StampBadge;
