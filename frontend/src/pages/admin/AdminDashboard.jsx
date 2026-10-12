import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../api/client';
import SkeuoCard from '../../components/common/SkeuoCard';
import PressButton from '../../components/common/PressButton';
import MqttStatusIndicator from '../../components/common/MqttStatusIndicator';
import { Users, School, Server, FileSpreadsheet, Plus, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [mqttConfig, setMqttConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsData, tchData, mqttData] = await Promise.all([
        adminAPI.getClasses(),
        adminAPI.getTeachers(),
        adminAPI.getMqttConfig(),
      ]);
      setClasses(clsData);
      setTeachers(tchData);
      setMqttConfig(mqttData);
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalSiswa = classes.reduce((sum, c) => sum + (c.total_siswa || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
            Dashboard Admin Sekolah
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b' }}>
            Pemantauan Kelas, Wali Kelas, dan Server Perangkat Absen (MQTT)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <PressButton variant="amber" icon={Settings} onClick={() => navigate('/admin/mqtt')}>
            Atur Server Absen
          </PressButton>
        </div>
      </div>

      {/* MQTT Connection Live Status */}
      <MqttStatusIndicator
        isConnected={mqttConfig?.is_connected}
        statusText={mqttConfig?.status_text}
        host={mqttConfig?.config?.host}
        port={mqttConfig?.config?.port}
      />

      {/* Top Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <SkeuoCard style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#dbeafe', padding: '10px', borderRadius: '10px', color: '#1d4ed8' }}>
            <School size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Kelas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{classes.length}</div>
          </div>
        </SkeuoCard>

        <SkeuoCard style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '10px', color: '#15803d' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Wali Kelas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{teachers.length}</div>
          </div>
        </SkeuoCard>

        <SkeuoCard style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '10px', color: '#b45309' }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Total Siswa</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a' }}>{totalSiswa}</div>
          </div>
        </SkeuoCard>
      </div>

      {/* Class Cards Grid */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>Daftar Kelas & Monitoring</h2>
          <PressButton variant="secondary" icon={Plus} onClick={() => navigate('/admin/classes')}>
            Kelola Kelas
          </PressButton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
          {classes.map((cls) => (
            <SkeuoCard key={cls.id} hoverable style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1e293b' }}>{cls.nama}</h3>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
                    {cls.tahun_ajaran}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '4px' }}>
                  Wali Kelas: <strong>{cls.wali_kelas_detail?.first_name ? `${cls.wali_kelas_detail.first_name} ${cls.wali_kelas_detail.last_name}` : 'Belum Ditentukan'}</strong>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '10px' }}>
                  Jumlah Siswa: <strong>{cls.total_siswa} Siswa</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.75rem', marginBottom: '12px' }}>
                  <span style={{ color: '#64748b' }}>Topik: </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#d97706' }}>{cls.topic_mqtt}</span>
                </div>
              </div>

              <div>
                <button
                  onClick={() => navigate(`/admin/classes/${cls.id}`)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: '#eff6ff',
                    border: '1px solid #93c5fd',
                    borderRadius: '6px',
                    color: '#1d4ed8',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  Lihat Detail & Monitoring <ArrowRight size={14} />
                </button>
              </div>
            </SkeuoCard>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
