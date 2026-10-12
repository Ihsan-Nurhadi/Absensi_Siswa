import React, { useState } from 'react';
import { simulatorAPI } from '../../api/client';
import PressButton from './PressButton';
import { QrCode, Zap, CheckCircle2, AlertCircle, X, LogIn, LogOut, Clock } from 'lucide-react';

export const SimulatorModal = ({ isOpen, onClose, students = [], onScanSuccess }) => {
  const [customTag, setCustomTag] = useState('');
  const [scanType, setScanType] = useState('AUTO');
  const [simTime, setSimTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleScan = async (tag) => {
    if (!tag) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await simulatorAPI.scanCard(tag, scanType, simTime);
      setResult({ success: true, message: res.message, data: res.absensi });
      if (onScanSuccess) onScanSuccess();
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.error || err.response?.data?.message || 'Gagal memroses scan kartu.' });
    } finally {
      setLoading(false);
    }
  };

  const runPresetTest = (tag, type, timeStr) => {
    setScanType(type);
    setSimTime(timeStr);
    handleScan(tag);
  };

  return (
    <div style={{
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
      padding: '12px'
    }}>
      <div className="skeuo-card" style={{
        width: '100%',
        maxWidth: '540px',
        background: '#ffffff',
        padding: '20px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color="#d97706" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Simulasi Sinyal Alat Absen (MQTT tag_epc)
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '12px' }}>
          Simulator ini memproses payload RFID (<code>tag_epc</code>, <code>reader_id</code>, <code>timestamp</code>) untuk menguji deteksi scan masuk tepat waktu/terlambat, penolakan double scan sebelum jam keluar, dan scan pulang.
        </p>

        {/* Scan Mode Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '12px' }}>
          <button
            onClick={() => { setScanType('AUTO'); setSimTime(''); }}
            style={{
              padding: '6px 4px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: scanType === 'AUTO' ? '#d97706' : '#cbd5e1',
              background: scanType === 'AUTO' ? '#fff7ed' : '#f8fafc',
              color: scanType === 'AUTO' ? '#9a3412' : '#475569',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Deteksi Otomatis
          </button>

          <button
            onClick={() => { setScanType('MASUK'); setSimTime('07:05'); }}
            style={{
              padding: '6px 4px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: scanType === 'MASUK' ? '#059669' : '#cbd5e1',
              background: scanType === 'MASUK' ? '#ecfdf5' : '#f8fafc',
              color: scanType === 'MASUK' ? '#047857' : '#475569',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}
          >
            <LogIn size={12} /> Scan Masuk (07:05)
          </button>

          <button
            onClick={() => { setScanType('PULANG'); setSimTime('15:10'); }}
            style={{
              padding: '6px 4px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: scanType === 'PULANG' ? '#2563eb' : '#cbd5e1',
              background: scanType === 'PULANG' ? '#eff6ff' : '#f8fafc',
              color: scanType === 'PULANG' ? '#1d4ed8' : '#475569',
              fontWeight: 800,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px'
            }}
          >
            <LogOut size={12} /> Scan Pulang (15:10)
          </button>
        </div>

        {/* Custom Input */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
          <input
            type="text"
            className="skeuo-input"
            placeholder="Masukkan tag_epc (contoh: E2 80 69 15 00 00 50 2E 5C F3 BE 0D)"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
          />
          <PressButton
            variant="amber"
            onClick={() => handleScan(customTag)}
            disabled={loading || !customTag}
          >
            Tempel
          </PressButton>
        </div>

        {/* Presets Grid */}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
            Daftar Kartu Siswa Terdaftar:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '6px', maxHeight: '170px', overflowY: 'auto', paddingRight: '2px' }}>
            {students.map((s) => (
              <div key={s.id} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 8px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e293b', marginBottom: '1px' }}>{s.nama}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', marginBottom: '4px', wordBreak: 'break-all' }}>
                  {s.epc_tag || 'Belum ada kartu'}
                </div>
                <div style={{ display: 'flex', gap: '3px' }}>
                  <button
                    onClick={() => runPresetTest(s.epc_tag, 'MASUK', '07:05')}
                    disabled={loading || !s.epc_tag}
                    style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Masuk
                  </button>
                  <button
                    onClick={() => runPresetTest(s.epc_tag, 'AUTO', '10:00')}
                    disabled={loading || !s.epc_tag}
                    style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                    title="Uji coba penolakan double scan sebelum jam keluar"
                  >
                    Scan Jam 10
                  </button>
                  <button
                    onClick={() => runPresetTest(s.epc_tag, 'PULANG', '15:10')}
                    disabled={loading || !s.epc_tag}
                    style={{ flex: 1, padding: '3px', fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd', borderRadius: '3px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Pulang
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Result Message */}
        {result && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '8px',
            background: result.success ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${result.success ? '#6ee7b7' : '#fca5a5'}`,
            color: result.success ? '#065f46' : '#991b1b',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {result.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{result.message}</span>
          </div>
        )}

        <div style={{ marginTop: '14px', textAlign: 'right' }}>
          <PressButton variant="secondary" onClick={onClose}>
            Tutup
          </PressButton>
        </div>
      </div>
    </div>
  );
};

export default SimulatorModal;
