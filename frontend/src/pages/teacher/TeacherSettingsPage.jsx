import React, { useEffect, useState } from 'react';
import { teacherAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import { Radio, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export const TeacherSettingsPage = () => {
  const [topic, setTopic] = useState('');
  const [classInfo, setClassInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadTopic();
  }, []);

  const loadTopic = async () => {
    try {
      const data = await teacherAPI.getClassTopic();
      setClassInfo(data);
      setTopic(data.topic_mqtt || '');
    } catch (err) {
      console.error("Error loading class topic:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await teacherAPI.updateClassTopic(topic);
      setMsg({ text: res.message || 'Topik saluran kelas berhasil disimpan!', type: 'success' });
      await loadTopic();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Gagal menyimpan topik.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
          Pengaturan Saluran Kartu Kelas (MQTT Topic)
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
          Tentukan topik saluran MQTT khusus untuk kelas <strong>{classInfo?.kelas_nama || 'Anda'}</strong>. Sinyal tempel kartu dari alat kelas ini akan masuk melalui topik ini.
        </p>
      </div>

      <SkeuoCard style={{ padding: '24px' }}>
        {msg.text && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${msg.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
            color: msg.type === 'success' ? '#065f46' : '#991b1b',
            fontWeight: 700,
            fontSize: '0.9rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {msg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
              Nama Kelas
            </label>
            <input
              type="text"
              className="skeuo-input"
              value={classInfo?.kelas_nama || ''}
              disabled
              style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
              Topik Saluran Perangkat (MQTT Topic)
            </label>
            <input
              type="text"
              className="skeuo-input"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Contoh: sekolah/absen/kelas-10a"
              required
            />
            <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Pastikan alat Perangkat Absen di kelas Anda disetel untuk mengirim sinyal ke topik ini.
            </span>
          </div>

          <div style={{ marginTop: '10px' }}>
            <PressButton type="submit" disabled={loading} icon={Save}>
              {loading ? 'Menyimpan...' : 'Simpan Topik Saluran'}
            </PressButton>
          </div>
        </form>
      </SkeuoCard>
    </div>
  );
};

export default TeacherSettingsPage;
