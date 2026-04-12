/**
 * @file DashboardPage.jsx
 * @description Production-ready animated dashboard page.
 *
 * UI: Ant Design components + custom CSS animations
 * Data: React Query hooks (useEmployees, useRoutes, useAssignments)
 * Auth: Zustand authStore for user greeting
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Row, Col, Card, Typography, Badge, Avatar, Tag, Progress, Skeleton, Statistic, Timeline, Empty } from 'antd';
import {
   HiUsers, HiMap, HiClipboardList, HiCheckCircle,
   HiClock, HiTrendingUp, HiLightningBolt, HiRefresh,
} from 'react-icons/hi';
import useAuthStore from '../../auth/authStore.js';
import { useEmployees } from '../../hooks/useEmployees.js';
import { useRoutes } from '../../hooks/useRoutes.js';
import { useAssignments } from '../../hooks/useAssignments.js';

const { Title, Text } = Typography;
const today = format(new Date(), 'yyyy-MM-dd');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting() {
   const h = new Date().getHours();
   if (h < 12) return { text: 'Good morning', emoji: '☀️' };
   if (h < 17) return { text: 'Good afternoon', emoji: '👋' };
   return { text: 'Good evening', emoji: '🌙' };
}

const STATUS_CONFIG = {
   pending:     { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Pending',     antColor: 'default'  },
   in_progress: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'In Progress', antColor: 'warning'  },
   completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'Completed',   antColor: 'success'  },
   skipped:     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'Skipped',     antColor: 'error'    },
};

function getInitials(name = '') {
   return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

const AVATAR_COLORS = [
   '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
   '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];
function avatarColor(str = '') {
   let hash = 0;
   for (const c of str) hash = c.charCodeAt(0) + ((hash << 5) - hash);
   return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, loading, suffix }) {
   return (
      <Card
         className="dash-stat-card"
         style={{
            borderRadius: 16,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            overflow: 'hidden',
            position: 'relative',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
         }}
         styles={{ body: { padding: '20px 24px' } }}
         onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = `0 12px 32px -8px ${color}33`;
         }}
         onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
         }}
      >
         {/* Glow accent top bar */}
         <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            borderRadius: '16px 16px 0 0',
         }} />

         <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
               <Text style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {label}
               </Text>
               {loading ? (
                  <Skeleton.Input active size="small" style={{ marginTop: 8, width: 80, display: 'block' }} />
               ) : (
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1, marginTop: 6, fontFamily: 'var(--font-display)' }}>
                     {value ?? '—'}
                     {suffix && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-3)', marginLeft: 4 }}>{suffix}</span>}
                  </div>
               )}
            </div>
            <div style={{
               width: 44, height: 44, borderRadius: 12,
               background: `${color}18`,
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: 22, color,
               flexShrink: 0,
            }}>
               <Icon />
            </div>
         </div>
      </Card>
   );
}

