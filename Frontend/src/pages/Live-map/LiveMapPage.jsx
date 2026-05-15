/**
 * @file LiveMapPage.jsx
 * @description The Live Map page — fully real-time via Socket.IO.
 *
 * Real-time features added (Week 14):
 *  - Socket connection with JWT auth on mount
 *  - Connection status indicator (green/red/yellow dot)
 *  - location:update events update map pins in <1s (replaces 30s polling)
 *  - visit:updated events update center badges instantly
 *  - alert:new events show toast notifications
 *  - Polling falls back to 30s REST if socket disconnects
 *
 * Layout (left → right):
 *   [ Employee sidebar (260px) ] [ Map (flex-1) ] [ Detail panel (360px, slides in) ]
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
   Typography, Input, Button, Badge,
   Tooltip, Switch, Spin, Empty, Avatar, Tag,
} from 'antd';
import {
   ReloadOutlined, SearchOutlined, EnvironmentOutlined, TeamOutlined,
   LoadingOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
   SunOutlined, MoonOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';

// ── Hooks ─────────────────────────────────────────────────────────────────────
import { useLatestLocations, POLL_INTERVAL_MS } from '../../hooks/useLocations.js';
import { useAssignmentDetail } from '../../hooks/useAssignments.js';
import { useMap } from '../../hooks/useMap.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useSocket } from '../../hooks/useSocket.js';
import { useLocationUpdates } from '../../hooks/useLocationUpdates.js';
import { useVisitUpdates } from '../../hooks/useVisitUpdates.js';
import { useAlerts } from '../../hooks/useAlerts.js';

// ── Components ────────────────────────────────────────────────────────────────
import EmployeePinsLayer from './EmployeePinsLayer.jsx';
import RouteCentersLayer from './RouteCentersLayer.jsx';
import AssignmentDetailPanel from './AssignmentDetailPanel.jsx';
import SocketStatusDot from '../../components/ui/SocketStatusDot.jsx';
import './livemap.css';

const { Text } = Typography;

const LEGEND_ITEMS = [
   { label: 'Visited', color: '#10b981' },
   { label: 'In Progress', color: '#f59e0b' },
   { label: 'Pending', color: '#6366f1' },
   { label: 'Missed', color: '#ef4444' },
];

// ─── Poll Countdown ───────────────────────────────────────────────────────────

function PollCountdown({ lastUpdated }) {
   const [pct, setPct] = useState(100);
   const rafRef = useRef(null);
   const startRef = useRef(Date.now());

   useEffect(() => {
      startRef.current = Date.now();
      const tick = () => {
         const elapsed = Date.now() - startRef.current;
         const remaining = Math.max(0, POLL_INTERVAL_MS - elapsed);
         setPct(Math.round((remaining / POLL_INTERVAL_MS) * 100));
         if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
   }, [lastUpdated]);

   return (
      <div className="poll-track">
         <div className="poll-fill" style={{ width: `${pct}%` }} />
      </div>
   );
}

// ─── Sidebar Row ──────────────────────────────────────────────────────────────

function EmployeeSidebarRow({ location, isSelected, onSelect }) {
   const isActive = location.isActive !== false;
   const initials = (location.employeeName ?? '?').charAt(0).toUpperCase();
   const lastSeenText = location.serverTime
      ? format(new Date(location.serverTime), 'hh:mm a')
      : location.updatedAt
         ? format(new Date(location.updatedAt), 'hh:mm a')
         : 'No data';

   return (
      <button onClick={onSelect} className={`sidebar-row${isSelected ? ' sidebar-row--selected' : ''}`}>
         <div className="sidebar-row__avatar-wrap">
            <Avatar
               size={34}
               style={{
                  background: isSelected ? 'var(--accent)' : 'var(--accent-glow)',
                  color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
               }}
            >
               {initials}
            </Avatar>
            <span
               className={`online-dot${isActive ? ' online-dot--active' : ''}`}
               title={isActive ? 'Active' : 'Inactive'}
            />
         </div>
         <div className="sidebar-row__info">
            <Text
               strong ellipsis
               style={{ fontSize: 13, color: isSelected ? 'var(--accent)' : 'var(--text)', display: 'block' }}
            >
               {location.employeeName ?? 'Unknown'}
            </Text>
            <Text style={{ fontSize: 10, color: 'var(--text-2)' }}>{lastSeenText}</Text>
         </div>
         {location.assignmentId && (
            <Tag color="purple" style={{ fontSize: 10, marginLeft: 'auto', flexShrink: 0, lineHeight: '16px' }}>
               On route
            </Tag>
         )}
      </button>
   );
}

// ─── Sidebar Header ───────────────────────────────────────────────────────────

function SidebarHeader({ count, isFetching, onRefresh, lastUpdated, socketStatus }) {
   const { isDark, toggleTheme } = useTheme();

   return (
      <div className="sidebar-header">
         <div className="sidebar-header__top">
            <div className="sidebar-header__title">
               <TeamOutlined style={{ color: 'var(--accent)', fontSize: 15 }} />
               <Text strong style={{ fontSize: 14, color: 'var(--text)' }}>Field Team</Text>
               <Badge
                  count={count}
                  style={{ backgroundColor: 'var(--accent-glow)', color: 'var(--accent)', fontSize: 10, boxShadow: 'none' }}
                  showZero
               />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
               <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
                  <Button
                     size="small" type="text"
                     icon={isDark
                        ? <SunOutlined style={{ fontSize: 13 }} />
                        : <MoonOutlined style={{ fontSize: 13 }} />}
                     onClick={toggleTheme}
                     className="theme-toggle-btn"
                  />
               </Tooltip>
               <Tooltip title="Refresh now">
                  <Button
                     size="small" type="text"
                     icon={<ReloadOutlined spin={isFetching} style={{ fontSize: 13 }} />}
                     onClick={onRefresh}
                     className="refresh-btn"
                  />
               </Tooltip>
            </div>
         </div>

         {/* ── Socket status indicator ─────────────────────────────────────── */}
         <div style={{ padding: '4px 0 2px' }}>
            <SocketStatusDot status={socketStatus} />
         </div>

         <PollCountdown lastUpdated={lastUpdated ? new Date(lastUpdated) : null} />
         <Text style={{ fontSize: 10, marginTop: 3, display: 'block', color: 'var(--text-3)' }}>
            {isFetching
               ? 'Refreshing…'
               : `Updated ${lastUpdated ? format(new Date(lastUpdated), 'hh:mm:ss a') : '—'}`}
         </Text>
      </div>
   );
}

