import React, { useEffect, useState } from 'react';
import { teacherAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import StampBadge from '../../components/common/StampBadge';
import TornCalendar from '../../components/common/TornCalendar';
import PressButton from '../../components/common/PressButton';
import { Calendar, Filter, Edit3 } from 'lucide-react';

export const AttendanceHistory = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [selectedDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await teacherAPI.getAttendanceList({ tanggal: selectedDate });
      setLogs(data);
    } catch (err) {
      console.error("Error loading logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualMark = async (siswaId, statusVal) => {
    try {
      await teacherAPI.manualMarkAttendance({
        siswa_id: siswaId,
        status: statusVal,
        tanggal: selectedDate
      });
      loadLogs();
    } catch (err) {
      alert("Gagal mengoreksi status.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Riwayat & Rekap Absensi
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Pilih tanggal untuk melihat dan mengoreksi catatan kehadiran harian.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <TornCalendar dateString={selectedDate} />
          <input
            type="date"
            className="skeuo-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      <SkeuoCard style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Nama Siswa</th>
                <th style={{ padding: '12px 14px' }}>NIS</th>
                <th style={{ padding: '12px 14px' }}>Waktu Masuk</th>
                <th style={{ padding: '12px 14px' }}>Waktu Pulang</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Koreksi</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    Belum ada log absensi pada tanggal ini.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>{log.siswa_nama}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{log.siswa_nis}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#047857' }}>
                      {log.waktu_masuk || log.waktu_scan || '-'}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1d4ed8' }}>
                      {log.waktu_pulang || '-'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StampBadge status={log.status} lupaPulang={log.lupa_absen_pulang} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '3px', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleManualMark(log.siswa, 'HADIR')} style={{ padding: '2px 5px', fontSize: '0.72rem', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Hadir</button>
                        <button onClick={() => handleManualMark(log.siswa, 'IZIN')} style={{ padding: '2px 5px', fontSize: '0.72rem', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Izin</button>
                        <button onClick={() => handleManualMark(log.siswa, 'SAKIT')} style={{ padding: '2px 5px', fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Sakit</button>
                        <button onClick={() => handleManualMark(log.siswa, 'ALPA')} style={{ padding: '2px 5px', fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>Alpa</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SkeuoCard>
    </div>
  );
};

export default AttendanceHistory;
