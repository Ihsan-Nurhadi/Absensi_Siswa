import React, { useEffect, useState } from 'react';
import { teacherAPI } from '../../api/client';
import StudentCard from '../../components/common/StudentCard';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import SimulatorModal from '../../components/common/SimulatorModal';
import StickyNote from '../../components/common/StickyNote';
import { Calendar, Users, Zap, FileSpreadsheet, Plus, MessageSquare, Clock, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TeacherDashboard = () => {
  const [students, setStudents] = useState([]);
  const [todaySummary, setTodaySummary] = useState(null);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [showSimulator, setShowSimulator] = useState(false);
  
  // Class Schedule State & Modal
  const [classInfo, setClassInfo] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ jam_masuk: '07:15', jam_pulang: '15:00' });

  // Feedback modal
  const [feedbackStudent, setFeedbackStudent] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');

  // Share WA modal
  const [waReportData, setWaReportData] = useState(null);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const promises = [
        teacherAPI.getStudents(),
        teacherAPI.getAttendanceToday(),
        teacherAPI.getAttendanceList({ tanggal: new Date().toISOString().split('T')[0] })
      ];
      if (user.kelas_id) {
        promises.push(teacherAPI.getClassInfo(user.kelas_id));
      }

      const [studData, sumData, attData, clsData] = await Promise.all(promises);
      setStudents(studData);
      setTodaySummary(sumData);

      if (clsData) {
        setClassInfo(clsData);
        setScheduleForm({
          jam_masuk: clsData.jam_masuk || '07:15',
          jam_pulang: clsData.jam_pulang || '15:00'
        });
      }

      const map = {};
      attData.forEach((a) => {
        map[a.siswa] = a;
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error("Error loading teacher dashboard:", err);
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!user.kelas_id) return;
    try {
      await teacherAPI.updateClassSchedule(user.kelas_id, scheduleForm);
      alert(`Jadwal jam masuk (${scheduleForm.jam_masuk}) dan jam keluar (${scheduleForm.jam_pulang}) berhasil disimpan!`);
      setShowScheduleModal(false);
      loadDashboardData();
    } catch (err) {
      alert("Gagal memperbarui jam masuk/keluar kelas.");
    }
  };

  const handleMarkStatus = async (siswaId, statusVal) => {
    try {
      await teacherAPI.manualMarkAttendance({
        siswa_id: siswaId,
        status: statusVal,
        tanggal: new Date().toISOString().split('T')[0]
      });
      await loadDashboardData();
    } catch (err) {
      alert("Gagal memperbarui status absensi.");
    }
  };

  const handleOpenFeedback = (student) => {
    setFeedbackStudent(student);
    setFeedbackText('');
  };

  const handleSaveFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim() || !feedbackStudent) return;
    try {
      await teacherAPI.createFeedback({
        siswa: feedbackStudent.id,
        isi: feedbackText
      });
      alert(`Catatan feedback untuk ${feedbackStudent.nama} berhasil disimpan!`);
      setFeedbackStudent(null);
      setFeedbackText('');
    } catch (err) {
      alert("Gagal menyimpan feedback.");
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

  const handleGenerateWaReport = async (student) => {
    try {
      const res = await teacherAPI.generateParentToken(student.id);
      const publicUrl = `${window.location.origin}${res.report_url}`;
      const waText = `Halo Bapak/Ibu Orang Tua dari *${student.nama}*,\n\nBerikut kami sampaikan Rekap Laporan Kehadiran Hari Ini / Bulanan:\n\n${publicUrl}\n\nSilakan klik tautan di atas untuk melihat rincian grafik absensi dan catatan wali kelas. Terima kasih.`;

      setWaReportData({
        student,
        url: publicUrl,
        waMessage: waText,
        phone: student.no_wa_ortu
      });
    } catch (err) {
      alert("Gagal membuat link laporan.");
    }
  };

  const openWhatsAppLink = () => {
    if (!waReportData) return;
    const cleanPhone = formatWhatsAppNumber(waReportData.phone);
    if (!cleanPhone || cleanPhone.length < 9) {
      alert("Nomor WhatsApp orang tua tidak valid. Pastikan nomor telah diisi dengan benar.");
      return;
    }
    const encodedText = encodeURIComponent(waReportData.waMessage);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Dashboard Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Absensi Hari Ini — {user.kelas_nama || 'Kelas Anda'}
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span>Jadwal: Masuk <strong>{classInfo?.jam_masuk || '07:15'} WIB</strong> • Keluar <strong>{classInfo?.jam_pulang || '15:00'} WIB</strong></span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowScheduleModal(true)}
            style={{
              padding: '8px 12px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#334155',
              fontWeight: 800,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={15} color="#d97706" /> Atur Jam Masuk & Keluar
          </button>
          <PressButton variant="amber" icon={Zap} onClick={() => setShowSimulator(true)}>
            Simulasi Tempel Kartu
          </PressButton>
        </div>
      </div>

      {/* Quick Summary Cards (Responsive Grid) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '8px'
      }}>
        <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#047857' }}>{todaySummary?.hadir || 0}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>Hadir</div>
        </div>
        <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#fff7ed', borderColor: '#fed7aa' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#c2410c' }}>{todaySummary?.terlambat || 0}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase' }}>Terlambat</div>
        </div>
        <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#fefce8', borderColor: '#fef08a' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#a16207' }}>{(todaySummary?.izin || 0) + (todaySummary?.sakit || 0)}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#854d0e', textTransform: 'uppercase' }}>Izin/Sakit</div>
        </div>
        <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#fef2f2', borderColor: '#fecaca' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#b91c1c' }}>{todaySummary?.alpa || 0}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase' }}>Alpa</div>
        </div>
        <div className="skeuo-card" style={{ padding: '10px 8px', textAlign: 'center', background: '#f8fafc', borderColor: '#cbd5e1' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#475569' }}>{todaySummary?.belum_absen || 0}</div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Belum Absen</div>
        </div>
      </div>

      {/* Main Student Cards Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
            Daftar Kartu Siswa ({students.length} Siswa)
          </h2>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          {students.map((s) => (
            <StudentCard
              key={s.id}
              student={s}
              todayStatus={attendanceMap[s.id]}
              onMarkStatus={handleMarkStatus}
              onAddFeedback={handleOpenFeedback}
              onGenerateReport={handleGenerateWaReport}
            />
          ))}
        </div>
      </div>

      {/* Modal Configure Class Jam Masuk & Jam Keluar */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '440px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>
              Atur Jam Masuk & Jam Keluar Kelas
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '14px' }}>
              Tentukan batas jam masuk (untuk deteksi keterlambatan) dan jam keluar (sebagai acuan agar scan ke-2 tidak terhitung ganda).
            </p>

            <form onSubmit={handleUpdateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Batas Jam Masuk Pagi (WIB)
                </label>
                <input
                  type="time"
                  className="skeuo-input"
                  value={scheduleForm.jam_masuk}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, jam_masuk: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Siswa yang scan setelah jam ini otomatis berstatus <strong>TERLAMBAT</strong>.</span>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Batas Jam Keluar / Pulang Sore (WIB)
                </label>
                <input
                  type="time"
                  className="skeuo-input"
                  value={scheduleForm.jam_pulang}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, jam_pulang: e.target.value })}
                  required
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Scan sebelum jam ini akan ditolak (perlindungan anti-double scan). Scan pada/setelah jam ini dihitung sebagai <strong>Absen Pulang</strong>.</span>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <PressButton variant="secondary" type="button" onClick={() => setShowScheduleModal(false)}>Batal</PressButton>
                <PressButton type="submit">Simpan Jadwal</PressButton>
              </div>
            </form>
          </SkeuoCard>
        </div>
      )}

      {/* Modal Card Scan Simulator */}
      <SimulatorModal
        isOpen={showSimulator}
        onClose={() => setShowSimulator(false)}
        students={students}
        onScanSuccess={loadDashboardData}
      />

      {/* Modal Add Feedback Sticky Note */}
      {feedbackStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '440px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
              Catatan untuk {feedbackStudent.nama}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
              Catatan ini akan tampil sebagai Sticky Note pada laporan bulanan orang tua.
            </p>

            <form onSubmit={handleSaveFeedback}>
              <textarea
                className="skeuo-input"
                style={{ height: '110px', fontFamily: 'Caveat, cursive', fontSize: '1.2rem' }}
                placeholder="Tuliskan catatan terkait perkembangan/kedisiplinan siswa..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                required
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <PressButton variant="secondary" onClick={() => setFeedbackStudent(null)}>Batal</PressButton>
                <PressButton type="submit">Tempel Catatan</PressButton>
              </div>
            </form>
          </SkeuoCard>
        </div>
      )}

      {/* Modal Share WA Link */}
      {waReportData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '480px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '6px' }}>
              Kirim Laporan ke WhatsApp
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
              Siswa: <strong>{waReportData.student.nama}</strong> | Format: <strong>{formatWhatsAppNumber(waReportData.phone)}</strong>
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', fontSize: '0.82rem', color: '#1e293b', marginBottom: '14px', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
              {waReportData.waMessage}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <PressButton variant="secondary" onClick={() => setWaReportData(null)}>Tutup</PressButton>
              <PressButton variant="amber" onClick={openWhatsAppLink}>
                Kirim via WhatsApp
              </PressButton>
            </div>
          </SkeuoCard>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
