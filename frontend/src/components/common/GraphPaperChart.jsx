import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const GraphPaperChart = ({ data, title = "Grafik Tren Kehadiran" }) => {
  return (
    <div className="graph-paper-bg" style={{ padding: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'Nunito, sans-serif', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
          {title}
        </h3>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Kertas Grafik Absensi
        </span>
      </div>

      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
            <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} />
            <YAxis stroke="#475569" fontSize={12} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fdfbf7', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
              }} 
            />
            <Bar dataKey="Hadir" fill="#059669" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Terlambat" fill="#ea580c" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Izin" fill="#ca8a04" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Alpa" fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GraphPaperChart;
