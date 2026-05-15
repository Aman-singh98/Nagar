/**
 * @file Badge.jsx
 * @description Inline pill badge for status, role, and label display.
 *
 * @param {string} label  - Text content
 * @param {string} color  - Text / border color (CSS value)
 * @param {string} bg     - Background color (CSS value)
 * @param {string} [dot]  - Optional leading dot color
 */
export default function Badge({ label, color, bg, dot }) {
   return (
      <span style={{
         display: 'inline-flex', alignItems: 'center', gap: 5,
         padding: '3px 10px', borderRadius: 99,
         fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
         color, background: bg,
      }}>
         {dot && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
         )}
         {label}
      </span>
   );
}
