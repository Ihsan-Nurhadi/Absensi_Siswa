import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { adminAPI, teacherAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import GraphPaperChart from '../../components/common/GraphPaperChart';
import StickyNote from '../../components/common/StickyNote';
import StampBadge from '../../components/common/StampBadge';
import { 
  School, Users, Calendar, Clock, CreditCard, ArrowLeft, 
  Download, ExternalLink, MessageSquare, Phone, CheckCircle2, 
  AlertTriangle, LogIn, LogOut, FileText 
} from 'lucide-react';
import { getNamaBulan, getOpsiBulan } from '../../utils/dateUtils';

export const AdminClassDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadClassDetail();
  }, [id, month, year]);

  const loadClassDetail = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getClassDetail(id, month, year);
      setData(res);
    } catch (err) {
      console.error("Error loading class detail:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!id) return;
    setExporting(true);
    try {
      const blob = await teacherAPI.downloadClassReportExcel(id, month, year);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rekap_Absensi_${data?.kelas?.nama || 'Kelas'}_${getNamaBulan(month)}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengekspor laporan Excel.");
    } finally {
      setExporting(false);
    }
  };

  const formatWhatsAppNumber = (phone) => {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return clean;
  };

  if (loading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
          Memuat Detail Kelas & Monitoring Absensi...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '30px', textAlign: 'center' }}>
        <SkeuoCard style={{ padding: '30px', maxWidth: '440px', margin: '0 auto' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '10px' }}>Kelas Tidak Ditemukan</h2>
          <PressButton variant="secondary" icon={ArrowLeft} onClick={() => navigate('/admin/classes')}>
            Kembali ke Daftar Kelas
          </PressButton>
        </SkeuoCard>
      </div>
    );
  }

  const chartData = [
    {
      name: getNamaBulan(data.periode.bulan),
      Hadir: data.monthly.hadir,
      Terlambat: data.monthly.terlambat,
      Izin: data.monthly.izin + data.monthly.sakit,
      Alpa: data.monthly.alpa,
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Breadcrumb & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/admin/classes')}
            style={{
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 700,
              fontSize: '0.82rem',
              color: '#334155'
            }}
          >
            <ArrowLeft size={16} /> Kembali
          </button>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
              Monitoring {data.kelas.nama}
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Tahun Ajaran {data.kelas.tahun_ajaran} • {data.total_siswa} Siswa Terdaftar
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="skeuo-input" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {getOpsiBulan().map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select className="skeuo-input" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
          </select>
          <PressButton variant="amber" icon={Download} onClick={handleExportExcel} disabled={exporting}>
            {exporting ? 'Mengunduh...' : 'Ekspor Excel'}
          </PressButton>
        </div>
      </div>

      {/* Class Identity & Configuration Card */}
      <SkeuoCard style={{ padding: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'center'
        }}>
          {/* Wali Kelas Details */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Wali Kelas Penanggung Jawab
            </div>
            {data.kelas.wali_kelas ? (
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>
                  {data.kelas.wali_kelas.nama}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span>@{data.kelas.wali_kelas.username}</span>
                  {data.kelas.wali_kelas.phone_number && (
                    <a
                      href={`https://wa.me/${formatWhatsAppNumber(data.kelas.wali_kelas.phone_number)}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                    >
                      <Phone size={12} /> {data.kelas.wali_kelas.phone_number}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>Belum Ditugaskan</span>
            )}
          </div>

          {/* Schedule */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Jadwal Absensi Kelas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem' }}>
              <span style={{ color: '#047857', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <LogIn size={14} /> Masuk: {data.kelas.jam_masuk} WIB
              </span>
              <span style={{ color: '#1d4ed8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                <LogOut size={14} /> Pulang: {data.kelas.jam_pulang} WIB
              </span>
            </div>
          </div>

          {/* MQTT Channel */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Saluran Perangkat (MQTT)
            </div>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 10px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#d97706',
              fontWeight: 700,
              display: 'inline-block'
            }}>
              {data.kelas.topic_mqtt}
            </div>
          </div>
        </div>
      </SkeuoCard>

      {/* Today's Live Attendance Gauges */}
      <div>
        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>
          Status Kehadiran Hari Ini ({data.today.tanggal})
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: '8px'
        }}>
          <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857' }}>{data.today.hadir}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>Hadir</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#fff7ed', borderColor: '#fed7aa' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c2410c' }}>{data.today.terlambat}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>Terlambat</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#fefce8', borderColor: '#fef08a' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a16207' }}>{data.today.izin + data.today.sakit}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Izin/Sakit</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#fef2f2', borderColor: '#fecaca' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c' }}>{data.today.alpa}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Alpa</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1d4ed8' }}>{data.today.pulang}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>Scan Pulang</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#f8fafc', borderColor: '#cbd5e1' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#475569' }}>{data.today.belum_absen}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Belum Absen</div>
          </div>
        </div>
      </div>

      {/* Monthly Performance & Graph Paper Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <SkeuoCard style={{ padding: '14px', background: '#ffffff', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Ketepatan Waktu Bulan Ini
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: data.monthly.punctuality_rate >= 80 ? '#059669' : '#d97706' }}>
            {data.monthly.punctuality_rate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Hadir tepat waktu sebelum jam masuk</div>
        </SkeuoCard>

        <SkeuoCard style={{ padding: '14px', background: '#ffffff', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Tingkat Kehadiran Bulan Ini
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: data.monthly.attendance_rate >= 90 ? '#1d4ed8' : '#dc2626' }}>
            {data.monthly.attendance_rate}%
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Total kehadiran siswa bulan ini</div>
        </SkeuoCard>

        <SkeuoCard style={{ padding: '14px', background: '#fef2f2', borderColor: '#fca5a5', textAlign: 'center' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Kasus Lupa Absen Pulang
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#b91c1c' }}>
            {data.monthly.lupa_absen_pulang}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#991b1b' }}>Siswa lupa scan kartu sore</div>
        </SkeuoCard>
      </div>

      <GraphPaperChart data={chartData} title={`Grafik Kehadiran ${data.kelas.nama} (${getNamaBulan(data.periode.bulan)} ${data.periode.tahun})`} />

      {/* Student List & Card Mapping Table */}
      <SkeuoCard style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
            Daftar Siswa & Status Kartu ({data.students.length} Siswa)
          </h3>
        </div>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Siswa</th>
                <th style={{ padding: '12px 14px' }}>NIS</th>
                <th style={{ padding: '12px 14px' }}>Status Kartu</th>
                <th style={{ padding: '12px 14px' }}>No. WA Ortu</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Rekap Bulan Ini (H/T/I/A)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Laporan Publik</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={s.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                      alt={s.nama}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{s.nama}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>{s.nis}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {s.epc_tag ? (
                      <span style={{ fontFamily: 'monospace', color: '#d97706', fontWeight: 700, background: '#fffbeb', padding: '2px 6px', borderRadius: '4px', border: '1px solid #fde68a' }}>
                        {s.epc_tag}
                      </span>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.78rem' }}>Belum Ada Kartu</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.no_wa_ortu}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                    <span style={{ color: '#047857' }}>{s.summary.hadir}H</span> /{' '}
                    <span style={{ color: '#c2410c' }}>{s.summary.terlambat}T</span> /{' '}
                    <span style={{ color: '#a16207' }}>{s.summary.izin_sakit}I</span> /{' '}
                    <span style={{ color: '#b91c1c' }}>{s.summary.alpa}A</span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <a
                      href={`/report/${s.report_token}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '4px 8px',
                        background: '#dbeafe',
                        border: '1px solid #93c5fd',
                        color: '#1e40af',
                        borderRadius: '4px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <ExternalLink size={12} /> Buka Rapot
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SkeuoCard>

      {/* Teacher Feedback Logs if available */}
      {data.feedbacks && data.feedbacks.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={18} color="#d97706" /> Riwayat Catatan Feedback Wali Kelas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
            {data.feedbacks.map((fb) => (
              <StickyNote
                key={fb.id}
                text={fb.isi}
                date={fb.tanggal}
                author={fb.wali_kelas_nama}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClassDetailPage;
