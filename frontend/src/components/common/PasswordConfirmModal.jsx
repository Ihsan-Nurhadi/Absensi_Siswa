import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import PressButton from './PressButton';

export const PasswordConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  student,
  targetStatus,
  loading = false,
  error = ''
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      setLocalError('');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (error) {
      setLocalError(error);
    }
  }, [error]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setLocalError('Password wajib diisi untuk verifikasi.');
      return;
    }
    setLocalError('');
    onConfirm(password);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'HADIR':
        return { label: 'HADIR', bg: '#dcfce7', color: '#15803d', border: '#86efac' };
      case 'IZIN':
        return { label: 'IZIN', bg: '#fef9c3', color: '#a16207', border: '#fde047' };
      case 'SAKIT':
        return { label: 'SAKIT', bg: '#e0e7ff', color: '#4338ca', border: '#a5b4fc' };
      case 'ALPA':
        return { label: 'ALPA', bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' };
      default:
        return { label: status, bg: '#f1f5f9', color: '#334155', border: '#cbd5e1' };
    }
  };

  const badgeInfo = getStatusBadge(targetStatus);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="skeuo-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          animation: 'fadeIn 0.15s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '16px 20px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(217, 119, 6, 0.2)',
                border: '1px solid rgba(217, 119, 6, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                Verifikasi Bypass Presensi
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0, marginTop: '2px' }}>
                Konfirmasi keamanan akun guru
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Target Student and Target Status Summary Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '16px'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
              Perubahan Status Presensi Siswa:
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                  {student?.nama || 'Siswa'}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  NIS: {student?.nis || '-'}
                </div>
              </div>
              <div
                style={{
                  background: badgeInfo.bg,
                  color: badgeInfo.color,
                  border: `1.5px solid ${badgeInfo.border}`,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  letterSpacing: '0.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>➔ Ubah ke {badgeInfo.label}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45, marginBottom: '14px' }}>
            Untuk memastikan status presensi tidak terpencet secara tidak sengaja, silakan masukkan <strong>kata sandi akun</strong> Anda saat ini:
          </p>

          {/* Password Input Field */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="verify-password-input"
              style={{
                display: 'block',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#334155',
                marginBottom: '6px'
              }}
            >
              Password Akun Anda
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Lock size={16} />
              </div>
              <input
                id="verify-password-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                className="skeuo-input"
                placeholder="Masukkan kata sandi akun..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (localError) setLocalError('');
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  paddingLeft: '36px',
                  paddingRight: '40px',
                  borderColor: localError ? '#ef4444' : undefined,
                  fontSize: '0.88rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Error Notification */}
            {localError && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{localError}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '8px 16px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="press-btn"
              style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                fontWeight: 800,
                background: '#1e293b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} color="#4ade80" />
                  Konfirmasi & Simpan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordConfirmModal;
