import React, { useEffect, useState } from 'react';
import { teacherAPI, adminAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import { UserPlus, CreditCard, Phone, Edit, CheckCircle2 } from 'lucide-react';

export const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nama: '', nis: '', epc_tag: '', no_wa_ortu: '', foto_url: '' });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const data = await teacherAPI.getStudents();
    setStudents(data);
  };

  const handleOpenNew = () => {
    setEditId(null);
    setForm({ nama: '', nis: `100${Date.now().toString().slice(-3)}`, epc_tag: `CARD-100${Date.now().toString().slice(-3)}`, no_wa_ortu: '081234567890', foto_url: '' });
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Manajemen Siswa & Kartu
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Daftarkan siswa baru dan petakan Kode Kartu Siswa ke akun siswa.
          </p>
        </div>
        <PressButton icon={UserPlus} onClick={handleOpenNew}>
          Tambah Siswa
        </PressButton>
      </div>

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
                      style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{s.nama}</span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontWeight: 700 }}>{s.nis}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#d97706', fontWeight: 700 }}>
                    {s.epc_tag ? s.epc_tag : <span style={{ color: '#ef4444' }}>Belum Dipetakan</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.no_wa_ortu}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleEdit(s)}
                      style={{ padding: '4px 8px', background: '#dbeafe', border: '1px solid #93c5fd', color: '#1d4ed8', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                    >
                      Edit
                    </button>
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
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>Kode Kartu Siswa (Unik)</label>
                <input type="text" className="skeuo-input" placeholder="Kode tempel kartu (misal: CARD-1001-A)" value={form.epc_tag} onChange={(e) => setForm({...form, epc_tag: e.target.value})} required />
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
    </div>
  );
};

export default ManageStudents;
