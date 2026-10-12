import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/client';
import SkeuoCard from '../components/common/SkeuoCard';
import PressButton from '../components/common/PressButton';
import { Lock, User, School, CheckCircle, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(username, password);
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));

      if (data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/teacher/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Username atau password tidak cocok.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAcc = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 12px'
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Title Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '14px',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            borderRadius: '16px',
            boxShadow: '0 6px 14px rgba(0,0,0,0.15)',
            marginBottom: '10px'
          }}>
            <School size={32} color="#fbbf24" />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Sistem Absensi Siswa
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '2px' }}>
            Pemantauan Kehadiran Berbasis Kartu Siswa
          </p>
        </div>

        {/* Login Card */}
        <SkeuoCard style={{ padding: '22px 18px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontWeight: 700,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                Username / Akun Pengguna
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="skeuo-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="skeuo-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
              </div>
            </div>

            <PressButton
              type="submit"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              {loading ? 'Memproses Login...' : 'Masuk ke Sistem'}
            </PressButton>
          </form>

          {/* Demo Quick Accs */}
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1', fontSize: '0.78rem' }}>
            <div style={{ fontWeight: 800, color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' }}>
              Coba Akun Demo:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => fillQuickAcc('admin', 'admin123')}
                style={{ flex: 1, padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
              >
                Admin (admin)
              </button>
              <button
                onClick={() => fillQuickAcc('guru_10a', 'guru123')}
                style={{ flex: 1, padding: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
              >
                Wali Kelas (guru_10a)
              </button>
            </div>
          </div>
        </SkeuoCard>
      </div>
    </div>
  );
};

export default LoginPage;