function AssignmentRow({ assignment }) {
   const total   = assignment.visitStatuses?.length ?? 0;
   const visited = assignment.visitStatuses?.filter((v) => v.status === 'visited').length ?? 0;
   const pct     = total > 0 ? Math.round((visited / total) * 100) : 0;
   const cfg     = STATUS_CONFIG[assignment.status] ?? STATUS_CONFIG.pending;
   const name    = assignment.employeeId?.name ?? '—';
   const route   = assignment.routeId?.name   ?? '—';

   return (
      <div className="dash-row" style={{
         display: 'flex', alignItems: 'center', gap: 12,
         padding: '11px 20px',
         borderBottom: '1px solid var(--border)',
         transition: 'background 0.15s',
      }}
         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
         <Avatar size={34} style={{ background: avatarColor(name), fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {getInitials(name)}
         </Avatar>
         <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: 'var(--text)', display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
               {name}
            </Text>
            <Text style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block' }}>
               {route}
            </Text>
         </div>
         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <Tag color={cfg.antColor} style={{ margin: 0, fontSize: 10, fontWeight: 600, borderRadius: 99 }}>
               {cfg.label}
            </Tag>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
               <Progress
                  percent={pct} showInfo={false} size="small"
                  style={{ width: 64, margin: 0 }}
                  strokeColor={cfg.color}
                  trailColor="var(--bg-4)"
               />
               <Text style={{ fontSize: 10, color: cfg.color, fontWeight: 700, minWidth: 28 }}>{pct}%</Text>
            </div>
         </div>
      </div>
   );
}

function EmployeeRow({ employee, index }) {
   const rm = {
      admin:    { label: 'Admin',    color: 'purple' },
      manager:  { label: 'Manager',  color: 'blue'   },
      employee: { label: 'Employee', color: 'cyan'   },
   }[employee.role] ?? { label: employee.role, color: 'default' };

   return (
      <div className="dash-row" style={{
         display: 'flex', alignItems: 'center', gap: 12,
         padding: '10px 20px',
         borderBottom: '1px solid var(--border)',
         transition: 'background 0.15s',
         animationDelay: `${index * 60}ms`,
      }}
         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
         <Avatar size={34} style={{ background: avatarColor(employee.name), fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
            {getInitials(employee.name)}
         </Avatar>
         <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong style={{ fontSize: 13, color: 'var(--text)', display: 'block' }}>{employee.name}</Text>
            <Text style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', display: 'block' }}>
               {employee.email}
            </Text>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Tag color={rm.color} style={{ margin: 0, fontSize: 10, fontWeight: 600, borderRadius: 99 }}>
               {rm.label}
            </Tag>
            <Badge
               status={employee.isActive ? 'success' : 'default'}
               text={<Text style={{ fontSize: 11, color: employee.isActive ? 'var(--green)' : 'var(--text-3)' }}>
                  {employee.isActive ? 'Active' : 'Inactive'}
               </Text>}
            />
         </div>
      </div>
   );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
   const user = useAuthStore((s) => s.user);
   const greeting = getGreeting();

   const { data: empData,   isLoading: empLoading   } = useEmployees({ limit: 6 });
   const { data: routeData, isLoading: routeLoading } = useRoutes({ isActive: 'true', limit: 100 });
   const { data: asgnData,  isLoading: asgnLoading  } = useAssignments({ date: today, limit: 100 });

   const employees  = empData?.employees   ?? [];
   const routes     = routeData?.routes    ?? [];
   const assignments = asgnData?.assignments ?? [];
   const totalEmps  = empData?.pagination?.totalDocs ?? 0;

   const stats = useMemo(() => {
      const completed  = assignments.filter((a) => a.status === 'completed').length;
      const inProgress = assignments.filter((a) => a.status === 'in_progress').length;
      const pending    = assignments.filter((a) => a.status === 'pending').length;
      const completionRate = assignments.length > 0
         ? Math.round((completed / assignments.length) * 100) : 0;
      return { completed, inProgress, pending, completionRate };
   }, [assignments]);

   const isLoading = empLoading || routeLoading || asgnLoading;

   return (
      <>
         {/* ── Inline Styles ── */}
         <style>{`
            @keyframes fadeUp {
               from { opacity: 0; transform: translateY(18px); }
               to   { opacity: 1; transform: translateY(0);    }
            }
            @keyframes fadeIn {
               from { opacity: 0; }
               to   { opacity: 1; }
            }
            @keyframes shimmer {
               0%   { background-position: -400px 0; }
               100% { background-position:  400px 0; }
            }
            .dash-page       { animation: fadeIn 0.3s ease; }
            .dash-stat-card  { animation: fadeUp 0.45s ease both; }
            .dash-stat-card:nth-child(1) { animation-delay: 0.05s; }
            .dash-stat-card:nth-child(2) { animation-delay: 0.12s; }
            .dash-stat-card:nth-child(3) { animation-delay: 0.19s; }
            .dash-stat-card:nth-child(4) { animation-delay: 0.26s; }
            .dash-panel      { animation: fadeUp 0.5s ease 0.3s both; }
            .dash-row        { animation: fadeUp 0.35s ease both; }

            /* Ant overrides for dark theme */
            .dash-card .ant-card-body       { padding: 0 !important; }
            .ant-progress-inner             { background: var(--bg-4) !important; }
            .ant-tag                        { border: none !important; }
            .ant-statistic-content-value    { color: var(--text) !important; font-family: var(--font-display) !important; }
            .ant-statistic-title            { color: var(--text-3) !important; font-size: 12px !important; }
         `}</style>

         <div className="dash-page" style={{ padding: '28px 32px', maxWidth: 1280, minHeight: '100%' }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: 32 }}>
               <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                     <Title level={2} style={{
                        margin: 0, fontFamily: 'var(--font-display)',
                        fontWeight: 800, fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
                        color: 'var(--text)', lineHeight: 1.15,
                     }}>
                        {greeting.text}, {user?.name?.split(' ')[0]} {greeting.emoji}
                     </Title>
                     <Text style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4, display: 'block' }}>
                        {format(new Date(), "EEEE, d MMMM yyyy")} · Here's your operations overview
                     </Text>
                  </div>

                  {/* Live indicator */}
                  <div style={{
                     display: 'flex', alignItems: 'center', gap: 8,
                     padding: '8px 14px', borderRadius: 99,
                     background: 'var(--surface)', border: '1px solid var(--border)',
                     fontSize: 13, color: 'var(--text-2)',
                  }}>
                     <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#10b981',
                        boxShadow: '0 0 0 0 #10b98180',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                        flexShrink: 0,
                     }} />
                     Live · Auto-refreshes
                  </div>
               </div>
            </div>

            {/* ── Stat Cards ── */}
            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
               <Col xs={24} sm={12} lg={6}>
                  <StatCard label="Total Employees" value={totalEmps} icon={HiUsers}          color="#6366f1" loading={empLoading}   />
               </Col>
               <Col xs={24} sm={12} lg={6}>
                  <StatCard label="Active Routes"   value={routes.length} icon={HiMap}        color="#3b82f6" loading={routeLoading} />
               </Col>
               <Col xs={24} sm={12} lg={6}>
                  <StatCard label="Today's Assignments" value={assignments.length} icon={HiClipboardList} color="#f59e0b" loading={asgnLoading} />
               </Col>
               <Col xs={24} sm={12} lg={6}>
                  <StatCard label="Completed Today" value={stats.completed} icon={HiCheckCircle} color="#10b981" loading={asgnLoading} suffix={assignments.length > 0 ? `/ ${assignments.length}` : ''} />
               </Col>
            </Row>

            {/* ── Progress Summary Bar ── */}
            {!asgnLoading && assignments.length > 0 && (
               <Card
                  className="dash-panel"
                  style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 24 }}
                  styles={{ body: { padding: '16px 24px' } }}
               >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                     <Text style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                        Today's Progress
                     </Text>
                     <div style={{ flex: 1, minWidth: 200 }}>
                        <Progress
                           percent={stats.completionRate}
                           strokeColor={{ '0%': '#6366f1', '100%': '#10b981' }}
                           trailColor="var(--bg-4)"
                           format={(p) => <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 700 }}>{p}%</span>}
                        />
                     </div>
                     <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                        {[
                           { label: 'Completed',   value: stats.completed,  color: '#10b981' },
                           { label: 'In Progress', value: stats.inProgress, color: '#f59e0b' },
                           { label: 'Pending',     value: stats.pending,    color: '#6b7280' },
                        ].map(({ label, value, color }) => (
                           <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                              <Text style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}:</Text>
                              <Text strong style={{ fontSize: 12, color: 'var(--text)' }}>{value}</Text>
                           </div>
                        ))}
                     </div>
                  </div>
               </Card>
            )}

            {/* ── Two-column panels ── */}
            <Row gutter={[20, 20]}>

               {/* Today's Assignments */}
               <Col xs={24} lg={14}>
                  <Card
                     className="dash-panel dash-card"
                     style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', height: '100%' }}
                     styles={{ body: { padding: 0 } }}
                  >
                     {/* Card header */}
                     <div style={{
                        padding: '16px 20px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                     }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                           <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245,158,11,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: 16 }}>
                              <HiClipboardList />
                           </div>
                           <Text strong style={{ fontSize: 14, color: 'var(--text)' }}>Today's Assignments</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           {stats.inProgress > 0 && (
                              <Tag color="warning" style={{ borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                                 <HiLightningBolt style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                 {stats.inProgress} active
                              </Tag>
                           )}
                           <Text style={{ fontSize: 12, color: 'var(--text-3)' }}>{format(new Date(), 'd MMM')}</Text>
                        </div>
                     </div>

                     {/* Rows */}
                     {asgnLoading ? (
                        <div style={{ padding: 20 }}>
                           {[...Array(4)].map((_, i) => (
                              <Skeleton key={i} avatar active paragraph={{ rows: 1 }} style={{ marginBottom: 16 }} />
                           ))}
                        </div>
                     ) : assignments.length === 0 ? (
                        <Empty
                           image={Empty.PRESENTED_IMAGE_SIMPLE}
                           description={<Text style={{ color: 'var(--text-3)' }}>No assignments today</Text>}
                           style={{ padding: '48px 0' }}
                        />
                     ) : (
                        <div>
                           {assignments.slice(0, 8).map((a) => (
                              <AssignmentRow key={a._id} assignment={a} />
                           ))}
                           {assignments.length > 8 && (
                              <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                                 <Text style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                                    +{assignments.length - 8} more assignments →
                                 </Text>
                              </div>
                           )}
                        </div>
                     )}
                  </Card>
               </Col>

               {/* Right column */}
               <Col xs={24} lg={10}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                     {/* Quick Stats mini-cards */}
                     <Row gutter={[12, 12]}>
                        <Col span={12}>
                           <Card style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} styles={{ body: { padding: '14px 16px' } }}>
                              <Statistic
                                 title="Completion Rate"
                                 value={stats.completionRate}
                                 suffix="%"
                                 prefix={<HiTrendingUp style={{ color: '#10b981' }} />}
                                 valueStyle={{ color: 'var(--text)', fontSize: 22, fontWeight: 800 }}
                              />
                           </Card>
                        </Col>
                        <Col span={12}>
                           <Card style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} styles={{ body: { padding: '14px 16px' } }}>
                              <Statistic
                                 title="In Progress"
                                 value={stats.inProgress}
                                 prefix={<HiClock style={{ color: '#f59e0b' }} />}
                                 valueStyle={{ color: 'var(--text)', fontSize: 22, fontWeight: 800 }}
                              />
                           </Card>
                        </Col>
                     </Row>

                     {/* Recent Employees */}
                     <Card
                        className="dash-card"
                        style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'var(--surface)', flex: 1 }}
                        styles={{ body: { padding: 0 } }}
                     >
                        <div style={{
                           padding: '16px 20px', borderBottom: '1px solid var(--border)',
                           display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                           <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 16 }}>
                              <HiUsers />
                           </div>
                           <Text strong style={{ fontSize: 14, color: 'var(--text)' }}>Recent Employees</Text>
                        </div>

                        {empLoading ? (
                           <div style={{ padding: 20 }}>
                              {[...Array(4)].map((_, i) => (
                                 <Skeleton key={i} avatar active paragraph={{ rows: 1 }} style={{ marginBottom: 12 }} />
                              ))}
                           </div>
                        ) : employees.length === 0 ? (
                           <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={<Text style={{ color: 'var(--text-3)' }}>No employees yet</Text>}
                              style={{ padding: '32px 0' }}
                           />
                        ) : (
                           employees.slice(0, 5).map((emp, i) => (
                              <EmployeeRow key={emp._id} employee={emp} index={i} />
                           ))
                        )}
                     </Card>

                  </div>
               </Col>
            </Row>
         </div>
      </>
   );
}