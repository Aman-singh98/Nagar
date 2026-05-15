/**
 * @file pages/Reports/ReportsPage.jsx
 * @description Daily and weekly reports page with date range filter. (F081, F082, F088)
 *
 * @module pages/Reports/ReportsPage
 */

import { useState } from 'react';
import {
   Select, DatePicker, Card, Typography, Table, Tag,
   Progress, Statistic, Row, Col, Tabs, Empty,
} from 'antd';
import {
   NodeIndexOutlined, ClockCircleOutlined,
   CheckCircleOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { format, startOfWeek } from 'date-fns';
import dayjs from 'dayjs';
import { useEmployees } from '../../hooks/useEmployees.js';
import { useDailyReport, useWeeklyReport } from '../../hooks/useReports.js';
import { downloadPdfReport } from '../../utils/downloadPdfReport.js';
import { exportToCSV, flattenForCSV } from '../../utils/exportToCSV.js';

const { Text, Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDistance = (m) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;

const STATUS_TAG = {
   completed: { color: 'success', label: 'Completed' },
   in_progress: { color: 'warning', label: 'In Progress' },
   pending: { color: 'default', label: 'Pending' },
   skipped: { color: 'error', label: 'Skipped' },
};

// ─── Daily Report Tab ─────────────────────────────────────────────────────────

function DailyTab() {
   const [dateRange, setDateRange] = useState(null);
   const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [useRange, setUseRange] = useState(false);
   const [employeeId, setEmployeeId] = useState(null);

   const { data: empData } = useEmployees({ limit: 100 });
   const employees = empData?.employees ?? [];

   const params = useRange && dateRange
      ? { startDate: dateRange[0], endDate: dateRange[1], employeeId }
      : { date: singleDate, employeeId };

   const { data, isLoading } = useDailyReport({ ...params, enabled: true });
   const report = data?.report ?? [];
   const totals = data?.totals ?? {};

   const columns = [
      {
         title: 'Employee',
         dataIndex: 'employeeName',
         render: (name) => <Text strong style={{ color: 'var(--text)' }}>{name}</Text>,
      },
      {
         title: 'Route',
         dataIndex: 'routeName',
         render: (r) => <Text style={{ color: 'var(--text-2)' }}>{r}</Text>,
      },
      {
         title: 'Status',
         dataIndex: 'status',
         render: (s) => {
            const cfg = STATUS_TAG[s] ?? STATUS_TAG.pending;
            return <Tag color={cfg.color}>{cfg.label}</Tag>;
         },
      },
      {
         title: 'Centers',
         render: (_, row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <Progress
                  percent={row.completionPct} showInfo={false}
                  style={{ width: 60, margin: 0 }} size="small"
                  strokeColor="#6366f1"
               />
               <Text style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  {row.centersVisited}/{row.centersTotal}
               </Text>
            </div>
         ),
      },
      {
         title: 'Distance',
         dataIndex: 'distanceMeters',
         render: (m) => <Text style={{ color: 'var(--text)' }}>{formatDistance(m)}</Text>,
         sorter: (a, b) => a.distanceMeters - b.distanceMeters,
      },
      {
         title: 'Hours',
         dataIndex: 'hoursWorked',
         render: (h) => <Text style={{ color: 'var(--text)' }}>{h}h</Text>,
         sorter: (a, b) => a.hoursWorked - b.hoursWorked,
      },
   ];

   return (
      <div>
         {/* Filters */}
         <Card
            style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 20 }}
            styles={{ body: { padding: '16px 20px' } }}
         >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
               <Select
                  placeholder="All employees"
                  style={{ width: 200 }}
                  value={employeeId}
                  onChange={setEmployeeId}
                  allowClear
                  showSearch
                  optionFilterProp="children"
               >
                  {employees.map((e) => (
                     <Option key={e._id} value={e._id}>{e.name}</Option>
                  ))}
               </Select>

               {!useRange ? (
                  <DatePicker
                     value={singleDate ? dayjs(singleDate) : null}
                     onChange={(_, d) => setSingleDate(d)}
                     style={{ width: 160 }}
                  />
               ) : (
                  <RangePicker
                     onChange={(_, [s, e]) => setDateRange([s, e])}
                     style={{ width: 260 }}
                  />
               )}

               <Tag
                  color={useRange ? 'purple' : 'default'}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setUseRange((v) => !v)}
               >
                  {useRange ? 'Date Range ON' : 'Use Date Range'}
               </Tag>
            </div>
         </Card>

         {/* Summary cards */}
         {report.length > 0 && (
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
               {[
                  { label: 'Assignments', value: totals.assignments, icon: <BarChartOutlined />, color: '#6366f1' },
                  { label: 'Completed', value: totals.completed, icon: <CheckCircleOutlined />, color: '#10b981' },
                  { label: 'Total Distance', value: formatDistance(totals.totalDistanceM ?? 0), icon: <NodeIndexOutlined />, color: '#3b82f6' },
                  { label: 'Avg Hours', value: `${totals.avgHoursWorked ?? 0}h`, icon: <ClockCircleOutlined />, color: '#f59e0b' },
               ].map(({ label, value, icon, color }) => (
                  <Col key={label} xs={12} sm={6}>
                     <Card style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }} styles={{ body: { padding: '12px 16px' } }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                           <span style={{ color, fontSize: 18 }}>{icon}</span>
                           <div>
                              <Text style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>{label}</Text>
                              <Text strong style={{ fontSize: 16, color: 'var(--text)' }}>{value}</Text>
                           </div>
                        </div>
                     </Card>
                  </Col>
               ))}
            </Row>
         )}

         {/* Table */}
         <Card style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} styles={{ body: { padding: 0 } }}>
            <Table
               dataSource={report}
               columns={columns}
               rowKey="assignmentId"
               loading={isLoading}
               pagination={{ pageSize: 20, showSizeChanger: false }}
               locale={{ emptyText: <Empty description="No data for selected filters" style={{ padding: 40 }} /> }}
               style={{ borderRadius: 12, overflow: 'hidden' }}
            />
         </Card>
      </div>
   );
}

