/**
 * @file AssignmentDetailPanel.jsx
 * Slide-in panel that shows the route center breakdown for a selected employee.
 *
 * Props:
 *   assignment  — AssignmentDetail | null   (null = hidden)
 *   isLoading   — boolean                   (shows skeleton while fetching)
 *   onClose     — () => void
 *
 * AssignmentDetail shape (from mapStore / API):
 * {
 *   _id:           string
 *   employeeName:  string
 *   date:          string          (ISO)
 *   status:        string          ('pending' | 'in_progress' | 'completed' | 'missed')
 *   routeId: {
 *     name:    string
 *     centers: Array<{
 *       _id:    string
 *       name:   string
 *       order:  number
 *       lat:    number
 *       lng:    number
 *       radius: number
 *     }>
 *   }
 *   visitStatuses: Array<{
 *     centerId: string
 *     status:   'pending' | 'visited' | 'missed' | 'in_progress' | 'skipped'
 *     visitedAt?: string   (ISO)
 *   }>
 * }
 */

import { useMemo } from 'react';
import { Typography, Button, Spin, Progress, Tag, Tooltip } from 'antd';
import { CloseOutlined, LoadingOutlined, EnvironmentOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { STATUS_COLORS, STATUS_LABELS } from './mapUtils.js';
import './livemap-panel.css';

const { Text } = Typography;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns Ant Design Tag color string for a visit status */
function statusTagColor(status) {
   const map = {
      visited:     'success',
      in_progress: 'processing',
      pending:     'default',
      missed:      'error',
      skipped:     'warning',
   };
   return map[status] ?? 'default';
}

/** Returns an icon element for a visit status */
function StatusIcon({ status }) {
   if (status === 'visited')     return <CheckCircleOutlined style={{ color: STATUS_COLORS.visited }} />;
   if (status === 'in_progress') return <ClockCircleOutlined style={{ color: STATUS_COLORS.in_progress }} />;
   if (status === 'missed')      return <CloseCircleOutlined style={{ color: STATUS_COLORS.missed }} />;
   if (status === 'skipped')     return <CloseCircleOutlined style={{ color: STATUS_COLORS.skipped }} />;
   return <EnvironmentOutlined style={{ color: STATUS_COLORS.pending }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * @param {{
 *   assignment: object | null;
 *   isLoading:  boolean;
 *   onClose:    () => void;
 * }} props
 */
export default function AssignmentDetailPanel({ assignment, isLoading, onClose }) {
   const isVisible = isLoading || !!assignment;

   // Build an enriched list of centers merged with their visit status
   const centers = useMemo(() => {
      if (!assignment) return [];

      const rawCenters   = assignment.routeId?.centers ?? [];
      const visitStatuses = assignment.visitStatuses ?? [];

      const statusMap = new Map(
         visitStatuses.map((vs) => [String(vs.centerId), vs]),
      );

      return [...rawCenters]
         .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
         .map((c) => {
            const vs = statusMap.get(String(c._id));
            return {
               ...c,
               status:    vs?.status    ?? 'pending',
               visitedAt: vs?.visitedAt ?? null,
            };
         });
   }, [assignment]);

   // Progress percentage — visited / total
   const progressPct = useMemo(() => {
      if (!centers.length) return 0;
      const done = centers.filter((c) => c.status === 'visited').length;
      return Math.round((done / centers.length) * 100);
   }, [centers]);

   // Summary counts per status
   const counts = useMemo(() => {
      const result = { visited: 0, in_progress: 0, pending: 0, missed: 0, skipped: 0 };
      centers.forEach((c) => { if (c.status in result) result[c.status]++; });
      return result;
   }, [centers]);

   return (
      <div className={`detail-panel${isVisible ? ' detail-panel--visible' : ''}`}>

         {/* ── Header ──────────────────────────────────────────────────────── */}
         <div className="detail-panel__header" style={{ borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
               <Text strong style={{ fontSize: 14, lineHeight: 1.3 }} ellipsis>
                  {isLoading ? 'Loading…' : (assignment?.routeId?.name ?? 'Route Details')}
               </Text>
               {!isLoading && assignment && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                     {assignment.employeeName ?? ''}
                     {assignment.date
                        ? ` · ${format(new Date(assignment.date), 'dd MMM yyyy')}`
                        : ''}
                  </Text>
               )}
            </div>

            <Button
               type="text"
               size="small"
               icon={<CloseOutlined />}
               onClick={onClose}
               style={{ flexShrink: 0, color: '#8c8c8c' }}
            />
         </div>

         {/* ── Loading spinner ──────────────────────────────────────────────── */}
         {isLoading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color: '#1677ff' }} spin />} />
            </div>
         )}

         {/* ── Content (only when data is ready) ───────────────────────────── */}
         {!isLoading && assignment && (
            <>
               {/* Progress section */}
               <div className="detail-panel__progress">
                  {/* Overall status tag + progress bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                     <Tag color={statusTagColor(assignment.status)} style={{ fontSize: 11, margin: 0 }}>
                        {STATUS_LABELS[assignment.status] ?? assignment.status}
                     </Tag>
                     <Text type="secondary" style={{ fontSize: 11 }}>
                        {centers.filter((c) => c.status === 'visited').length} / {centers.length} visited
                     </Text>
                  </div>

                  <Progress
                     percent={progressPct}
                     strokeColor={progressPct === 100 ? '#10b981' : '#1677ff'}
                     trailColor="#f0f0f0"
                     size="small"
                     showInfo={false}
                     style={{ margin: 0 }}
                  />

                  {/* Mini summary row */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                     {Object.entries(counts).map(([status, count]) =>
                        count > 0 ? (
                           <Tooltip key={status} title={STATUS_LABELS[status] ?? status}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                 <span
                                    style={{
                                       width: 8, height: 8,
                                       borderRadius: '50%',
                                       background: STATUS_COLORS[status] ?? '#d9d9d9',
                                       flexShrink: 0,
                                    }}
                                 />
                                 <Text style={{ fontSize: 11 }}>{count}</Text>
                              </div>
                           </Tooltip>
                        ) : null
                     )}
                  </div>
               </div>

               {/* Centers list */}
               <div className="detail-panel__list">
                  {centers.length === 0 ? (
                     <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>No centers on this route</Text>
                     </div>
                  ) : (
                     centers.map((center) => (
                        <div key={center._id} className="center-row">
                           {/* Order bubble */}
                           <div
                              className="center-row__order"
                              style={{
                                 background: `${STATUS_COLORS[center.status] ?? STATUS_COLORS.pending}18`,
                                 color: STATUS_COLORS[center.status] ?? STATUS_COLORS.pending,
                              }}
                           >
                              {center.order}
                           </div>

                           {/* Info */}
                           <div className="center-row__info">
                              <Text
                                 strong
                                 ellipsis
                                 style={{ fontSize: 12, display: 'block' }}
                              >
                                 {center.name}
                              </Text>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                 <StatusIcon status={center.status} />
                                 <Text type="secondary" style={{ fontSize: 11 }}>
                                    {STATUS_LABELS[center.status] ?? center.status}
                                    {center.visitedAt
                                       ? ` · ${format(new Date(center.visitedAt), 'hh:mm a')}`
                                       : ''}
                                 </Text>
                              </div>
                           </div>

                           {/* Status tag */}
                           <Tag
                              color={statusTagColor(center.status)}
                              style={{ fontSize: 10, flexShrink: 0, lineHeight: '18px' }}
                           >
                              {STATUS_LABELS[center.status] ?? center.status}
                           </Tag>
                        </div>
                     ))
                  )}
               </div>

               {/* Footer — summary line */}
               <div className="detail-panel__footer">
                  <Text type="secondary" style={{ fontSize: 11 }}>
                     {progressPct === 100
                        ? '✓ All centers visited'
                        : `${centers.length - centers.filter((c) => c.status === 'visited').length} center(s) remaining`}
                  </Text>
               </div>
            </>
         )}
      </div>
   );
}
