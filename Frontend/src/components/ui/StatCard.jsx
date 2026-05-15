/**
 * @file StatCard.jsx
 * @description KPI stat card with accent top-bar, icon, value, and optional delta trend.
 *
 * @param {string}    label        - Metric label
 * @param {number|string} value    - Primary value to display
 * @param {ReactNode} icon         - Icon element (e.g. <HiUsers />)
 * @param {string}    [color]      - Accent hex color (default: var(--accent))
 * @param {number}    [delta]      - % change vs previous period; positive = green, negative = red
 * @param {string}    [suffix]     - Text appended after value (e.g. '/ 20')
 * @param {boolean}   [loading]    - Show skeleton instead of value
 */

export default function StatCard({
   label,
   value,
   icon,
   color  = 'var(--accent)',
   delta,
   suffix,
   loading = false,
}) {
   return (
      <div
         style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
         }}
         onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = `0 12px 32px -8px ${color}33`;
         }}
         onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
         }}
      >
         {/* Accent top bar */}
         <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
         }} />

         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
               {/* Label */}
               <p style={{
                  fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  color: 'var(--text-3)', margin: 0,
               }}>
                  {label}
               </p>

               {/* Value */}
               {loading ? (
                  <div style={{
                     height: 32, width: 80, borderRadius: 6,
                     background: 'var(--bg-4)', marginTop: 8,
                     animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
               ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                     <span style={{
                        fontSize: 32, fontWeight: 800, lineHeight: 1,
                        fontFamily: 'var(--font-display)',
                        color: 'var(--text)',
                     }}>
                        {value ?? '—'}
                     </span>
                     {suffix && (
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-3)' }}>
                           {suffix}
                        </span>
                     )}
                  </div>
               )}

               {/* Delta trend */}
               {delta != null && (
                  <p style={{
                     fontSize: 12, marginTop: 6, fontWeight: 600,
                     color: delta >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                     {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}% vs yesterday
                  </p>
               )}
            </div>

            {/* Icon */}
            <div style={{
               width: 44, height: 44, borderRadius: 12,
               background: `${color}18`,
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: 22, color, flexShrink: 0,
            }}>
               {icon}
            </div>
         </div>
      </div>
   );
}