// ─── Sidebar Search ───────────────────────────────────────────────────────────

function SidebarSearch({ search, onSearch, showInactive, onToggleInactive }) {
   return (
      <div className="sidebar-search">
         <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-3)', fontSize: 12 }} />}
            placeholder="Search employee…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            allowClear size="small"
            className="sidebar-search__input"
         />
         <div className="sidebar-search__toggle">
            <Switch size="small" checked={showInactive} onChange={onToggleInactive} style={{ flexShrink: 0 }} />
            <Text style={{ fontSize: 11, color: 'var(--text-2)' }}>
               {showInactive ? 'Showing all' : 'Active only'}
            </Text>
         </div>
      </div>
   );
}

// ─── Sidebar Legend ───────────────────────────────────────────────────────────

function SidebarLegend() {
   return (
      <div className="sidebar-legend">
         <Text style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', display: 'block', marginBottom: 7, color: 'var(--text-3)',
         }}>
            Visit Status
         </Text>
         {LEGEND_ITEMS.map(({ label, color }) => (
            <div key={label} className="legend-item">
               <span className="legend-dot" style={{ background: color }} />
               <Text style={{ fontSize: 11, color: 'var(--text-2)' }}>{label}</Text>
            </div>
         ))}
      </div>
   );
}

// ─── Map Overlays ─────────────────────────────────────────────────────────────

function MapLoadingOverlay() {
   return (
      <div className="map-overlay map-overlay--loading">
         <Spin indicator={<LoadingOutlined style={{ fontSize: 28, color: 'var(--accent)' }} spin />} />
         <Text style={{ color: '#fff', fontSize: 13, marginTop: 10 }}>Loading employee locations…</Text>
      </div>
   );
}

