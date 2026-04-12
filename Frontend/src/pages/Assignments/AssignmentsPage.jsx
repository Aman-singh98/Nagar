/**
 * @file AssignmentsPage.jsx
 * Assignments list page — date-filtered, animated, mobile-first.
 *
 * Architecture:
 *  - Pure presentational orchestration; all data via custom hooks
 *  - Sub-components extracted by SRP (StatCard, AssignmentsTable, AssignmentCard, etc.)
 *  - No inline style duplication — shared token object + Ant Design tokens
 *  - Mobile: card list  |  ≥768px: full table
 *  - Full dark / light mode via useTheme + Ant Design darkAlgorithm
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays, addDays } from 'date-fns';
import {
   ConfigProvider,
   theme,
   App,
   Layout,
   Typography,
   Button,
   Space,
   DatePicker,
   Tag,
   Table,
   Progress,
   Avatar,
   Tooltip,
   Grid,
   Skeleton,
   Empty,
   Popconfirm,
   Flex,
   Badge,
   Card,
   Segmented,
   Select,
} from 'antd';
import {
   PlusOutlined,
   ReloadOutlined,
   LeftOutlined,
   RightOutlined,
   CalendarOutlined,
   EyeOutlined,
   DeleteOutlined,
   CheckCircleFilled,
   ClockCircleFilled,
   SyncOutlined,
   UnorderedListOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAssignments, useCancelAssignment } from '../../hooks/useAssignments.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import CreateAssignmentModal from './CreateAssignmentModal.jsx';
import './assignments.css';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const TODAY = format(new Date(), 'yyyy-MM-dd');

// ─────────────────────────────────────────────────────────────────────────────
// Color tokens
// Base accent / status colours are mode-agnostic (vivid enough for both).
// Soft / surface colours are computed per-mode by getTokens().
// ─────────────────────────────────────────────────────────────────────────────

const C = {
   accent:   '#6366f1',
   green:    '#10b981',
   amber:    '#f59e0b',
   slate:    '#94a3b8',
   danger:   '#ef4444',
   avatarBg: '#818cf8',
};

/**
 * Returns mode-aware derived tokens.
 * All hardcoded light-only tints live here so they swap on mode change.
 */
