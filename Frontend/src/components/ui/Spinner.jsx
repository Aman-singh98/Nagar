/**
 * @file Spinner.jsx
 * @description Accessible loading spinner.
 *
 * @param {number} [size=20]  - Diameter in pixels
 * @param {string} [color]    - Border color (default: var(--accent))
 */
export default function Spinner({ size = 20, color = 'var(--accent)' }) {
   return (
      <span
         role="status"
         aria-label="Loading"
         style={{
            display: 'inline-block',
            width: size, height: size,
            borderRadius: '50%',
            border: '2px solid var(--border-2)',
            borderTopColor: color,
            animation: 'spin 0.65s linear infinite',
         }}
      />
   );
}