function MapEmptyOverlay() {
   return (
      <div className="map-overlay map-overlay--empty">
         <div className="map-empty-card">
            <EnvironmentOutlined style={{ fontSize: 32, color: 'var(--text-3)', marginBottom: 8 }} />
            <Text strong style={{ fontSize: 15, display: 'block', color: 'var(--text)' }}>
               No location data yet
            </Text>
            <Text style={{ fontSize: 13, marginTop: 4, color: 'var(--text-2)' }}>
               Employees will appear once they start their shifts
            </Text>
         </div>
      </div>
   );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LiveMapPage() {
   const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
   const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
   const [sidebarSearch, setSidebarSearch] = useState('');
   const [showInactive, setShowInactive] = useState(false);
   const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

   // ── Socket connection ──────────────────────────────────────────────────────
   // useRef internally — never useState for socket instance
   const { status: socketStatus } = useSocket();

   // ── Real-time event listeners ──────────────────────────────────────────────
   useLocationUpdates(); // patches React Query cache on location:update
   useVisitUpdates();    // invalidates assignment query on visit:updated
   useAlerts();          // shows toast + updates badge on alert:new

   // ── Data ───────────────────────────────────────────────────────────────────
   const {
      data: locations = [],
      dataUpdatedAt: lastUpdated,
      isFetching,
      refetch,
   } = useLatestLocations();

   const { data: selectedAssignment, isLoading: isDetailLoading } =
      useAssignmentDetail(selectedAssignmentId);

   const { mapRef, flyTo } = useMap('live-map-container');

   // Stable ref — prevents marker re-creation on every update
   const locationsRef = useRef(locations);
   useEffect(() => { locationsRef.current = locations; }, [locations]);

   // ── Handlers ───────────────────────────────────────────────────────────────

   const handleSelectEmployee = useCallback((employeeId, assignmentId) => {
      setSelectedEmployeeId(employeeId);
      setSelectedAssignmentId(assignmentId ?? null);
      const loc = locationsRef.current.find((l) => l.employeeId === employeeId);
      if (loc) flyTo([loc.lat, loc.lng], 15);
   }, [flyTo]);

   const handleCloseDetail = useCallback(() => {
      setSelectedEmployeeId(null);
      setSelectedAssignmentId(null);
   }, []);

   const sidebarLocations = useMemo(() =>
      locations.filter((l) => {
         const matchSearch = !sidebarSearch ||
            l.employeeName?.toLowerCase().includes(sidebarSearch.toLowerCase());
         const matchActive = showInactive || l.isActive !== false;
         return matchSearch && matchActive;
      }),
      [locations, sidebarSearch, showInactive]);

   // ── Render ─────────────────────────────────────────────────────────────────

   return (
      <div className="livemap-root">
         {/* ── Sidebar ───────────────────────────────────────────────────────── */}
         <aside className={`livemap-sidebar${sidebarCollapsed ? ' livemap-sidebar--collapsed' : ''}`}>
            <Tooltip
               title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
               placement="right"
            >
               <button
                  className="sidebar-collapse-btn"
                  onClick={() => setSidebarCollapsed((v) => !v)}
               >
                  {sidebarCollapsed
                     ? <MenuUnfoldOutlined style={{ fontSize: 14 }} />
                     : <MenuFoldOutlined style={{ fontSize: 14 }} />}
               </button>
            </Tooltip>

            {!sidebarCollapsed && (
               <>
                  <SidebarHeader
                     count={sidebarLocations.length}
                     isFetching={isFetching}
                     onRefresh={refetch}
                     lastUpdated={lastUpdated}
                     socketStatus={socketStatus}
                  />
                  <SidebarSearch
                     search={sidebarSearch}
                     onSearch={setSidebarSearch}
                     showInactive={showInactive}
                     onToggleInactive={setShowInactive}
                  />
                  <div className="sidebar-list">
                     {sidebarLocations.length === 0 ? (
                        <Empty
                           image={Empty.PRESENTED_IMAGE_SIMPLE}
                           description={
                              <Text style={{ fontSize: 12, color: 'var(--text-2)' }}>
                                 {isFetching ? 'Loading…' : 'No employees found'}
                              </Text>
                           }
                           style={{ padding: '32px 16px' }}
                        />
                     ) : (
                        sidebarLocations.map((loc, i) => (
                           <div key={loc.employeeId} className="fade-in-row" style={{ animationDelay: `${i * 30}ms` }}>
                              <EmployeeSidebarRow
                                 location={loc}
                                 isSelected={loc.employeeId === selectedEmployeeId}
                                 onSelect={() => handleSelectEmployee(loc.employeeId, loc.assignmentId)}
                              />
                           </div>
                        ))
                     )}
                  </div>
                  <SidebarLegend />
               </>
            )}

            {sidebarCollapsed && (
               <div className="sidebar-collapsed-avatars">
                  {sidebarLocations.slice(0, 6).map((loc) => (
                     <Tooltip key={loc.employeeId} title={loc.employeeName} placement="right">
                        <Avatar
                           size={32}
                           style={{
                              background: loc.employeeId === selectedEmployeeId
                                 ? 'var(--accent)' : 'var(--accent-glow)',
                              color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              border: loc.isActive !== false
                                 ? '2px solid var(--green)' : '2px solid var(--border)',
                           }}
                           onClick={() => handleSelectEmployee(loc.employeeId, loc.assignmentId)}
                        >
                           {(loc.employeeName ?? '?').charAt(0).toUpperCase()}
                        </Avatar>
                     </Tooltip>
                  ))}
               </div>
            )}
         </aside>

         {/* ── Map area ──────────────────────────────────────────────────────── */}
         <div className="livemap-map-area">
            <div id="live-map-container" style={{ width: '100%', height: '100%' }} />

            <EmployeePinsLayer
               mapRef={mapRef}
               locations={locations}
               selectedEmployeeId={selectedEmployeeId}
               onSelectEmployee={handleSelectEmployee}
            />

            {selectedAssignment && (
               <RouteCentersLayer
                  mapRef={mapRef}
                  assignmentDetail={selectedAssignment}
                  fitOnMount
               />
            )}

            {isFetching && locations.length === 0 && <MapLoadingOverlay />}
            {!isFetching && locations.length === 0 && <MapEmptyOverlay />}

            <AssignmentDetailPanel
               assignment={selectedAssignment ?? null}
               isLoading={isDetailLoading}
               onClose={handleCloseDetail}
            />
         </div>
      </div>
   );
}
