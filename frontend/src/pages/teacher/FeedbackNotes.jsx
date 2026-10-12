import React, { useEffect, useState } from 'react';
import { teacherAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import StickyNote from '../../components/common/StickyNote';
import PressButton from '../../components/common/PressButton';
import { Plus, MessageSquare } from 'lucide-react';

export const FeedbackNotes = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [fbList, studList] = await Promise.all([
      teacherAPI.getFeedbackList(),
      teacherAPI.getStudents()
    ]);
    setFeedbacks(fbList);
    setStudents(studList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !text.trim()) return;
    try {
      await teacherAPI.createFeedback({
        siswa: selectedStudent,
        isi: text
      });
      setShowModal(false);
      setSelectedStudent('');
      setText('');
      loadData();
    } catch (err) {
      alert("Gagal menambahkan catatan.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
            Catatan Feedback Siswa (Sticky Notes)
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Catat perkembangan & kedisiplinan siswa yang akan langsung terlampir pada laporan bulanan orang tua
          </p>
        </div>

        <PressButton icon={Plus} onClick={() => setShowModal(true)}>
          Tulis Catatan Baru
        </PressButton>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
        {feedbacks.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#64748b', padding: '40px' }}>
            Belum ada catatan feedback. Klik "Tulis Catatan Baru" untuk membuat catatan.
          </div>
        ) : (
          feedbacks.map((fb) => (
            <div key={fb.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                Untuk: {fb.siswa_nama}
              </div>
              <StickyNote text={fb.isi} date={fb.tanggal} author={fb.wali_kelas_nama} />
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '440px', padding: '24px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Tulis Catatan Feedback Siswa</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Pilih Siswa</label>
                <select className="skeuo-input" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)} required>
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.nama} ({s.nis})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Isi Catatan / Sticky Note</label>
                <textarea
                  className="skeuo-input"
                  style={{ height: '110px', fontFamily: 'Caveat, cursive', fontSize: '1.2rem' }}
                  placeholder="Tulis catatan perkembangan siswa..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <PressButton variant="secondary" onClick={() => setShowModal(false)}>Batal</PressButton>
                <PressButton type="submit">Tempel Catatan</PressButton>
              </div>
            </form>
          </SkeuoCard>
        </div>
      )}
    </div>
  );
};

export default FeedbackNotes;
