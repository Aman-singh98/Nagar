/**
 * @file AppLayout.jsx
 * @description Root layout for all authenticated pages.
 *
 * Structure:
 *  ┌────────────┬──────────────────────────────────┐
 *  │            │  TopBar                          │
 *  │  Sidebar   ├──────────────────────────────────┤
 *  │            │  <Outlet /> (page content)       │
 *  └────────────┴──────────────────────────────────┘
 */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar  from './TopBar.jsx';

export default function AppLayout() {
   return (
      <div style={{ display: 'flex', minHeight: '100dvh' }}>
         <Sidebar />

         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <TopBar />
            <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)' }}>
               <Outlet />
            </main>
         </div>
      </div>
   );
}
