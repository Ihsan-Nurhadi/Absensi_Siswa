import React, { useEffect, useState } from 'react';
import { teacherAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import GraphPaperChart from '../../components/common/GraphPaperChart';
import StampBadge from '../../components/common/StampBadge';
import { Award, AlertTriangle, TrendingUp, Users, Calendar, CheckCircle2, LogOut } from 'lucide-react';
import { getNamaBulan, getOpsiBulan } from '../../utils/dateUtils';

export const TeacherPerformancePage = () => {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
  }, [month, year]);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const res = await teacherAPI.getPerformance(month, year);
      setData(res);
    } catch (err) {
      console.error("Error loading performance data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Memuat Analisis Performa Kelas...</div>
      </div>
    );
  }

  if (!data) return null;

  const chartData = [
    {
      name: getNamaBulan(data.periode.bulan),
      Hadir: data.metrics.hadir,
      Terlambat: data.metrics.terlambat,
      Izin: data.metrics.izin + data.metrics.sakit,
      Alpa: data.metrics.alpa,
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Analisis Performa Kelas — {data.kelas_nama}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Pemantauan tingkat kedisiplinan siswa dan deteksi siswa yang memerlukan perhatian.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="skeuo-input" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {getOpsiBulan().map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className="skeuo-input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
        </div>
      </div>

      {/* Main Gauges & High-level Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        {/* Punctuality Gauge */}
        <SkeuoCard style={{ padding: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tingkat Ketepatan Waktu
          </div>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            color: data.metrics.punctuality_rate >= 80 ? '#059669' : '#d97706',
            letterSpacing: '-1px'
          }}>
            {data.metrics.punctuality_rate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
            Hadir tepat waktu
          </div>
        </SkeuoCard>

        {/* Overall Attendance Rate */}
        <SkeuoCard style={{ padding: '16px', background: 'linear-gradient(135deg, #ffffff 0%, #fdfbf7 100%)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Tingkat Kehadiran
          </div>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            color: data.metrics.attendance_rate >= 90 ? '#1d4ed8' : '#dc2626',
            letterSpacing: '-1px'
          }}>
            {data.metrics.attendance_rate}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
            Kehadiran kelas
          </div>
        </SkeuoCard>

        {/* Missing Checkout Counter */}
        <SkeuoCard style={{ padding: '16px', background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)', borderColor: '#fca5a5', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '6px' }}>
            Lupa Absen Pulang
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#b91c1c', letterSpacing: '-1px' }}>
            {data.metrics.lupa_absen_pulang}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#991b1b', marginTop: '2px' }}>
            Kasus tidak scan sore
          </div>
        </SkeuoCard>
      </div>

      {/* Graph Paper Chart */}
      <GraphPaperChart data={chartData} title={`Visualisasi Performa Kehadiran (${getNamaBulan(data.periode.bulan)} ${data.periode.tahun})`} />

      {/* Leaderboard & Attention Grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {/* Top Disciplined Students */}
        <SkeuoCard style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <Award size={20} color="#d97706" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Siswa Terdisiplin (Top 5)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.top_disciplined.map((s, idx) => (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: idx === 0 ? '#f59e0b' : (idx === 1 ? '#94a3b8' : '#d97706'),
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{s.nama}</div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>NIS: {s.nis}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#059669' }}>
                    {s.punctuality_score}%
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {s.hadir}x Tepat Waktu
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SkeuoCard>

        {/* Students Needing Attention */}
        <SkeuoCard style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
            <AlertTriangle size={20} color="#dc2626" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Siswa Perlu Perhatian
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.needing_attention.map((s) => (
              <div key={s.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: '#fef2f2',
                borderRadius: '8px',
                border: '1px solid #fecaca'
              }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#991b1b' }}>{s.nama}</div>
                  <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>NIS: {s.nis}</div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#991b1b', fontWeight: 700 }}>
                  {s.terlambat > 0 && <div>{s.terlambat}x Terlambat</div>}
                  {s.lupa_pulang > 0 && <div>{s.lupa_pulang}x Lupa Pulang</div>}
                  {s.alpa > 0 && <div>{s.alpa}x Alpa</div>}
                </div>
              </div>
            ))}
          </div>
        </SkeuoCard>
      </div>
    </div>
  );
};

export default TeacherPerformancePage;
