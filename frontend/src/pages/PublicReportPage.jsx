import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI } from '../api/client';
import SkeuoCard from '../components/common/SkeuoCard';
import StampBadge from '../components/common/StampBadge';
import StickyNote from '../components/common/StickyNote';
import GraphPaperChart from '../components/common/GraphPaperChart';
import PressButton from '../components/common/PressButton';
import { Download, School, Calendar, Award, FileText, CheckCircle2, LogIn, LogOut } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { getNamaBulan } from '../utils/dateUtils';

export const PublicReportPage = () => {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRef = useRef();

  useEffect(() => {
    fetchReport();
  }, [token]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await publicAPI.getParentReport(token);
      setReport(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Laporan tidak ditemukan atau link sudah tidak berlaku.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (token) {
      window.open(publicAPI.getReportPdfUrl(token), '_blank');
    } else if (reportRef.current) {
      const element = reportRef.current;
      const opt = {
        margin: 10,
        filename: `Laporan_Absensi_${report?.siswa?.nama || 'Siswa'}_${getNamaBulan(report?.periode?.bulan)}_${report?.periode?.tahun}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().set(opt).from(element).save();
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="skeuo-card" style={{ padding: '30px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Memuat Laporan Kehadiran...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <SkeuoCard style={{ padding: '30px', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc2626', marginBottom: '10px' }}>Laporan Tidak Ditemukan</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{error}</p>
        </SkeuoCard>
      </div>
    );
  }

  const chartData = [
    { name: 'Ringkasan', Hadir: report.summary.hadir, Terlambat: report.summary.terlambat, Izin: report.summary.izin + report.summary.sakit, Alpa: report.summary.alpa }
  ];

  return (
    <div style={{ minHeight: '100vh', padding: '16px 12px 40px 12px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Download Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <School size={24} color="#2c3e50" />
          <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Laporan Orang Tua</span>
        </div>
        <PressButton variant="amber" icon={Download} onClick={downloadPDF}>
          Unduh PDF
        </PressButton>
      </div>

      {/* Report Container */}
      <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Student Profile Card */}
        <SkeuoCard style={{ padding: '20px', background: 'linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <img
              src={report.siswa.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
              alt={report.siswa.nama}
              style={{ width: '70px', height: '80px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
            />
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '1px' }}>
                REKAPITULASI KEHADIRAN BULANAN — {getNamaBulan(report.periode.bulan).toUpperCase()} {report.periode.tahun}
              </span>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                {report.siswa.nama}
              </h2>
              <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', gap: '12px' }}>
                <span>NIS: <strong>{report.siswa.nis}</strong></span>
                <span>Kelas: <strong>{report.siswa.kelas}</strong></span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                Wali Kelas: {report.wali_kelas_nama}
              </div>
            </div>
          </div>
        </SkeuoCard>

        {/* Summary Counter Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
          <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#047857' }}>{report.summary.hadir}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>Hadir</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fff7ed', borderColor: '#fed7aa' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#c2410c' }}>{report.summary.terlambat}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>Terlambat</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fefce8', borderColor: '#fef08a' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#a16207' }}>{report.summary.izin + report.summary.sakit}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Izin/Sakit</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fef2f2', borderColor: '#fecaca' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#b91c1c' }}>{report.summary.alpa}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Alpa</div>
          </div>
          <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fff1f2', borderColor: '#fda4af' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#e11d48' }}>{report.summary.lupa_absen_pulang || 0}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>Lupa Pulang</div>
          </div>
        </div>

        {/* Visual Graph Paper Chart */}
        <GraphPaperChart data={chartData} title={`Grafik Kehadiran (${getNamaBulan(report.periode.bulan)} ${report.periode.tahun})`} />

        {/* Teacher Sticky Note Feedback if available */}
        {report.feedbacks && report.feedbacks.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={18} color="#d97706" /> Catatan Perkembangan Wali Kelas
            </h3>
            {report.feedbacks.map((fb) => (
              <StickyNote key={fb.id} text={fb.isi} date={fb.tanggal} author={fb.wali_kelas_nama} style={{ marginBottom: '10px' }} />
            ))}
          </div>
        )}

        {/* Detailed Attendance Log Table */}
        <SkeuoCard style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
            Riwayat Scan Masuk & Pulang Harian
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {report.daily_logs.map((log, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#f8fafc',
                borderRadius: '6px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{log.tanggal}</div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', gap: '12px', marginTop: '2px' }}>
                    <span style={{ color: '#047857' }}>Masuk: <strong>{log.waktu_masuk}</strong></span>
                    <span style={{ color: log.waktu_pulang !== '-' ? '#1d4ed8' : '#64748b' }}>Pulang: <strong>{log.waktu_pulang}</strong></span>
                  </div>
                </div>

                <StampBadge status={log.status} lupaPulang={log.lupa_absen_pulang} />
              </div>
            ))}
          </div>
        </SkeuoCard>
      </div>
    </div>
  );
};

export default PublicReportPage;