function getTokens(isDark) {
   if (isDark) {
      return {
         // icon pill fills — translucent so they sit on any dark surface
         accentSoft:    'rgba(99,102,241,0.18)',
         greenSoft:     'rgba(16,185,129,0.15)',
         amberSoft:     'rgba(245,158,11,0.15)',
         slateSoft:     'rgba(148,163,184,0.12)',

         // status tag  bg / text / border
         tagPendingBg:   'rgba(148,163,184,0.12)',
         tagPendingText: '#94a3b8',
         tagPendingBdr:  'rgba(148,163,184,0.25)',

         tagProgressBg:   'rgba(245,158,11,0.14)',
         tagProgressText: '#fbbf24',
         tagProgressBdr:  'rgba(245,158,11,0.30)',

         tagDoneBg:   'rgba(16,185,129,0.14)',
         tagDoneText: '#34d399',
         tagDoneBdr:  'rgba(16,185,129,0.30)',

         // muted text
         textMuted: '#64748b',
         textSub:   '#94a3b8',

         // date nav group
         navBg:         '#1e1e2e',
         navBorder:     'rgba(255,255,255,0.08)',
         navHoverBg:    'rgba(255,255,255,0.06)',
         navActiveBg:   'rgba(99,102,241,0.20)',
         navActiveText: '#a5b4fc',

         // progress bar empty track
         progressTrail: 'rgba(255,255,255,0.08)',

         // passed to Ant Design ConfigProvider
         antBgContainer: '#1e1e2e',
         antBorder:      'rgba(255,255,255,0.10)',
         antTextSec:     '#64748b',
      };
   }

   return {
      accentSoft:  '#eef2ff',
      greenSoft:   '#d1fae5',
      amberSoft:   '#fef3c7',
      slateSoft:   '#f1f5f9',

      tagPendingBg:   '#f1f5f9',
      tagPendingText: '#475569',
      tagPendingBdr:  '#cbd5e1',

      tagProgressBg:   '#fef3c7',
      tagProgressText: '#92400e',
      tagProgressBdr:  '#fcd34d',

      tagDoneBg:   '#d1fae5',
      tagDoneText: '#065f46',
      tagDoneBdr:  '#6ee7b7',

      textMuted: '#475569',
      textSub:   '#94a3b8',

      navBg:         '#f8fafc',
      navBorder:     '#e2e8f0',
      navHoverBg:    '#ffffff',
      navActiveBg:   '#eef2ff',
      navActiveText: '#4338ca',

      progressTrail: '#e2e8f0',

      antBgContainer: '#ffffff',
      antBorder:      '#e2e8f0',
      antTextSec:     '#475569',
   };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STAT_CONFIG = [
   { key: 'total',       label: 'Total',       icon: <UnorderedListOutlined />, color: C.accent },
   { key: 'completed',   label: 'Completed',   icon: <CheckCircleFilled />,     color: C.green  },
   { key: 'in_progress', label: 'In Progress', icon: <SyncOutlined />,          color: C.amber  },
   { key: 'pending',     label: 'Pending',     icon: <ClockCircleFilled />,     color: C.slate  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function computeCounts(assignments) {
   return assignments.reduce(
      (acc, a) => {
         acc.total++;
         if (a.status === 'completed')   acc.completed++;
         if (a.status === 'in_progress') acc.in_progress++;
         if (a.status === 'pending')     acc.pending++;
         return acc;
      },
      { total: 0, completed: 0, in_progress: 0, pending: 0 },
   );
}

function visitProgress(visitStatuses = [], totalCenters = 0) {
   const total   = totalCenters || visitStatuses.length;
   const visited = visitStatuses.filter((v) => v.status === 'visited').length;
   const pct     = total > 0 ? Math.round((visited / total) * 100) : 0;
   return { visited, total, pct };
}

function employeeInitial(name) {
   return (name ?? '?').charAt(0).toUpperCase();
}

function progressStroke(pct) {
   if (pct === 100) return C.green;
   if (pct > 0)    return C.amber;
   return 'rgba(99,102,241,0.25)';
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components  (all receive `tk` — the mode-aware token object)
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, loading, tk }) {
   const softMap = {
      [C.accent]: tk.accentSoft,
      [C.green]:  tk.greenSoft,
      [C.amber]:  tk.amberSoft,
      [C.slate]:  tk.slateSoft,
   };

   return (
      <Card
         className="stat-card"
         styles={{ body: { padding: '16px 20px' } }}
         style={{ borderTop: `3px solid ${color}` }}
      >
         <Flex align="center" justify="space-between">
            <div>
               <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: tk.textMuted, fontWeight: 600 }}>
                  {label}
               </Text>
               {loading ? (
                  <Skeleton.Input active size="small" style={{ marginTop: 6, height: 28, width: 48 }} />
               ) : (
                  <Title level={3} style={{ margin: 0, lineHeight: 1.2, color }}>
                     {value}
                  </Title>
               )}
            </div>
            <div style={{
               width: 40, height: 40, borderRadius: 10,
               background: softMap[color] ?? tk.slateSoft,
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: 18, color,
            }}>
               {icon}
            </div>
         </Flex>
      </Card>
   );
}

