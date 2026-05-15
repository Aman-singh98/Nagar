/**
 * @file components/ui/SocketStatusDot.jsx
 * @description Real-time connection status indicator.
 *
 * Shows a small colored dot with label:
 *   🟢 green  = connected
 *   🔴 red    = disconnected
 *   🟡 yellow = reconnecting (pulsing)
 *
 * Usage:
 *   <SocketStatusDot status={status} />
 */

/**
 * @param {{ status: 'connected' | 'disconnected' | 'reconnecting' }} props
 */
const SocketStatusDot = ({ status }) => {
   const config = {
      connected: {
         color: '#10b981',
         label: 'Live',
         pulse: false,
      },
      disconnected: {
         color: '#ef4444',
         label: 'Offline',
         pulse: false,
      },
      reconnecting: {
         color: '#f59e0b',
         label: 'Reconnecting',
         pulse: true,
      },
   };

   const { color, label, pulse } = config[status] ?? config.disconnected;

   return (
      <div style={{
         display: 'flex',
         alignItems: 'center',
         gap: '6px',
         fontSize: '12px',
         fontWeight: 500,
         color: '#94a3b8',
      }}>
         <div style={{
            position: 'relative',
            width: '8px',
            height: '8px',
         }}>
            {/* Pulse ring for reconnecting state */}
            {pulse && (
               <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  borderRadius: '50%',
                  background: `${color}44`,
                  animation: 'socket-pulse 1.4s ease-out infinite',
               }} />
            )}
            <div style={{
               width: '8px',
               height: '8px',
               borderRadius: '50%',
               background: color,
               boxShadow: `0 0 6px ${color}88`,
            }} />
         </div>
         <span style={{ color }}>{label}</span>

         {/* Inject keyframe once */}
         <style>{`
        @keyframes socket-pulse {
          0%   { transform: scale(0.8); opacity: 0.8; }
          70%  { transform: scale(2);   opacity: 0; }
          100% { transform: scale(2);   opacity: 0; }
        }
      `}</style>
      </div>
   );
};

export default SocketStatusDot;
