/**
 * @file EmptyState.jsx
 * @description Centered empty state with icon, title, description, and optional CTA.
 */
export default function EmptyState({ icon, title, description, action }) {
   return (
      <div style={{
         display: 'flex', flexDirection: 'column',
         alignItems: 'center', justifyContent: 'center',
         padding: '64px 24px', gap: 12, textAlign: 'center',
      }}>
         {icon && <div style={{ fontSize: 48, marginBottom: 4, opacity: 0.7 }}>{icon}</div>}
         <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', margin: 0 }}>{title}</p>
         {description && (
            <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 300, margin: 0 }}>{description}</p>
         )}
         {action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
   );
}
