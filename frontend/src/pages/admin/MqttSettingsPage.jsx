import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import MqttStatusIndicator from '../../components/common/MqttStatusIndicator';
import { Server, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const MqttSettingsPage = () => {
  const [form, setForm] = useState({
    host: 'broker.emqx.io',
    port: 1883,
    username: '',
    password: '',
    is_active: true,
  });
  const [mqttStatus, setMqttStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const data = await adminAPI.getMqttConfig();
      if (data.config) {
        setForm({
          host: data.config.host || 'broker.emqx.io',
          port: data.config.port || 1883,
          username: data.config.username || '',
          password: data.config.password || '',
          is_active: data.config.is_active ?? true,
        });
      }
      setMqttStatus(data);
    } catch (err) {
      console.error("Error loading MQTT config:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await adminAPI.updateMqttConfig(form);
      setMsg({ text: res.message || 'Pengaturan Server Absen MQTT berhasil disimpan!', type: 'success' });
      await loadConfig();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Gagal menyimpan pengaturan.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
          Pengaturan Server Perangkat Absen (MQTT)
        </h1>
        <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
          Atur kredensial koneksi broker MQTT agar backend menerima sinyal scan kartu.
        </p>
      </div>

      <MqttStatusIndicator
        isConnected={mqttStatus?.is_connected}
        statusText={mqttStatus?.status_text}
        host={form.host}
        port={form.port}
      />

      <SkeuoCard style={{ padding: '20px' }}>
        {msg.text && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${msg.type === 'success' ? '#6ee7b7' : '#fca5a5'}`,
            color: msg.type === 'success' ? '#065f46' : '#991b1b',
            fontWeight: 700,
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
              Host Broker / Alamat Server (MQTT Host)
            </label>
            <input
              type="text"
              className="skeuo-input"
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="Contoh: broker.emqx.io atau 192.168.1.100"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
              Port Broker (Default: 1883)
            </label>
            <input
              type="number"
              className="skeuo-input"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 1883 })}
              placeholder="1883"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
              Username MQTT (Opsional)
            </label>
            <input
              type="text"
              className="skeuo-input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Kosongkan jika tanpa otentikasi"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: '#475569', marginBottom: '4px' }}>
              Password MQTT (Opsional)
            </label>
            <input
              type="password"
              className="skeuo-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Kosongkan jika tanpa password"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="is_active" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', cursor: 'pointer' }}>
              Aktifkan Penerima Sinyal Absen (MQTT Listener)
            </label>
          </div>

          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <PressButton type="submit" disabled={loading} icon={Save}>
              {loading ? 'Menyimpan...' : 'Simpan & Uji Koneksi'}
            </PressButton>
            <PressButton type="button" variant="secondary" icon={RefreshCw} onClick={loadConfig}>
              Muat Ulang
            </PressButton>
          </div>
        </form>
      </SkeuoCard>
    </div>
  );
};

export default MqttSettingsPage;
