/**
 * @file pages/Reports/TeamReportPage.jsx
 * @description Team comparison report — all employees KPIs side by side. (F085)
 *
 * @module pages/Reports/TeamReportPage
 */

import { useState } from 'react';
import { Card, Typography, Table, Tag, DatePicker, Button, Progress, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/axios.js';
import { exportToCSV, flattenForCSV } from '../../utils/exportToCSV.js';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ─── Completion color ─────────────────────────────────────────────────────────

const completionColor = (pct) => {
   if (pct >= 80) return '#10b981';
   if (pct >= 50) return '#f59e0b';
   return '#ef4444';
};

const completionTag = (pct) => {
   if (pct >= 80) return 'success';
   if (pct >= 50) return 'warning';
   return 'error';
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useTeamReport = ({ date, startDate, endDate, enabled }) =>
   useQuery({
      queryKey: ['reports', 'team', { date, startDate, endDate }],
      queryFn: () =>
         api.get('/reports/team', { params: { date, startDate, endDate } })
            .then((r) => r.data.data ?? r.data),
      enabled,
      staleTime: 2 * 60 * 1000,
   });

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamReportPage() {
   const [singleDate, setSingleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
   const [dateRange, setDateRange] = useState(null);
   const [useRange, setUseRange] = useState(false);

   const params = useRange && dateRange
      ? { startDate: dateRange[0], endDate: dateRange[1], enabled: true }
      : { date: singleDate, enabled: !!singleDate };

   const { data, isLoading } = useTeamReport(params);
   const team = data?.team ?? [];

   const columns = [
      {
         title: 'Employee',
         dataIndex: 'employeeName',
         sorter: (a, b) => a.employeeName.localeCompare(b.employeeName),
         render: (name, row) => (
            <div>
               <Text strong style={{ color: 'var(--text)', display: 'block' }}>{name}</Text>
               <Text style={{ fontSize: 11, color: 'var(--text-3)' }}>{row.employeeEmail}</Text>
            </div>
         ),
      },
      {
         title: 'Completion',
         dataIndex: 'visitCompletionPct',
         sorter: (a, b) => a.visitCompletionPct - b.visitCompletionPct,
         defaultSortOrder: 'descend',
         render: (pct, row) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <Progress
                  percent={pct} showInfo={false}
                  style={{ width: 70, margin: 0 }} size="small"
                  strokeColor={completionColor(pct)}
               />
               <Tag color={completionTag(pct)} style={{ fontWeight: 700, minWidth: 44, textAlign: 'center' }}>
                  {pct}%
               </Tag>
            </div>
         ),
      },
      {
         title: 'Centers',
         render: (_, row) => (
            <Text style={{ color: 'var(--text)' }}>
               {row.centersVisited}/{row.centersTotal}
            </Text>
         ),
         sorter: (a, b) => a.centersVisited - b.centersVisited,
      },
      {
         title: 'Distance',
         dataIndex: 'distanceKm',
         sorter: (a, b) => a.distanceKm - b.distanceKm,
         render: (km) => <Text style={{ color: 'var(--text)' }}>{km} km</Text>,
      },
      {
         title: 'Hours',
         dataIndex: 'hoursWorked',
         sorter: (a, b) => a.hoursWorked - b.hoursWorked,
         render: (h) => <Text style={{ color: 'var(--text)' }}>{h}h</Text>,
      },
      {
         title: 'Alerts',
         dataIndex: 'alertCount',
         sorter: (a, b) => a.alertCount - b.alertCount,
         render: (count) => (
            <Tag color={count === 0 ? 'success' : count < 3 ? 'warning' : 'error'}>
               {count}
            </Tag>
         ),
      },
      {
         title: 'Assignments',
         dataIndex: 'assignmentCount',
         sorter: (a, b) => a.assignmentCount - b.assignmentCount,
         render: (n, row) => (
            <Text style={{ color: 'var(--text)' }}>{row.completedCount}/{n}</Text>
         ),
      },
   ];

   const handleExportCSV = () => {
      const csvData = flattenForCSV(team, [
         'employeeName', 'employeeEmail', 'assignmentCount', 'completedCount',
         'visitCompletionPct', 'centersVisited', 'centersTotal',
         'distanceKm', 'hoursWorked', 'alertCount',
      ]);
      exportToCSV(csvData, `team-report-${singleDate || dateRange?.[0]}`);
   };

   return (
      <div style={{ padding: '24px 32px', maxWidth: 1400 }}>
         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Title level={3} style={{ margin: 0, color: 'var(--text)', fontWeight: 800 }}>
               Team Comparison
            </Title>
            <Button
               icon={<DownloadOutlined />}
               onClick={handleExportCSV}
               disabled={team.length === 0}
            >
               Export CSV
            </Button>
         </div>

         {/* Filters */}
         <Card
            style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 20 }}
            styles={{ body: { padding: '16px 20px' } }}
         >
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
               {!useRange ? (
                  <DatePicker
                     value={singleDate ? dayjs(singleDate) : null}
                     onChange={(_, d) => setSingleDate(d)}
                     style={{ width: 160 }}
                  />
               ) : (
                  <RangePicker
                     onChange={(_, [s, e]) => setDateRange([s, e])}
                     style={{ width: 280 }}
                  />
               )}
               <Tag
                  color={useRange ? 'purple' : 'default'}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  onClick={() => setUseRange((v) => !v)}
               >
                  {useRange ? 'Date Range ON' : 'Use Date Range'}
               </Tag>
               <Text style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
                  🟢 ≥80% · 🟡 50–80% · 🔴 &lt;50%
               </Text>
            </div>
         </Card>

         {/* Table */}
         <Card
            style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}
            styles={{ body: { padding: 0 } }}
         >
            <Table
               dataSource={team}
               columns={columns}
               rowKey="employeeId"
               loading={isLoading}
               pagination={{ pageSize: 25, showSizeChanger: false }}
               style={{ borderRadius: 12, overflow: 'hidden' }}
            />
         </Card>
      </div>
   );
}
