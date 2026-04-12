/**
 * @file PageHeader.jsx
 * @description Reusable page-level header with optional back button, tags, and action slot.
 *
 * @param {string}      title     - Primary heading text
 * @param {string}      [subtitle] - Secondary description line
 * @param {ReactNode}   [action]  - CTA button(s) aligned to the right
 * @param {ReactNode}   [tag]     - Badge/tag shown inline with the title
 * @param {boolean}     [showBack] - Show a back arrow button (uses browser history)
 */

import { useNavigate } from 'react-router-dom';
import { HiArrowLeft } from 'react-icons/hi';

export default function PageHeader({ title, subtitle, action, tag, showBack = false }) {
   const navigate = useNavigate();

   return (
      <div style={{
         display: 'flex',
         alignItems: 'flex-start',
         justifyContent: 'space-between',
         gap: 16,
         marginBottom: 28,
      }}>
         <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {showBack && (
               <button
                  onClick={() => navigate(-1)}
                  style={{
                     width: 34, height: 34, borderRadius: 8,
                     background: 'var(--surface)', border: '1px solid var(--border)',
                     display: 'flex', alignItems: 'center', justifyContent: 'center',
                     cursor: 'pointer', color: 'var(--text-2)',
                     fontSize: 16, flexShrink: 0, marginTop: 4,
                     transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-4)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--surface)'; }}
               >
                  <HiArrowLeft />
               </button>
            )}

            <div>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{
                     fontFamily: 'var(--font-display)',
                     fontWeight: 800,
                     fontSize: 'clamp(1.25rem, 2vw, 1.75rem)',
                     color: 'var(--text)',
                     lineHeight: 1.2,
                     margin: 0,
                  }}>
                     {title}
                  </h1>
                  {tag && tag}
               </div>
               {subtitle && (
                  <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>
                     {subtitle}
                  </p>
               )}
            </div>
         </div>

         {action && (
            <div style={{ flexShrink: 0, display: 'flex', gap: 10, alignItems: 'center' }}>
               {action}
            </div>
         )}
      </div>
   );
}
