import React from 'react';
import { Server, Wifi, WifiOff } from 'lucide-react';

export const MqttStatusIndicator = ({ isConnected, statusText, host, port, topic }) => {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      color: '#f8fafc',
      padding: '12px 18px',
      borderRadius: '10px',
      boxShadow: '0 4px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
      display: 'flex',
      alignItems: 'center',
      justify: 'space-between',
      border: '1px solid #334155'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#22c55e' : '#ef4444',
          boxShadow: isConnected 
            ? '0 0 10px #22c55e, inset 0 1px 2px #bbf7d0' 
            : '0 0 10px #ef4444, inset 0 1px 2px #fca5a5',
          border: '1px solid rgba(255,255,255,0.3)',
          transition: 'all 0.3s ease'
        }} />
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px', color: '#94a3b8', textTransform: 'uppercase' }}>
            Server Perangkat Absen
          </div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
            {isConnected ? 'Terhubung (Online)' : `Terputus: ${statusText || 'Offline'}`}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#94a3b8' }}>
        {host && <div>{host}:{port || 1883}</div>}
        {topic && <div style={{ color: '#fbbf24', fontWeight: 700 }}>{topic}</div>}
      </div>
    </div>
  );
};

export default MqttStatusIndicator;
