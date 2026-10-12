import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import { UserPlus, KeyRound, Edit, CheckCircle2, AlertCircle } from 'lucide-react';

export const ManageTeachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ username: '', password: '', first_name: '', last_name: '', email: '', phone_number: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    const data = await adminAPI.getTeachers();
    setTeachers(data);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await adminAPI.updateTeacher(editId, form);
        setMsg('Data wali kelas berhasil diperbarui!');
      } else {
        await adminAPI.createTeacher(form);
        setMsg('Akun wali kelas baru berhasil dibuat!');
      }
      setShowModal(false);
      setForm({ username: '', password: '', first_name: '', last_name: '', email: '', phone_number: '' });
      setEditId(null);
      loadTeachers();
    } catch (err) {
      alert(err.response?.data?.username?.[0] || 'Gagal menyimpan data.');
    }
  };

  const handleResetPassword = async (id, username) => {
    const newPass = prompt(`Masukkan password baru untuk ${username}:`, 'guru123');
    if (!newPass) return;
    try {
      await adminAPI.resetTeacherPassword(id, newPass);
      alert(`Password ${username} berhasil di-reset menjadi "${newPass}"!`);
    } catch (err) {
      alert('Gagal reset password.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Manajemen Wali Kelas
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Kelola akun pengguna wali kelas dan setel ulang kata sandi.
          </p>
        </div>
        <PressButton icon={UserPlus} onClick={() => { setEditId(null); setForm({ username: '', password: '', first_name: '', last_name: '', email: '', phone_number: '' }); setShowModal(true); }}>
          Tambah Wali Kelas
        </PressButton>
      </div>

      {msg && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', color: '#065f46', padding: '8px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
          {msg}
        </div>
      )}

      <SkeuoCard style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Nama Lengkap</th>
                <th style={{ padding: '12px 14px' }}>Username</th>
                <th style={{ padding: '12px 14px' }}>Email</th>
                <th style={{ padding: '12px 14px' }}>No. WhatsApp</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>
                    {t.first_name} {t.last_name}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>{t.username}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{t.email || '-'}</td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{t.phone_number || '-'}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleResetPassword(t.id, t.username)}
                        title="Reset Password"
                        style={{ padding: '4px 8px', background: '#fef3c7', border: '1px solid #fde047', color: '#854d0e', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <KeyRound size={13} /> Reset Pass
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SkeuoCard>

      {/* Modal Add/Edit */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '12px' }}>
          <SkeuoCard style={{ width: '100%', maxWidth: '460px', padding: '20px', background: '#fff' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '12px' }}>Buat Akun Wali Kelas</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" className="skeuo-input" placeholder="Username (misal: guru_10c)" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required />
              <input type="password" className="skeuo-input" placeholder="Password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required />
              <input type="text" className="skeuo-input" placeholder="Nama Depan" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} required />
              <input type="text" className="skeuo-input" placeholder="Nama Belakang / Gelar" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
              <input type="email" className="skeuo-input" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              <input type="text" className="skeuo-input" placeholder="No. WhatsApp" value={form.phone_number} onChange={(e) => setForm({...form, phone_number: e.target.value})} />

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

export default ManageTeachers;
