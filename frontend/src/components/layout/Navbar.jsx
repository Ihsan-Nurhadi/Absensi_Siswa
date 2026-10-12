import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { School, LogOut, Menu, X, Calendar, Users, TrendingUp, FileText, FileSpreadsheet, Server } from 'lucide-react';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isAdmin = user.role === 'ADMIN';
  const isActive = (path) => location.pathname === path;

  return (
    <header style={{
      background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
      borderBottom: '1px solid #334155',
      position: 'sticky',
      top: 0,
      zIndex: 900
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* Brand */}
        <Link to={isAdmin ? "/admin/dashboard" : "/teacher/dashboard"} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#fff' }}>
          <div style={{ background: '#fbbf24', padding: '6px', borderRadius: '8px', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <School size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.5px' }}>
              ABSENSI SISWA
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
              {isAdmin ? 'Portal Admin' : `Wali Kelas — ${user.kelas_nama || 'Kelas'}`}
            </div>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ display: 'none', gap: '6px', alignItems: 'center' }}>
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard" style={navStyle(isActive('/admin/dashboard'))}>
                Dashboard
              </Link>
              <Link to="/admin/teachers" style={navStyle(isActive('/admin/teachers'))}>
                Wali Kelas
              </Link>
              <Link to="/admin/classes" style={navStyle(isActive('/admin/classes'))}>
                Kelas
              </Link>
              <Link to="/admin/mqtt" style={navStyle(isActive('/admin/mqtt'))}>
                Server Absen
              </Link>
            </>
          ) : (
            <>
              <Link to="/teacher/dashboard" style={navStyle(isActive('/teacher/dashboard'))}>
                Absensi Hari Ini
              </Link>
              <Link to="/teacher/students" style={navStyle(isActive('/teacher/students'))}>
                Siswa & Kartu
              </Link>
              <Link to="/teacher/performance" style={navStyle(isActive('/teacher/performance'))}>
                Performa
              </Link>
              <Link to="/teacher/attendance" style={navStyle(isActive('/teacher/attendance'))}>
                Riwayat Log
              </Link>
              <Link to="/teacher/feedback" style={navStyle(isActive('/teacher/feedback'))}>
                Feedback
              </Link>
              <Link to="/teacher/reports" style={navStyle(isActive('/teacher/reports'))}>
                Laporan
              </Link>
            </>
          )}

          <button
            onClick={handleLogout}
            style={{
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 12px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginLeft: '6px'
            }}
          >
            <LogOut size={14} /> Keluar
          </button>
        </nav>

        {/* Mobile Hamburger Button */}
        <div className="mobile-toggle" style={{ display: 'block' }}>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div style={{
          background: '#0f172a',
          borderTop: '1px solid #334155',
          padding: '12px 16px 20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 10px 15px rgba(0,0,0,0.3)'
        }}>
          {isAdmin ? (
            <>
              <Link to="/admin/dashboard" style={mobileNavStyle(isActive('/admin/dashboard'))}>
                Dashboard Admin
              </Link>
              <Link to="/admin/teachers" style={mobileNavStyle(isActive('/admin/teachers'))}>
                Manajemen Wali Kelas
              </Link>
              <Link to="/admin/classes" style={mobileNavStyle(isActive('/admin/classes'))}>
                Manajemen Kelas
              </Link>
              <Link to="/admin/mqtt" style={mobileNavStyle(isActive('/admin/mqtt'))}>
                Server Perangkat Absen (MQTT)
              </Link>
            </>
          ) : (
            <>
              <Link to="/teacher/dashboard" style={mobileNavStyle(isActive('/teacher/dashboard'))}>
                Absensi Hari Ini
              </Link>
              <Link to="/teacher/students" style={mobileNavStyle(isActive('/teacher/students'))}>
                Daftar Siswa & Kartu
              </Link>
              <Link to="/teacher/performance" style={mobileNavStyle(isActive('/teacher/performance'))}>
                Analisis Performa Kelas
              </Link>
              <Link to="/teacher/attendance" style={mobileNavStyle(isActive('/teacher/attendance'))}>
                Riwayat Log Kehadiran
              </Link>
              <Link to="/teacher/feedback" style={mobileNavStyle(isActive('/teacher/feedback'))}>
                Catatan Feedback Siswa
              </Link>
              <Link to="/teacher/reports" style={mobileNavStyle(isActive('/teacher/reports'))}>
                Rekap Laporan & Kirim WA
              </Link>
            </>
          )}

          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', marginTop: '4px' }}>
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <LogOut size={16} /> Keluar dari Sistem
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .desktop-nav { display: flex !important; }
          .mobile-toggle { display: none !important; }
        }
      `}</style>
    </header>
  );
};

const navStyle = (active) => ({
  color: active ? '#fbbf24' : '#cbd5e1',
  textDecoration: 'none',
  fontSize: '0.85rem',
  fontWeight: active ? 800 : 600,
  padding: '6px 10px',
  borderRadius: '6px',
  background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
  transition: 'all 0.2s ease'
});

const mobileNavStyle = (active) => ({
  color: active ? '#fbbf24' : '#f1f5f9',
  textDecoration: 'none',
  fontSize: '0.95rem',
  fontWeight: active ? 800 : 600,
  padding: '10px 14px',
  borderRadius: '8px',
  background: active ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255, 255, 255, 0.05)',
  display: 'block',
  borderLeft: active ? '4px solid #fbbf24' : '4px solid transparent'
});

export default Navbar;
