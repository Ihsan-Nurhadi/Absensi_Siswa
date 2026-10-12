import React, { useEffect, useState } from 'react';
import { teacherAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import { FileSpreadsheet, Download, Share2, Send, ExternalLink } from 'lucide-react';

export const ClassReports = () => {
  const [students, setStudents] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [waModal, setWaModal] = useState(null);
  const [exporting, setExporting] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const data = await teacherAPI.getStudents();
    setStudents(data);
  };

  const handleExportExcel = async () => {
    if (!user.kelas_id) return alert("Anda belum ditugaskan di kelas manapun.");
    setExporting(true);
    try {
      const blob = await teacherAPI.downloadClassReportExcel(user.kelas_id, month, year);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rekap_Absensi_${user.kelas_nama || 'Kelas'}_Bulan_${month}_${year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Gagal mengunduh laporan Excel. Pastikan data kelas tersedia.");
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

  const handleGenerateWa = async (student) => {
    try {
      const res = await teacherAPI.generateParentToken(student.id, month, year);
      const publicUrl = `${window.location.origin}${res.report_url}`;
      const waText = `Halo Bapak/Ibu Orang Tua dari *${student.nama}*,\n\nBerikut kami sampaikan Rekap Laporan Kehadiran Bulanan (${month}/${year}):\n\n${publicUrl}\n\nSilakan klik tautan di atas untuk melihat rincian grafik absensi dan catatan wali kelas. Terima kasih.`;
      
      setWaModal({
        student,
        url: publicUrl,
        waMessage: waText,
        phone: student.no_wa_ortu
      });
    } catch (err) {
      alert("Gagal membuat link laporan.");
    }
  };

  const openWhatsApp = () => {
    if (!waModal) return;
    const cleanPhone = formatWhatsAppNumber(waModal.phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      alert("Nomor WhatsApp orang tua tidak valid. Pastikan nomor telah diisi dengan benar.");
      return;
    }
    const encodedText = encodeURIComponent(waModal.waMessage);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Rekap Laporan Bulanan Kelas
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Ekspor Excel atau bagikan tautan laporan publik ke WhatsApp orang tua.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="skeuo-input" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>Bulan {m}</option>
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

      <SkeuoCard style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Nama Siswa</th>
                <th style={{ padding: '12px 14px' }}>NIS</th>
                <th style={{ padding: '12px 14px' }}>No. WA Orang Tua</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Laporan Publik</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>{s.nama}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.nis}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.no_wa_ortu}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleGenerateWa(s)}
                      style={{ padding: '6px 10px', background: '#dbeafe', border: '1px solid #93c5fd', color: '#1e40af', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Send size={13} /> Kirim WA
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SkeuoCard>

      {waModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '480px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px' }}>
              Pesan Laporan Kehadiran Ortu
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
              Siswa: <strong>{waModal.student.nama}</strong> | Format No: <strong>{formatWhatsAppNumber(waModal.phone)}</strong>
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', color: '#1e293b', marginBottom: '12px', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
              {waModal.waMessage}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <a href={waModal.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#2563eb', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Pratinjau Halaman Laporan Publik <ExternalLink size={12} />
              </a>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <PressButton variant="secondary" onClick={() => setWaModal(null)}>Batal</PressButton>
              <PressButton variant="amber" onClick={openWhatsApp}>
                Kirim via WhatsApp
              </PressButton>
            </div>
          </SkeuoCard>
        </div>
      )}
    </div>
  );
};

export default ClassReports;
