/**
 * @file Sidebar.jsx
 * @description App-wide collapsible navigation sidebar.
 *
 * Features:
 *  - NavLink active state with accent left-border indicator
 *  - Animated LIVE badge on the Live Map entry
 *  - Animated dark/light mode toggle button in the footer
 *  - User info + sign-out at the bottom
 *
 * Future scope:
 *  - Collapse to icon-only mode on mobile (hamburger toggle)
 *  - Role-based nav item visibility
 *  - Unread notification badge on nav items
 */

import { NavLink, useNavigate } from 'react-router-dom';
import {
   HiOutlineViewGrid,
   HiOutlineUsers,
   HiOutlineMap,
   HiOutlineClipboardList,
   HiOutlineLogout,
   HiOutlineChip,
   HiOutlineLocationMarker,
} from 'react-icons/hi';
import useAuthStore from '../../auth/authStore.js';
import { useTheme } from '../../context/ThemeContext.jsx';

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_ITEMS = [
   { to: '/',            icon: HiOutlineViewGrid,       label: 'Dashboard'   },
   { to: '/employees',   icon: HiOutlineUsers,          label: 'Employees'   },
   { to: '/routes',      icon: HiOutlineMap,            label: 'Routes'      },
   { to: '/assignments', icon: HiOutlineClipboardList,  label: 'Assignments' },
   { to: '/map',         icon: HiOutlineLocationMarker, label: 'Live Map', badge: 'LIVE' },
];

// ─── Theme Toggle Button ──────────────────────────────────────────────────────

