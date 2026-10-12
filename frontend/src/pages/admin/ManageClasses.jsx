import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import { Plus, School, Edit, CheckCircle2, Eye } from 'lucide-react';

export const ManageClasses = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: '', tahun_ajaran: '2025/2026', jam_masuk: '07:15', wali_kelas_id: '', topic_mqtt: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [cls, tch] = await Promise.all([adminAPI.getClasses(), adminAPI.getTeachers()]);
    setClasses(cls);
    setTeachers(tch);
  };

  const handleOpenNew = () => {
    setEditId(null);
    setForm({ nama: '', tahun_ajaran: '2025/2026', jam_masuk: '07:15', wali_kelas_id: '', topic_mqtt: `sekolah/absen/kelas-${Date.now().toString().slice(-4)}` });
    setShowModal(true);
  };

  const handleEdit = (cls) => {
    setEditId(cls.id);
    setForm({
      nama: cls.nama,
      tahun_ajaran: cls.tahun_ajaran,
      jam_masuk: cls.jam_masuk || '07:15',
      wali_kelas_id: cls.wali_kelas || '',
      topic_mqtt: cls.topic_mqtt
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        wali_kelas_id: form.wali_kelas_id ? parseInt(form.wali_kelas_id) : null
      };
      if (editId) {
        await adminAPI.updateClass(editId, payload);
      } else {
        await adminAPI.createClass(payload);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.nama?.[0] || err.response?.data?.topic_mqtt?.[0] || 'Gagal menyimpan kelas.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Manajemen Kelas & Saluran
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Kelola kelas, penugasan wali kelas, dan pantau status per kelas.
          </p>
        </div>
        <PressButton icon={Plus} onClick={handleOpenNew}>
          Tambah Kelas
        </PressButton>
      </div>

      <SkeuoCard style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Nama Kelas</th>
                <th style={{ padding: '12px 14px' }}>Tahun Ajaran</th>
                <th style={{ padding: '12px 14px' }}>Jam Masuk</th>
                <th style={{ padding: '12px 14px' }}>Wali Kelas</th>
                <th style={{ padding: '12px 14px' }}>Topik Saluran (MQTT)</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>{c.nama}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{c.tahun_ajaran}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>{c.jam_masuk} WIB</td>
                  <td style={{ padding: '12px 14px', color: '#0f172a', fontWeight: 700 }}>
                    {c.wali_kelas_detail?.first_name ? `${c.wali_kelas_detail.first_name} ${c.wali_kelas_detail.last_name}` : <span style={{ color: '#ef4444', fontSize: '0.78rem' }}>Belum Ditugaskan</span>}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#d97706', fontWeight: 700 }}>
                    {c.topic_mqtt}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(`/admin/classes/${c.id}`)}
                        style={{ padding: '4px 8px', background: '#ecfdf5', border: '1px solid #86efac', color: '#047857', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
                      >
                        <Eye size={12} /> Detail
                      </button>
                      <button
                        onClick={() => handleEdit(c)}
                        style={{ padding: '4px 8px', background: '#dbeafe', border: '1px solid #93c5fd', color: '#1d4ed8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SkeuoCard>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '460px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '14px' }}>
              {editId ? 'Edit Kelas' : 'Tambah Kelas Baru'}
            </h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Nama Kelas</label>
                <input type="text" className="skeuo-input" placeholder="Contoh: Kelas X-A" value={form.nama} onChange={(e) => setForm({...form, nama: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Tahun Ajaran</label>
                <input type="text" className="skeuo-input" value={form.tahun_ajaran} onChange={(e) => setForm({...form, tahun_ajaran: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Jam Masuk</label>
                <input type="time" className="skeuo-input" value={form.jam_masuk} onChange={(e) => setForm({...form, jam_masuk: e.target.value})} required />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Wali Kelas (1-to-1)</label>
                <select className="skeuo-input" value={form.wali_kelas_id} onChange={(e) => setForm({...form, wali_kelas_id: e.target.value})}>
                  <option value="">-- Pilih Wali Kelas --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.username})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Topik Saluran Perangkat (MQTT Topic)</label>
                <input type="text" className="skeuo-input" placeholder="Contoh: sekolah/absen/kelas-10a" value={form.topic_mqtt} onChange={(e) => setForm({...form, topic_mqtt: e.target.value})} required />
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <PressButton variant="secondary" onClick={() => setShowModal(false)}>Batal</PressButton>
                <PressButton type="submit">Simpan</PressButton>
              </div>
            </form>
          </SkeuoCard>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;