// ─── Weekly Report Tab ────────────────────────────────────────────────────────

function WeeklyTab() {
   const [employeeId, setEmployeeId] = useState(null);
   const [weekStart, setWeekStart] = useState(
      format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
   );

   const { data: empData } = useEmployees({ limit: 100 });
   const employees = empData?.employees ?? [];

   const { data, isLoading } = useWeeklyReport({ employeeId, weekStart, enabled: !!employeeId });
   const breakdown = data?.dailyBreakdown ?? [];
   const totals = data?.totals ?? {};

   const columns = [
      {
         title: 'Date',
         dataIndex: 'date',
         render: (d) => <Text style={{ color: 'var(--text)' }}>{format(new Date(d), 'EEE, d MMM')}</Text>,
      },
      {
         title: 'Route',
         dataIndex: 'routeName',
         render: (r) => <Text style={{ color: 'var(--text-2)' }}>{r}</Text>,
      },
      {
         title: 'Status',
         dataIndex: 'status',
         render: (s) => {
            const cfg = STATUS_TAG[s] ?? STATUS_TAG.pending;
            return <Tag color={cfg.color}>{cfg.label}</Tag>;
         },
      },
      {
         title: 'Centers',
         render: (_, row) => <Text style={{ color: 'var(--text)' }}>{row.centersVisited}/{row.centersTotal}</Text>,
      },
      {
         title: 'Distance',
         dataIndex: 'distanceMeters',
         render: (m) => <Text style={{ color: 'var(--text)' }}>{formatDistance(m)}</Text>,
      },
      {
         title: 'Hours',
         dataIndex: 'hoursWorked',
         render: (h) => <Text style={{ color: 'var(--text)' }}>{h}h</Text>,
      },
   ];

   return (
      <div>
         <Card
            style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 20 }}
            styles={{ body: { padding: '16px 20px' } }}
         >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
               <Select
                  placeholder="Select employee"
                  style={{ width: 220 }}
                  value={employeeId}
                  onChange={setEmployeeId}
                  showSearch
                  optionFilterProp="children"
               >
                  {employees.map((e) => (
                     <Option key={e._id} value={e._id}>{e.name}</Option>
                  ))}
               </Select>

               <DatePicker
                  picker="week"
                  value={weekStart ? dayjs(weekStart) : null}
                  onChange={(_, d) => setWeekStart(d)}
                  style={{ width: 180 }}
               />
            </div>
         </Card>

         {/* Weekly totals */}
         {breakdown.length > 0 && (
            <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
               {[
                  { label: 'Days Worked', value: totals.daysWorked, color: '#6366f1' },
                  { label: 'Total Distance', value: formatDistance(totals.totalDistanceM ?? 0), color: '#3b82f6' },
                  { label: 'Total Hours', value: `${totals.totalHoursWorked ?? 0}h`, color: '#f59e0b' },
                  { label: 'Centers Visited', value: `${totals.totalCentersVisited ?? 0}/${totals.totalCentersTotal ?? 0}`, color: '#10b981' },
               ].map(({ label, value, color }) => (
                  <Col key={label} xs={12} sm={6}>
                     <Card style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)' }} styles={{ body: { padding: '12px 16px' } }}>
                        <Text style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>{label}</Text>
                        <Text strong style={{ fontSize: 18, color }}>{value}</Text>
                     </Card>
                  </Col>
               ))}
               <Button
                  icon={<DownloadOutlined />}
                  onClick={() => downloadPdfReport({ employeeId, startDate: weekStart, endDate: weekEnd })}
               >
                  Download PDF
               </Button>

               <Button
                  icon={<DownloadOutlined />}
                  onClick={() => exportToCSV(flattenForCSV(breakdown), `weekly-report-${employeeId}`)}
               >
                  Export CSV
               </Button>
            </Row>
         )}

         <Card style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} styles={{ body: { padding: 0 } }}>
            <Table
               dataSource={breakdown}
               columns={columns}
               rowKey="assignmentId"
               loading={isLoading}
               pagination={false}
               locale={{ emptyText: <Empty description={!employeeId ? 'Select an employee to view weekly report' : 'No data for this week'} style={{ padding: 40 }} /> }}
               style={{ borderRadius: 12, overflow: 'hidden' }}
            />
         </Card>
      </div>
   );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
   return (
      <div style={{ padding: '24px 32px', maxWidth: 1400, minHeight: '100%' }}>
         <Title level={3} style={{ margin: '0 0 20px', color: 'var(--text)', fontWeight: 800 }}>
            Reports
         </Title>

         <Tabs
            defaultActiveKey="daily"
            items={[
               { key: 'daily', label: 'Daily Report', children: <DailyTab /> },
               { key: 'weekly', label: 'Weekly Report', children: <WeeklyTab /> },
            ]}
         />
      </div>
   );
}