function ThemeToggle() {
   const { isDark, toggleTheme } = useTheme();

   return (
      <>
         <style>{`
            @keyframes spin-in {
               from { transform: rotate(-90deg) scale(0.5); opacity: 0; }
               to   { transform: rotate(0deg)   scale(1);   opacity: 1; }
            }
            @keyframes rays-pulse {
               0%, 100% { opacity: 0.7; transform: scale(1); }
               50%       { opacity: 1;   transform: scale(1.15); }
            }
            @keyframes stars-twinkle {
               0%, 100% { opacity: 0.6; }
               50%       { opacity: 1; }
            }
            .theme-toggle-btn {
               width: 100%;
               display: flex;
               align-items: center;
               gap: 10px;
               padding: 9px 12px;
               border-radius: var(--radius);
               border: 1px solid var(--border);
               cursor: pointer;
               font-size: 13px;
               font-family: var(--font-body);
               font-weight: 500;
               transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
               position: relative;
               overflow: hidden;
               letter-spacing: 0.01em;
            }
            .theme-toggle-btn::before {
               content: '';
               position: absolute;
               inset: 0;
               opacity: 0;
               transition: opacity 0.25s;
               border-radius: inherit;
            }
            .theme-toggle-btn:hover::before { opacity: 1; }
            .theme-toggle-btn:hover {
               transform: translateY(-1px);
               box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .theme-toggle-btn:active {
               transform: translateY(0px) scale(0.98);
            }
            .theme-toggle-btn--dark {
               background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
               color: #c7d2fe;
               border-color: #4338ca;
            }
            .theme-toggle-btn--dark::before {
               background: linear-gradient(135deg, #312e81 0%, #4338ca 100%);
            }
            .theme-toggle-btn--light {
               background: linear-gradient(135deg, #fef9c3 0%, #fde68a 100%);
               color: #92400e;
               border-color: #f59e0b;
            }
            .theme-toggle-btn--light::before {
               background: linear-gradient(135deg, #fde68a 0%, #fbbf24 100%);
            }

            .theme-icon-wrap {
               width: 28px;
               height: 28px;
               border-radius: 50%;
               display: flex;
               align-items: center;
               justify-content: center;
               flex-shrink: 0;
               position: relative;
               animation: spin-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .theme-icon-wrap--dark {
               background: rgba(99, 102, 241, 0.25);
               box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
            }
            .theme-icon-wrap--light {
               background: rgba(251, 191, 36, 0.3);
               box-shadow: 0 0 0 2px rgba(251, 191, 36, 0.4);
            }

            /* Sun rays */
            .sun-rays {
               position: absolute;
               inset: -4px;
               animation: rays-pulse 2.5s ease-in-out infinite;
            }
            .sun-ray {
               position: absolute;
               width: 2px;
               height: 5px;
               background: #f59e0b;
               border-radius: 1px;
               left: 50%;
               transform-origin: 50% 18px;
               top: 0;
               margin-left: -1px;
            }

            /* Stars */
            .star {
               position: absolute;
               background: #c7d2fe;
               border-radius: 50%;
               animation: stars-twinkle 1.8s ease-in-out infinite;
            }
            .star:nth-child(2) { animation-delay: 0.4s; }
            .star:nth-child(3) { animation-delay: 0.8s; }

            .theme-toggle-label {
               flex: 1;
               text-align: left;
               position: relative;
               z-index: 1;
            }
            .theme-toggle-hint {
               font-size: 9px;
               font-weight: 400;
               opacity: 0.7;
               display: block;
               line-height: 1;
               margin-top: 1px;
            }

            .theme-toggle-track {
               width: 32px;
               height: 18px;
               border-radius: 9px;
               position: relative;
               flex-shrink: 0;
               transition: background 0.3s;
            }
            .theme-toggle-track--dark  { background: rgba(99, 102, 241, 0.4); }
            .theme-toggle-track--light { background: rgba(251, 191, 36, 0.5); }
            .theme-toggle-thumb {
               position: absolute;
               top: 3px;
               width: 12px;
               height: 12px;
               border-radius: 50%;
               transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .theme-toggle-thumb--dark {
               left: 3px;
               background: #6366f1;
               box-shadow: 0 0 6px rgba(99, 102, 241, 0.6);
            }
            .theme-toggle-thumb--light {
               left: 17px;
               background: #f59e0b;
               box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
            }
         `}</style>

         <button
            onClick={toggleTheme}
            className={`theme-toggle-btn theme-toggle-btn--${isDark ? 'dark' : 'light'}`}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
         >
            {/* Animated icon */}
            <div className={`theme-icon-wrap theme-icon-wrap--${isDark ? 'dark' : 'light'}`} key={isDark ? 'moon' : 'sun'}>
               {isDark ? (
                  <>
                     {/* Stars around the moon icon */}
                     <div className="star" style={{ width: 3, height: 3, top: 2, right: 3 }} />
                     <div className="star" style={{ width: 2, height: 2, bottom: 3, right: 4, animationDelay: '0.4s' }} />
                     <div className="star" style={{ width: 2, height: 2, top: 6, left: 2, animationDelay: '0.8s' }} />
                     {/* Moon SVG */}
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="#818cf8" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                     </svg>
                  </>
               ) : (
                  <>
                     {/* Sun rays */}
                     <div className="sun-rays">
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                           <div key={deg} className="sun-ray" style={{ transform: `rotate(${deg}deg) translateX(-50%)` }} />
                        ))}
                     </div>
                     {/* Sun SVG */}
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1.5"/>
                     </svg>
                  </>
               )}
            </div>

            {/* Label */}
            <span className="theme-toggle-label" style={{ position: 'relative', zIndex: 1 }}>
               {isDark ? 'Dark mode' : 'Light mode'}
               <span className="theme-toggle-hint">
                  {isDark ? 'Click for light' : 'Click for dark'}
               </span>
            </span>

            {/* Toggle track */}
            <div className={`theme-toggle-track theme-toggle-track--${isDark ? 'dark' : 'light'}`}>
               <div className={`theme-toggle-thumb theme-toggle-thumb--${isDark ? 'dark' : 'light'}`} />
            </div>
         </button>
      </>
   );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NavItem({ to, icon: Icon, label, badge }) {
   return (
      <NavLink
         to={to}
         end={to === '/'}
         style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 'var(--radius)',
            fontSize: 14,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--text)' : 'var(--text-2)',
            background: isActive ? 'var(--surface)' : 'transparent',
            borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
            textDecoration: 'none',
            transition: 'all 0.15s',
            position: 'relative',
         })}
         onMouseEnter={(e) => {
            const link = e.currentTarget;
            if (!link.dataset.active) {
               link.style.color = 'var(--text)';
               link.style.background = 'var(--surface)';
            }
         }}
         onMouseLeave={(e) => {
            const link = e.currentTarget;
            if (!link.dataset.active) {
               link.style.color = '';
               link.style.background = '';
            }
         }}
      >
         <Icon style={{ fontSize: 18, flexShrink: 0 }} />
         <span style={{ flex: 1 }}>{label}</span>
         {badge && (
            <span style={{
               fontSize: 9, fontWeight: 800,
               padding: '2px 5px', borderRadius: 99,
               background: 'var(--green)', color: '#fff',
               letterSpacing: '0.04em',
               animation: 'pulse-glow 2s ease-in-out infinite',
            }}>
               {badge}
            </span>
         )}
      </NavLink>
   );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Sidebar() {
   const { user, logout } = useAuthStore();
   const navigate = useNavigate();

   const handleLogout = async () => {
      await logout();
      navigate('/login');
   };

   return (
      <aside style={{
         width: 220,
         flexShrink: 0,
         background: 'var(--bg-2)',
         borderRight: '1px solid var(--border)',
         display: 'flex',
         flexDirection: 'column',
         height: '100dvh',
         position: 'sticky',
         top: 0,
      }}>

         {/* ── Logo ── */}
         <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{
                  width: 34, height: 34, borderRadius: 8,
                  background: 'var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 16,
                  boxShadow: 'var(--shadow-accent)',
               }}>
                  <HiOutlineChip />
               </div>
               <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700, fontSize: 17,
                  color: 'var(--text)',
               }}>
                  Nagar
               </span>
            </div>
         </div>

         {/* ── Navigation ── */}
         <nav style={{
            flex: 1,
            padding: '12px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
         }}>
            {NAV_ITEMS.map((item) => (
               <NavItem key={item.to} {...item} />
            ))}
         </nav>

         {/* ── User footer ── */}
         <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
            <div style={{ padding: '8px 12px', marginBottom: 4 }}>
               <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {user?.name}
               </p>
               <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, textTransform: 'capitalize' }}>
                  {user?.role}
               </p>
            </div>

            {/* ── Theme Toggle ── */}
            <div style={{ marginBottom: 6 }}>
               <ThemeToggle />
            </div>

            <button
               onClick={handleLogout}
               style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 'var(--radius)',
                  background: 'transparent', border: 'none',
                  cursor: 'pointer', color: 'var(--text-3)',
                  fontSize: 14, fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
               }}
               onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--red)';
                  e.currentTarget.style.background = 'var(--red-dim)';
               }}
               onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-3)';
                  e.currentTarget.style.background = 'transparent';
               }}
            >
               <HiOutlineLogout style={{ fontSize: 18 }} />
               Sign out
            </button>
         </div>
      </aside>
   );
}
