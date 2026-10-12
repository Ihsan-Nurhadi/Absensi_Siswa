import React from 'react';
import SkeuoCard from './SkeuoCard';
import StampBadge from './StampBadge';
import { UserCheck, Clock, AlertCircle, FileText, CreditCard, LogIn, LogOut, Send } from 'lucide-react';

export const StudentCard = ({ student, todayStatus, onMarkStatus, onAddFeedback, onGenerateReport }) => {
  const defaultPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

  const waktuMasuk = todayStatus?.waktu_masuk || todayStatus?.waktu_scan;
  const waktuPulang = todayStatus?.waktu_pulang;
  const lupaPulang = todayStatus?.lupa_absen_pulang;

  return (
    <SkeuoCard className="p-4" style={{ padding: '14px', position: 'relative' }}>
      {/* Header Band */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: '#ffffff',
        padding: '6px 12px',
        margin: '-14px -14px 12px -14px',
        borderRadius: '11px 11px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.5px'
      }}>
        <span>KARTU PELAJAR</span>
        <span>NIS: {student.nis}</span>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        {/* Photo Frame */}
        <div style={{
          width: '56px',
          height: '68px',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '2px solid #cbd5e1',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
          flexShrink: 0,
          background: '#e2e8f0'
        }}>
          <img 
            src={student.foto_url || defaultPhoto} 
            alt={student.nama} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', marginBottom: '2px', lineHeight: 1.2 }}>
            {student.nama}
          </h4>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
            {student.kelas_nama || 'Kelas X'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#475569', marginBottom: '4px' }}>
            <CreditCard size={12} color="#64748b" />
            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 4px', borderRadius: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {student.epc_tag ? student.epc_tag : 'Belum Ada Kartu'}
            </span>
          </div>
        </div>

        {/* Stamp Status Badge & Timestamps */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          <StampBadge status={todayStatus?.status} lupaPulang={lupaPulang} />
          
          <div style={{ fontSize: '0.7rem', color: '#475569', textAlign: 'right', marginTop: '2px' }}>
            {waktuMasuk ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#047857' }}>
                <LogIn size={10} /> Masuk: <strong>{waktuMasuk}</strong>
              </div>
            ) : (
              <span style={{ color: '#94a3b8' }}>Belum Masuk</span>
            )}
            
            {waktuPulang ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#1d4ed8', marginTop: '1px' }}>
                <LogOut size={10} /> Pulang: <strong>{waktuPulang}</strong>
              </div>
            ) : (
              lupaPulang ? (
                <div style={{ color: '#b91c1c', fontWeight: 800, fontSize: '0.68rem' }}>
                  Tidak Absen Pulang
                </div>
              ) : null
            )}
            {todayStatus?.catatan_koreksi && (
              <div style={{
                fontSize: '0.67rem',
                color: todayStatus?.status === 'TERLAMBAT' ? '#c2410c' : todayStatus?.status === 'ALPA' ? '#b91c1c' : '#059669',
                marginTop: '2px',
                lineHeight: 1.2
              }}>
                {todayStatus.catatan_koreksi}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Bar for Wali Kelas */}
      {onMarkStatus && (
        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onMarkStatus(student, 'HADIR')}
              title="Tandai Hadir (Bypass)"
              style={{ padding: '4px 7px', fontSize: '0.72rem', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
            >
              Hadir
            </button>
            <button
              onClick={() => onMarkStatus(student, 'IZIN')}
              title="Tandai Izin (Bypass)"
              style={{ padding: '4px 7px', fontSize: '0.72rem', background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
            >
              Izin
            </button>
            <button
              onClick={() => onMarkStatus(student, 'SAKIT')}
              title="Tandai Sakit (Bypass)"
              style={{ padding: '4px 7px', fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3', border: '1px solid #a5b4fc', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
            >
              Sakit
            </button>
            <button
              onClick={() => onMarkStatus(student, 'ALPA')}
              title="Tandai Alpa (Bypass)"
              style={{ padding: '4px 7px', fontSize: '0.72rem', background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
            >
              Alpa
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {onAddFeedback && (
              <button
                onClick={() => onAddFeedback(student)}
                title="Tulis Catatan Feedback"
                style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#fef08a', color: '#713f12', border: '1px solid #facc15', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <FileText size={11} /> Catat
              </button>
            )}
            {onGenerateReport && (
              <button
                onClick={() => onGenerateReport(student)}
                title="Bagikan Laporan ke WhatsApp Ortu"
                style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', border: '1px solid #93c5fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                <Send size={11} /> WA
              </button>
            )}
          </div>
        </div>
      )}
    </SkeuoCard>
  );
};

export default StudentCard;