function EmployeeCell({ employee, tk }) {
   return (
      <Flex align="center" gap={8}>
         <Avatar size={32} style={{ background: C.avatarBg, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
            {employeeInitial(employee?.name)}
         </Avatar>
         <div style={{ minWidth: 0 }}>
            <Text strong style={{ display: 'block', fontSize: 13 }}>{employee?.name ?? '—'}</Text>
            <Text style={{ fontSize: 11, color: tk.textSub }} ellipsis>{employee?.email ?? ''}</Text>
         </div>
      </Flex>
   );
}

function VisitProgressCell({ visitStatuses, totalCenters, tk }) {
   const { visited, total, pct } = visitProgress(visitStatuses, totalCenters);
   return (
      <Flex align="center" gap={8} style={{ minWidth: 120 }}>
         <Progress
            percent={pct} size="small" showInfo={false}
            strokeColor={progressStroke(pct)}
            trailColor={tk.progressTrail}
            style={{ flex: 1, marginBottom: 0 }}
         />
         <Text style={{ fontSize: 11, color: tk.textSub, flexShrink: 0 }}>{visited}/{total}</Text>
      </Flex>
   );
}

function StatusTag({ status, tk }) {
   const map = {
      pending:     { bg: tk.tagPendingBg,  text: tk.tagPendingText,  bdr: tk.tagPendingBdr,  label: 'Pending',     icon: <ClockCircleFilled style={{ color: C.slate }} /> },
      in_progress: { bg: tk.tagProgressBg, text: tk.tagProgressText, bdr: tk.tagProgressBdr, label: 'In Progress', icon: <SyncOutlined spin style={{ color: C.amber }} /> },
      completed:   { bg: tk.tagDoneBg,     text: tk.tagDoneText,     bdr: tk.tagDoneBdr,     label: 'Completed',   icon: <CheckCircleFilled style={{ color: C.green }} /> },
   };
   const s = map[status] ?? map.pending;
   return (
      <Tag icon={s.icon} style={{ fontSize: 12, fontWeight: 500, background: s.bg, color: s.text, borderColor: s.bdr, borderRadius: 6 }}>
         {s.label}
      </Tag>
   );
}

function AssignmentCard({ assignment, index, onView, onCancel, cancelPending, tk }) {
   const { visited, total, pct } = visitProgress(
      assignment.visitStatuses,
      assignment.routeId?.centers?.length,
   );
   return (
      <Card
         className="assignment-card fade-up"
         style={{ animationDelay: `${index * 40}ms`, borderLeft: `3px solid ${C.accent}` }}
         styles={{ body: { padding: '14px 16px' } }}
         actions={[
            <Tooltip title="View on map" key="view">
               <Button type="text" size="small" icon={<EyeOutlined style={{ color: C.accent }} />} onClick={() => onView(assignment._id)} />
            </Tooltip>,
            <Popconfirm title="Cancel this assignment?" onConfirm={() => onCancel(assignment._id)} key="cancel">
               <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={cancelPending === assignment._id} />
            </Popconfirm>,
         ]}
      >
         <Flex gap={10} align="flex-start">
            <Avatar size={36} style={{ background: C.avatarBg, fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
               {employeeInitial(assignment.employeeId?.name)}
            </Avatar>
            <div style={{ flex: 1, minWidth: 0 }}>
               <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
                  <Text strong style={{ fontSize: 13 }}>{assignment.employeeId?.name ?? '—'}</Text>
                  <StatusTag status={assignment.status} tk={tk} />
               </Flex>
               <Text style={{ fontSize: 11, color: tk.textSub }} ellipsis>{assignment.employeeId?.email}</Text>
               <Flex align="center" gap={6} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 12 }}>{assignment.routeId?.name ?? '—'}</Text>
                  <Badge count={`${total} ctr`} style={{ fontSize: 10, background: tk.accentSoft, color: C.accent, boxShadow: 'none' }} />
               </Flex>
               <Flex align="center" gap={8} style={{ marginTop: 8 }}>
                  <Progress
                     percent={pct} size="small" showInfo={false}
                     strokeColor={progressStroke(pct)} trailColor={tk.progressTrail}
                     style={{ flex: 1, marginBottom: 0 }}
                  />
                  <Text style={{ fontSize: 11, color: tk.textSub }}>{visited}/{total}</Text>
               </Flex>
            </div>
         </Flex>
      </Card>
   );
}

function buildColumns({ onView, onCancel, cancelPending, tk }) {
   return [
      {
         title: '#', key: 'index', width: 48,
         render: (_, __, i) => <Text style={{ fontSize: 12, color: tk.textSub }}>{i + 1}</Text>,
      },
      {
         title: 'Employee', key: 'employee',
         render: (_, a) => <EmployeeCell employee={a.employeeId} tk={tk} />,
      },
      {
         title: 'Route', key: 'route',
         render: (_, a) => (
            <div>
               <Text strong style={{ fontSize: 13 }}>{a.routeId?.name ?? '—'}</Text>
               <br />
               <Text style={{ fontSize: 11, color: tk.textSub }}>{a.routeId?.centers?.length ?? 0} centers</Text>
            </div>
         ),
      },
      {
         title: 'Status', key: 'status', width: 130,
         render: (_, a) => <StatusTag status={a.status} tk={tk} />,
      },
      {
         title: 'Progress', key: 'progress', width: 160,
         render: (_, a) => (
            <VisitProgressCell visitStatuses={a.visitStatuses} totalCenters={a.routeId?.centers?.length} tk={tk} />
         ),
      },
      {
         title: 'Date', key: 'date', width: 120,
         render: (_, a) => (
            <Text style={{ fontSize: 12, color: tk.textSub, whiteSpace: 'nowrap' }}>
               {a.date ? format(parseISO(a.date), 'dd MMM yyyy') : '—'}
            </Text>
         ),
      },
      {
         title: 'Actions', key: 'actions', width: 96,
         render: (_, a) => (
            <Space size={4}>
               <Tooltip title="View on map">
                  <Button
                     size="small" type="default"
                     icon={<EyeOutlined style={{ color: C.accent }} />}
                     onClick={() => onView(a._id)}
                     style={{ borderColor: C.accent, color: C.accent }}
                  />
               </Tooltip>
               <Popconfirm title="Cancel this assignment?" onConfirm={() => onCancel(a._id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} loading={cancelPending === a._id} />
               </Popconfirm>
            </Space>
         ),
      },
   ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
   const navigate   = useNavigate();
   const screens    = useBreakpoint();
   const isMobile   = !screens.md;
   const { isDark } = useTheme();
   const tk         = getTokens(isDark);

   const [date, setDate]                 = useState(TODAY);
   const [statusFilter, setStatusFilter] = useState('all');
   const [showCreate, setShowCreate]     = useState(false);
   const [cancelPending, setCancelPending] = useState(null);

   const { data, isLoading, refetch, isFetching } = useAssignments({ date });
   const assignments = useMemo(() => data?.assignments ?? [], [data]);
   const filtered    = useMemo(
      () => statusFilter === 'all' ? assignments : assignments.filter((a) => a.status === statusFilter),
      [assignments, statusFilter],
   );
   const counts = useMemo(() => computeCounts(assignments), [assignments]);

   const cancel = useCancelAssignment();

   const handleCancel = useCallback(
      (id) => {
         setCancelPending(id);
         cancel.mutate(id, { onSettled: () => setCancelPending(null) });
      },
      [cancel],
   );

   const handleView = useCallback(
      (id) => navigate(`/map?assignmentId=${id}`),
      [navigate],
   );

   const tableColumns = useMemo(
      () => buildColumns({ onView: handleView, onCancel: handleCancel, cancelPending, tk }),
      [handleView, handleCancel, cancelPending, tk],
   );

   const dateLabel = date === TODAY ? 'Today' : format(parseISO(date), 'dd MMM yyyy');

   return (
      <ConfigProvider
         theme={{
            // ← this is the critical fix: switch algorithm with isDark
            algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
            token: {
               colorPrimary:       C.accent,
               colorSuccess:       C.green,
               colorWarning:       C.amber,
               colorError:         C.danger,
               borderRadius:       8,
               colorBgContainer:   tk.antBgContainer,
               colorBorder:        tk.antBorder,
               colorTextSecondary: tk.antTextSec,
            },
         }}
      >
         <App>
            <Layout.Content className={`assignments-page${isDark ? ' assignments-page--dark' : ''}`}>

               {/* ── Header ── */}
               <Flex justify="space-between" align="flex-start" wrap="wrap" gap={12} className="page-header">
                  <div>
                     <Title level={3} style={{ margin: 0 }}>Assignments</Title>
                     <Text style={{ fontSize: 13, color: tk.textMuted }}>
                        Track employee route assignments and visit progress
                     </Text>
                  </div>
                  <Space wrap>
                     <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()}>
                        Refresh
                     </Button>
                     <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreate(true)}>
                        New Assignment
                     </Button>
                  </Space>
               </Flex>

               {/* ── Stats ── */}
               <div className="stats-grid">
                  {STAT_CONFIG.map((s, i) => (
                     <div key={s.key} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                        <StatCard label={s.label} value={counts[s.key]} icon={s.icon} color={s.color} loading={isLoading} tk={tk} />
                     </div>
                  ))}
               </div>

               {/* ── Date + Status toolbar ── */}
               <DateFilterBar
                  date={date} onDateChange={setDate}
                  statusFilter={statusFilter} onStatusChange={setStatusFilter}
                  counts={counts} isMobile={isMobile} tk={tk}
               />

               {/* ── Content ── */}
               <Card className="content-card fade-up" styles={{ body: { padding: isMobile ? 12 : 0 } }}>
                  {isLoading ? (
                     <LoadingSkeleton isMobile={isMobile} />
                  ) : filtered.length === 0 ? (
                     <EmptyAssignments dateLabel={dateLabel} onNew={() => setShowCreate(true)} />
                  ) : isMobile ? (
                     <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        {filtered.map((a, i) => (
                           <AssignmentCard key={a._id} assignment={a} index={i} onView={handleView} onCancel={handleCancel} cancelPending={cancelPending} tk={tk} />
                        ))}
                     </Space>
                  ) : (
                     <Table
                        dataSource={filtered} columns={tableColumns}
                        rowKey="_id" pagination={false} size="middle"
                        rowClassName={() => 'assignment-row'} scroll={{ x: 720 }}
                     />
                  )}
               </Card>

               {/* ── Footer ── */}
               {!isLoading && filtered.length > 0 && (
                  <Text style={{ fontSize: 12, color: tk.textSub, display: 'block', marginTop: 8 }}>
                     Showing {filtered.length} assignment{filtered.length !== 1 ? 's' : ''} for {dateLabel}
                  </Text>
               )}

               <CreateAssignmentModal open={showCreate} onClose={() => setShowCreate(false)} selectedDate={date} />

            </Layout.Content>
         </App>
      </ConfigProvider>
   );
}

// ─────────────────────────────────────────────────────────────────────────────
// DateFilterBar
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_SEGMENT_OPTIONS = [
   { label: 'All',         value: 'all' },
   { label: 'Pending',     value: 'pending' },
   { label: 'In Progress', value: 'in_progress' },
   { label: 'Completed',   value: 'completed' },
];

function DateFilterBar({ date, onDateChange, statusFilter, onStatusChange, counts, isMobile, tk }) {
   const isToday = date === TODAY;

   const segmentOptions = STATUS_SEGMENT_OPTIONS.map((opt) => ({
      label: (
         <span style={{ fontSize: 12 }}>
            {opt.label}
            {opt.value !== 'all' && (
               <Badge
                  count={counts[opt.value] ?? 0}
                  style={{ marginLeft: 5, fontSize: 10, height: 16, lineHeight: '16px', minWidth: 16, boxShadow: 'none' }}
                  color={opt.value === 'completed' ? C.green : opt.value === 'in_progress' ? C.amber : C.slate}
               />
            )}
         </span>
      ),
      value: opt.value,
   }));

   return (
      <div className="date-filter-bar">
         <div className="date-nav-group" style={{ background: tk.navBg, borderColor: tk.navBorder }}>
            <Button
               className="nav-arrow"
               icon={<LeftOutlined style={{ fontSize: 11 }} />}
               onClick={() => onDateChange(format(subDays(parseISO(date), 1), 'yyyy-MM-dd'))}
            />
            <Button
               className={`today-btn${isToday ? ' today-btn--active' : ''}`}
               icon={<CalendarOutlined />}
               onClick={() => onDateChange(TODAY)}
               style={isToday ? { background: tk.navActiveBg, color: tk.navActiveText } : {}}
            >
               Today
            </Button>
            <DatePicker
               value={dayjs(date)}
               onChange={(d) => d && onDateChange(d.format('YYYY-MM-DD'))}
               format="DD MMM YYYY"
               allowClear={false}
               inputReadOnly
               className="date-picker-inline"
               suffixIcon={null}
            />
            <Button
               className="nav-arrow"
               icon={<RightOutlined style={{ fontSize: 11 }} />}
               onClick={() => onDateChange(format(addDays(parseISO(date), 1), 'yyyy-MM-dd'))}
            />
         </div>

         {isMobile ? (
            <Select value={statusFilter} onChange={onStatusChange} options={STATUS_SEGMENT_OPTIONS} style={{ width: '100%' }} size="middle" />
         ) : (
            <Segmented value={statusFilter} onChange={onStatusChange} options={segmentOptions} className="status-segmented" />
         )}
      </div>
   );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility sub-components
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton({ isMobile }) {
   if (isMobile) {
      return (
         <Space direction="vertical" style={{ width: '100%', padding: 12 }} size={12}>
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} active avatar paragraph={{ rows: 2 }} />)}
         </Space>
      );
   }
   return <div style={{ padding: '24px 16px' }}><Skeleton active paragraph={{ rows: 6 }} /></div>;
}

function EmptyAssignments({ dateLabel, onNew }) {
   return (
      <Empty
         image={Empty.PRESENTED_IMAGE_SIMPLE}
         description={<span>No assignments for <strong>{dateLabel}</strong></span>}
         style={{ padding: '48px 0' }}
      >
         <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>New Assignment</Button>
      </Empty>
   );
}
