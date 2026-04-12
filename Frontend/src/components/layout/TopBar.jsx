/**
 * @file TopBar.jsx
 * @description Sticky top navigation bar shown on every authenticated page.
 *
 * Features:
 *  - Current page title derived from the active route
 *  - Live clock / date display
 *  - User avatar with role badge + logout dropdown
 *
 * Future scope:
 *  - Notification bell with unread count
 *  - Global search (Cmd+K)
 *  - Theme toggle (dark / light)
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
   HiOutlineViewGrid,
   HiOutlineUsers,
   HiOutlineMap,
   HiOutlineClipboardList,
   HiOutlineLocationMarker,
   HiOutlineLogout,
   HiOutlineUser,
   HiOutlineBell,
   HiChevronDown,
} from 'react-icons/hi';
import { format } from 'date-fns';
import useAuthStore from '../../auth/authStore.js';

// ─── Route → Label map ────────────────────────────────────────────────────────

const ROUTE_META = {
   '/':           { label: 'Dashboard',   icon: HiOutlineViewGrid       },
   '/employees':  { label: 'Employees',   icon: HiOutlineUsers          },
   '/routes':     { label: 'Routes',      icon: HiOutlineMap            },
   '/assignments':{ label: 'Assignments', icon: HiOutlineClipboardList  },
   '/map':        { label: 'Live Map',    icon: HiOutlineLocationMarker },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Animated live clock — updates every second */
function LiveClock() {
   const [time, setTime] = useState(new Date());

   useEffect(() => {
      const id = setInterval(() => setTime(new Date()), 1000);
      return () => clearInterval(id);
   }, []);

   return (
      <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
         <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
            {format(time, 'HH:mm:ss')}
         </div>
         <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            {format(time, 'EEE, d MMM yyyy')}
         </div>
      </div>
   );
}

/** User avatar dropdown */
function UserMenu({ user, onLogout }) {
   const [open, setOpen] = useState(false);
   const menuRef = useRef(null);

   // Close on outside click
   useEffect(() => {
      if (!open) return;
      const handler = (e) => {
         if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
   }, [open]);

   const initials = user?.name
      ?.split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?';

   const ROLE_COLORS = {
      admin:    { bg: 'rgba(99,102,241,0.15)', color: '#6366f1' },
      manager:  { bg: 'rgba(59,130,246,0.15)', color: '#3b82f6' },
      employee: { bg: 'rgba(16,185,129,0.15)', color: '#10b981' },
   };
   const roleStyle = ROLE_COLORS[user?.role] ?? ROLE_COLORS.employee;

   return (
      <div ref={menuRef} style={{ position: 'relative' }}>
         <button
            onClick={() => setOpen((v) => !v)}
            style={{
               display: 'flex', alignItems: 'center', gap: 8,
               padding: '6px 10px', borderRadius: 'var(--radius)',
               background: open ? 'var(--surface)' : 'transparent',
               border: '1px solid', borderColor: open ? 'var(--border)' : 'transparent',
               cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
               if (!open) {
                  e.currentTarget.style.background = 'var(--surface)';
                  e.currentTarget.style.borderColor = 'var(--border)';
               }
            }}
            onMouseLeave={(e) => {
               if (!open) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
               }
            }}
         >
            {/* Avatar circle */}
            <div style={{
               width: 32, height: 32, borderRadius: '50%',
               background: 'var(--accent)', color: '#fff',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: 12, fontWeight: 800, flexShrink: 0,
               boxShadow: '0 0 0 2px var(--accent-glow)',
            }}>
               {initials}
            </div>

            <div style={{ textAlign: 'left', lineHeight: 1.3 }}>
               <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', maxWidth: 100, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {user?.name}
               </div>
               <div style={{ fontSize: 10, fontWeight: 600, color: roleStyle.color, textTransform: 'capitalize' }}>
                  {user?.role}
               </div>
            </div>

            <HiChevronDown style={{
               fontSize: 14, color: 'var(--text-3)', flexShrink: 0,
               transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
               transition: 'transform 0.2s',
            }} />
         </button>

         {/* Dropdown */}
         {open && (
            <div style={{
               position: 'absolute', right: 0, top: 'calc(100% + 8px)',
               minWidth: 200, zIndex: 100,
               background: 'var(--surface)',
               border: '1px solid var(--border-2)',
               borderRadius: 'var(--radius-lg)',
               boxShadow: 'var(--shadow-lg)',
               overflow: 'hidden',
               animation: 'fadeDown 0.15s ease',
            }}>
               {/* User info header */}
               <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{user?.email}</div>
                  <div style={{
                     display: 'inline-flex', marginTop: 8,
                     padding: '2px 8px', borderRadius: 99,
                     background: roleStyle.bg, color: roleStyle.color,
                     fontSize: 10, fontWeight: 700, textTransform: 'capitalize',
                  }}>
                     {user?.role}
                  </div>
               </div>

               {/* Profile link */}
               <button
                  style={{
                     width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                     padding: '10px 16px', background: 'transparent', border: 'none',
                     cursor: 'pointer', color: 'var(--text-2)', fontSize: 13,
                     transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                  <HiOutlineUser style={{ fontSize: 16 }} /> Profile
               </button>

               {/* Logout */}
               <button
                  onClick={() => { setOpen(false); onLogout(); }}
                  style={{
                     width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                     padding: '10px 16px', background: 'transparent', border: 'none',
                     cursor: 'pointer', color: 'var(--red)', fontSize: 13,
                     borderTop: '1px solid var(--border)',
                     transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--red-dim)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
               >
                  <HiOutlineLogout style={{ fontSize: 16 }} /> Sign out
               </button>
            </div>
         )}
      </div>
   );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TopBar() {
   const location = useLocation();
   const navigate = useNavigate();
   const { user, logout } = useAuthStore();

   const currentMeta = ROUTE_META[location.pathname] ?? { label: 'Page', icon: HiOutlineViewGrid };
   const PageIcon = currentMeta.icon;

   const handleLogout = async () => {
      await logout();
      navigate('/login');
   };

   return (
      <>
         <style>{`
            @keyframes fadeDown {
               from { opacity: 0; transform: translateY(-6px); }
               to   { opacity: 1; transform: translateY(0);    }
            }
         `}</style>

         <header style={{
            height: 60,
            flexShrink: 0,
            background: 'var(--bg-2)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backdropFilter: 'blur(12px)',
         }}>

            {/* Left — current page breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'var(--accent)', opacity: 0.9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 15,
               }}>
                  <PageIcon />
               </div>
               <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
                     {currentMeta.label}
                  </div>
               </div>
            </div>

            {/* Right — clock + notifications + user */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
               <LiveClock />

               {/* Notification bell (placeholder) */}
               <button style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: 'transparent', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-2)', fontSize: 17,
                  transition: 'all 0.15s',
               }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
               >
                  <HiOutlineBell />
               </button>

               <UserMenu user={user} onLogout={handleLogout} />
            </div>
         </header>
      </>
   );
}
