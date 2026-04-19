import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { MdFlashOn, MdDescription, MdDeleteOutline, MdPeople, MdFileDownload, MdMenu, MdAssignment, MdBolt } from 'react-icons/md';

export default function ManagerDrawer({ activeTab, onTabChange, onLogout, username, onDrawerStateChange }) {
  const { theme, toggleTheme, colors } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Detect window resize to toggle mobile view
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileOpen(false); // Close drawer on desktop
        onDrawerStateChange?.(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [onDrawerStateChange]);

  // Lock/unlock body scroll when drawer opens/closes on mobile
  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobile, isMobileOpen]);

  // Notify parent when drawer state changes
  useEffect(() => {
    onDrawerStateChange?.(isMobileOpen);
  }, [isMobileOpen, onDrawerStateChange]);

  const V = {
    fontDisplay: "'DM Sans', sans-serif",
    fontMono: "'JetBrains Mono', monospace",
  };

  const MENU_ITEMS = [
    { id: 'live', label: 'Live Dashboard', icon: MdBolt },
    { id: 'records', label: 'Records', icon: MdDescription },
    { id: 'pending', label: 'Pending', icon: MdAssignment },
    { id: 'deleted', label: 'Deleted', icon: MdDeleteOutline },
    { id: 'users', label: 'Users', icon: MdPeople },
    { id: 'export', label: 'Export', icon: MdFileDownload },
  ];

  const handleMenuClick = (id) => {
    onTabChange(id);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Toggle - Only show on mobile */}
      {isMobile && (
        <div style={{
          display: 'flex',
          padding: '12px 16px',
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>PEM Energy</div>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MdMenu />
          </button>
        </div>
      )}

      {/* Overlay for mobile menu */}
      {isMobile && isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        width: isMobile ? '100%' : '280px',
        maxWidth: '280px',
        background: colors.surface,
        borderRight: isMobile ? 'none' : `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        position: isMobile ? 'fixed' : 'fixed',
        left: 0,
        top:  0,
        height: isMobile ? `calc(100vh)` : '100vh',
        zIndex: isMobileOpen ? 1000 : 45,
        transform: isMobile ? (isMobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
        transition: 'transform 0.3s ease',
        boxShadow: isMobile && isMobileOpen ? '2px 0 10px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 18px',
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
          }}>
            <div style={{
              width: 44,
              height: 44,
              background: colors.surface2,
              border: `2px solid ${colors.blue}`,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}>
              <MdBolt style={{ color: colors.blue }} />
            </div>
            <div>
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: colors.text,
                fontFamily: V.fontDisplay,
                letterSpacing: '-0.02em',
              }}>
                PEM Energy
              </div>
              <div style={{
                fontSize: 11,
                color: colors.textMuted,
                fontFamily: V.fontMono,
                marginTop: 2,
              }}>
                Manager Portal
              </div>
            </div>
          </div>
          {username && (
            <div style={{
              padding: '8px 12px',
              background: colors.surface2,
              borderRadius: 8,
              fontSize: 12,
              color: colors.textMuted,
              fontFamily: V.fontMono,
              borderLeft: `3px solid ${colors.blue}`,
              wordBreak: 'break-word',
            }}>
              {username}
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {MENU_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  margin: '4px 0',
                  background: activeTab === item.id ? colors.surface2 : 'transparent',
                  border: activeTab === item.id ? `1px solid ${colors.blue}` : '1px solid transparent',
                  borderRadius: 10,
                  color: activeTab === item.id ? colors.blue : colors.textMuted,
                  fontSize: 14,
                  fontWeight: activeTab === item.id ? 700 : 600,
                  fontFamily: V.fontDisplay,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                onMouseOver={(e) => {
                  if (activeTab !== item.id) {
                    e.currentTarget.style.background = colors.surface2;
                    e.currentTarget.style.color = colors.text;
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== item.id) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = colors.textMuted;
                  }
                }}
              >
                <IconComponent style={{ fontSize: 20, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>


      </div>
    </>
  );
}
