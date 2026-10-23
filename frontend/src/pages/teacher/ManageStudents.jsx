import React, { useEffect, useState, useRef } from 'react';
import { teacherAPI, adminAPI, publicAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import StampBadge from '../../components/common/StampBadge';
import GraphPaperChart from '../../components/common/GraphPaperChart';
import StickyNote from '../../components/common/StickyNote';
import { 
  UserPlus, CreditCard, Phone, Edit, CheckCircle2, 
  Eye, Trash2, X, Download, ExternalLink, Calendar, FileText 
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { getNamaBulan, getOpsiBulan } from '../../utils/dateUtils';

export const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: '', nis: '', epc_tag: '', no_wa_ortu: '', foto_url: '' });

  // View Performance Modal State
  const [viewStudent, setViewStudent] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportToken, setReportToken] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const reportRef = useRef();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const data = await teacherAPI.getStudents();
      setStudents(data);
    } catch (err) {
      console.error("Gagal memuat siswa:", err);
    }
  };

  const handleOpenNew = () => {
    setEditId(null);
    setForm({ 
      nama: '', 
      nis: `100${Date.now().toString().slice(-3)}`, 
      epc_tag: `CARD-100${Date.now().toString().slice(-3)}`, 
      no_wa_ortu: '081234567890', 
      foto_url: '' 
    });
    setShowModal(true);
  };

  const handleEdit = (s) => {
    setEditId(s.id);
    setForm({
      nama: s.nama,
      nis: s.nis,
      epc_tag: s.epc_tag || '',
      no_wa_ortu: s.no_wa_ortu,
      foto_url: s.foto_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Yakin ingin menghapus siswa "${s.nama}" (NIS: ${s.nis})?\nData siswa dan seluruh riwayat absensinya akan dihapus permanen dari sistem.`)) {
      return;
    }
    try {
      await teacherAPI.deleteStudent(s.id);
      alert(`Siswa "${s.nama}" berhasil dihapus.`);
      await loadStudents();
    } catch (err) {
      alert(err.response?.data?.detail || "Gagal menghapus siswa.");
    }
  };

  const handleViewPerformance = (student) => {
    setViewStudent(student);
    const m = new Date().getMonth() + 1;
    const y = new Date().getFullYear();
    setSelectedMonth(m);
    setSelectedYear(y);
    loadPerformanceData(student.id, m, y);
  };

  const loadPerformanceData = async (studentId, m, y) => {
    setReportLoading(true);
    setReportData(null);
    try {
      const res = await teacherAPI.generateParentToken(studentId, m, y);
      setReportToken(res.token);
      const data = await publicAPI.getParentReport(res.token);
      setReportData(data);
    } catch (err) {
      alert("Gagal memuat laporan performa siswa.");
    } finally {
      setReportLoading(false);
    }
  };

  const handlePeriodChange = (m, y) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    if (viewStudent) {
      loadPerformanceData(viewStudent.id, m, y);
    }
  };

  const handleDirectDownloadPdf = async (student) => {
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const blob = await teacherAPI.downloadStudentPDF(student.id, currentMonth, currentYear);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rapor_Absensi_${student.nama.replace(/\s+/g, '_')}_${getNamaBulan(currentMonth)}_${currentYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengunduh rapor PDF siswa.");
    }
  };

  const downloadPDF = async () => {
    if (!viewStudent) return;
    try {
      const blob = await teacherAPI.downloadStudentPDF(viewStudent.id, selectedMonth, selectedYear);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rapor_Absensi_${viewStudent.nama.replace(/\s+/g, '_')}_${getNamaBulan(selectedMonth)}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (reportRef.current && reportData) {
        const element = reportRef.current;
        const opt = {
          margin: 10,
          filename: `Laporan_Performa_${reportData?.siswa?.nama || 'Siswa'}_${getNamaBulan(selectedMonth)}_${selectedYear}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        kelas: user.kelas_id
      };
      if (editId) {
        await teacherAPI.updateStudent(editId, payload);
      } else {
        await teacherAPI.createStudent(payload);
      }
      setShowModal(false);
      loadStudents();
    } catch (err) {
      alert(err.response?.data?.nis?.[0] || err.response?.data?.epc_tag?.[0] || 'Gagal menyimpan data siswa.');
    }
  };

  const chartData = reportData ? [
    { 
      name: 'Ringkasan', 
      Hadir: reportData.summary.hadir, 
      Terlambat: reportData.summary.terlambat, 
      Izin: reportData.summary.izin + reportData.summary.sakit, 
      Alpa: reportData.summary.alpa 
    }
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Manajemen Siswa & Kartu
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Daftarkan siswa baru, petakan Kode Kartu RFID, serta pantau performa kehadiran tiap siswa.
          </p>
        </div>
        <PressButton icon={UserPlus} onClick={handleOpenNew}>
          Tambah Siswa
        </PressButton>
      </div>

      {/* Students Table */}
      <SkeuoCard style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Siswa</th>
                <th style={{ padding: '12px 14px' }}>NIS</th>
                <th style={{ padding: '12px 14px' }}>Kode Kartu</th>
                <th style={{ padding: '12px 14px' }}>No. WA Ortu</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={s.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                      alt={s.nama}
                      style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, color: '#1e293b' }}>{s.nama}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{s.kelas_nama || 'Kelas Anda'}</div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>{s.nis}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#d97706', fontWeight: 700 }}>
                    {s.epc_tag ? s.epc_tag : <span style={{ color: '#ef4444' }}>Belum Dipetakan</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.no_wa_ortu}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Tombol Lihat Performa */}
                      <button
                        onClick={() => handleViewPerformance(s)}
                        title="Lihat Performa & Laporan Kehadiran Siswa"
                        style={{
                          padding: '5px 9px',
                          background: '#ecfdf5',
                          border: '1px solid #86efac',
                          color: '#047857',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={13} /> Lihat
                      </button>

                      {/* Tombol Unduh PDF Cepat */}
                      <button
                        onClick={() => handleDirectDownloadPdf(s)}
                        title="Unduh Rapor PDF Siswa Bulan Ini Langsung"
                        style={{
                          padding: '5px 9px',
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#e11d48',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Download size={13} /> PDF
                      </button>

                      {/* Tombol Edit */}
                      <button
                        onClick={() => handleEdit(s)}
                        title="Edit Data Siswa & Kode Kartu"
                        style={{
                          padding: '5px 9px',
                          background: '#dbeafe',
                          border: '1px solid #93c5fd',
                          color: '#1d4ed8',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit size={13} /> Edit
                      </button>

                      {/* Tombol Hapus */}
                      <button
                        onClick={() => handleDelete(s)}
                        title="Hapus Siswa dari Sistem"
                        style={{
                          padding: '5px 9px',
                          background: '#fef2f2',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SkeuoCard>

      {/* Modal Edit / Tambah Siswa */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '460px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px' }}>
              {editId ? 'Edit Siswa & Kartu' : 'Tambah Siswa Baru'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Nama Lengkap Siswa</label>
                <input type="text" className="skeuo-input" placeholder="Masukkan nama siswa" value={form.nama} onChange={(e) => setForm({...form, nama: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Nomor Induk Siswa (NIS)</label>
                <input type="text" className="skeuo-input" placeholder="Nomor NIS" value={form.nis} onChange={(e) => setForm({...form, nis: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Kode Kartu Siswa (RFID Tag)</label>
                <input type="text" className="skeuo-input" placeholder="Kode tempel kartu (misal: 38253023)" value={form.epc_tag} onChange={(e) => setForm({...form, epc_tag: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Nomor WhatsApp Orang Tua</label>
                <input type="text" className="skeuo-input" placeholder="Contoh: 081234567890" value={form.no_wa_ortu} onChange={(e) => setForm({...form, no_wa_ortu: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <PressButton variant="secondary" onClick={() => setShowModal(false)}>Batal</PressButton>
                <PressButton type="submit">Simpan</PressButton>
              </div>
            </form>
          </SkeuoCard>
        </div>
      )}

      {/* Modal Lihat Performa Siswa (Laporan Absensi) */}
      {viewStudent && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(15,23,42,0.65)', 
          backdropFilter: 'blur(4px)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000, 
          padding: '16px' 
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '680px', 
            maxHeight: '92vh', 
            background: '#f8fafc', 
            borderRadius: '16px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)', 
            border: '1px solid #cbd5e1', 
            display: 'flex', 
            flexDirection: 'column', 
            overflow: 'hidden' 
          }}>
            {/* Modal Header */}
            <div style={{ 
              padding: '14px 18px', 
              background: '#ffffff', 
              borderBottom: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Performa Kehadiran Siswa
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                  Laporan rekapitulasi kehadiran bulanan & grafik aktivitas scan.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Period Selectors */}
                <select 
                  className="skeuo-input" 
                  style={{ padding: '4px 8px', fontSize: '0.78rem', height: '32px' }}
                  value={selectedMonth}
                  onChange={(e) => handlePeriodChange(parseInt(e.target.value), selectedYear)}
                >
                  {getOpsiBulan().map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                <select 
                  className="skeuo-input" 
                  style={{ padding: '4px 8px', fontSize: '0.78rem', height: '32px' }}
                  value={selectedYear}
                  onChange={(e) => handlePeriodChange(selectedMonth, parseInt(e.target.value))}
                >
                  {[2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>

                <button
                  onClick={() => setViewStudent(null)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#475569'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {reportLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800 }}>Memuat Rekapitulasi Performa Siswa...</div>
                </div>
              ) : reportData ? (
                <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Student Profile Card (Matching Image 2) */}
                  <SkeuoCard style={{ padding: '16px', background: 'linear-gradient(180deg, #ffffff 0%, #fdfbf7 100%)' }}>
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <img
                        src={reportData.siswa.foto_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
                        alt={reportData.siswa.nama}
                        style={{ 
                          width: '64px', 
                          height: '72px', 
                          borderRadius: '8px', 
                          objectFit: 'cover', 
                          border: '2px solid #cbd5e1', 
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
                        }}
                      />
                      <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                          REKAPITULASI KEHADIRAN BULANAN
                        </span>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '2px 0' }}>
                          {reportData.siswa.nama}
                        </h2>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', gap: '10px' }}>
                          <span>NIS: <strong>{reportData.siswa.nis}</strong></span>
                          <span>Kelas: <strong>{reportData.siswa.kelas}</strong></span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '3px' }}>
                          Wali Kelas: <strong>{reportData.wali_kelas_nama}</strong>
                        </div>
                      </div>
                    </div>
                  </SkeuoCard>

                  {/* Summary Counter Grid (Matching Image 2) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#047857' }}>{reportData.summary.hadir}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>Hadir</div>
                    </div>
                    <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fff7ed', borderColor: '#fed7aa' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#c2410c' }}>{reportData.summary.terlambat}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>Terlambat</div>
                    </div>
                    <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fefce8', borderColor: '#fef08a' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#a16207' }}>{reportData.summary.izin + reportData.summary.sakit}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Izin/Sakit</div>
                    </div>
                    <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fef2f2', borderColor: '#fecaca' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#b91c1c' }}>{reportData.summary.alpa}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Alpa</div>
                    </div>
                    <div className="skeuo-card" style={{ padding: '10px 4px', textAlign: 'center', background: '#fff1f2', borderColor: '#fda4af' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#e11d48' }}>{reportData.summary.lupa_absen_pulang || 0}</div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#be123c', textTransform: 'uppercase' }}>Lupa Pulang</div>
                    </div>
                  </div>

                  {/* Visual Graph Paper Chart */}
                  <GraphPaperChart data={chartData} title={`Grafik Kehadiran (${getNamaBulan(reportData.periode.bulan)} ${reportData.periode.tahun})`} />

                  {/* Teacher Feedback Notes */}
                  {reportData.feedbacks && reportData.feedbacks.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} color="#d97706" /> Catatan Perkembangan Wali Kelas
                      </h4>
                      {reportData.feedbacks.map((fb) => (
                        <StickyNote key={fb.id} text={fb.isi} date={fb.tanggal} author={fb.wali_kelas_nama} style={{ marginBottom: '8px' }} />
                      ))}
                    </div>
                  )}

                  {/* Detailed Attendance Log Table */}
                  <SkeuoCard style={{ padding: '14px' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
                      Riwayat Scan Masuk & Pulang Harian ({reportData.daily_logs.length} Hari)
                    </h4>
                    {reportData.daily_logs.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                        Belum ada riwayat aktivitas scan pada periode ini.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {reportData.daily_logs.map((log, idx) => (
                          <div key={idx} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: '#ffffff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#1e293b' }}>{log.tanggal}</div>
                              <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', gap: '12px', marginTop: '2px' }}>
                                <span style={{ color: log.waktu_masuk !== '-' ? '#047857' : '#94a3b8' }}>
                                  Masuk: <strong>{log.waktu_masuk}</strong>
                                </span>
                                <span style={{ color: log.waktu_pulang !== '-' ? '#1d4ed8' : '#94a3b8' }}>
                                  Pulang: <strong>{log.waktu_pulang}</strong>
                                </span>
                              </div>
                              {log.catatan && (
                                <div style={{ fontSize: '0.72rem', color: '#c2410c', fontStyle: 'italic', marginTop: '2px' }}>
                                  {log.catatan}
                                </div>
                              )}
                            </div>

                            <StampBadge status={log.status} lupaPulang={log.lupa_absen_pulang} />
                          </div>
                        ))}
                      </div>
                    )}
                  </SkeuoCard>
                </div>
              ) : null}
            </div>

            {/* Modal Bottom Action Bar */}
            <div style={{ 
              padding: '12px 18px', 
              background: '#ffffff', 
              borderTop: '1px solid #e2e8f0', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <PressButton variant="amber" icon={Download} onClick={downloadPDF} disabled={!reportData}>
                  Unduh PDF
                </PressButton>
                {reportToken && (
                  <a
                    href={`/report/${reportToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 12px',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#334155',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    <ExternalLink size={14} /> Buka Laporan Penuh
                  </a>
                )}
              </div>

              <PressButton variant="secondary" onClick={() => setViewStudent(null)}>
                Tutup
              </PressButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageStudents;
