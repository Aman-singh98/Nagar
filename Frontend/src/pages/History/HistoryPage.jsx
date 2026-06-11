/**
 * @file pages/History/HistoryPage.jsx
 * @description Employee location history — session list with center visit breakdown.
 *
 * Features:
 *  - Employee dropdown filter
 *  - Last-30-days session list (mirrors React Native history screen)
 *  - Expandable per-session center breakdown with visit status + time
 *  - Distance, hours, and visit % summary per session
 *
 * Data: GET /reports/employee-history?employeeId=&lastDays=30
 *
 * @module pages/History/HistoryPage
 */

import { useState } from 'react';
import {
	Select, Card, Typography, Spin, Empty, Tag,
} from 'antd';
import {
	EnvironmentOutlined,
	ClockCircleOutlined,
	NodeIndexOutlined,
	CheckCircleOutlined,
} from '@ant-design/icons';
import { useEmployees } from '../../hooks/useEmployees.js';
import { useHistoryData } from '../../hooks/useHistoryData.js';

const { Text, Title } = Typography;
const { Option } = Select;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLOR = {
	visited: '#16a34a',
	pending: '#D97706',
	skipped: '#DC2626',
	missed: '#DC2626',
};

const STATUS_TAG_COLOR = {
	visited: 'success',
	pending: 'warning',
	skipped: 'error',
	missed: 'error',
};

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session, isExpanded, onToggle }) {
	const pct = session.centersTotal > 0
		? Math.round((session.centersVisited / session.centersTotal) * 100)
		: 0;
	const pctColor = pct === 100 ? '#16a34a' : pct >= 60 ? '#D97706' : '#DC2626';
	const dateObj = new Date(session.date);

	return (
		<Card
			style={{
				borderRadius: 12,
				border: `1px solid ${isExpanded ? '#a5b4fc' : 'var(--border)'}`,
				background: isExpanded ? 'var(--surface-hover, #f8f7ff)' : 'var(--surface)',
				cursor: 'pointer',
				transition: 'border-color 0.2s',
			}}
			styles={{ body: { padding: '14px 18px' } }}
			onClick={() => onToggle(session.id)}
		>
			{/* ── Header row ───────────────────────────────────────────────────── */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>

				{/* Date block */}
				<div style={{
					width: 46, textAlign: 'center',
					background: 'var(--bg, #f1f5f9)',
					borderRadius: 10, padding: '6px 0', flexShrink: 0,
				}}>
					<Text strong style={{ fontSize: 20, display: 'block', color: 'var(--text)', lineHeight: 1.1 }}>
						{String(dateObj.getDate()).padStart(2, '0')}
					</Text>
					<Text style={{ fontSize: 10, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
						{dateObj.toLocaleString('en-IN', { month: 'short' })}
					</Text>
				</div>

				{/* Info */}
				<div style={{ flex: 1, minWidth: 0 }}>
					<Text strong style={{ fontSize: 13, color: 'var(--text)', display: 'block' }}>
						{dateObj.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
					</Text>
					<div style={{ display: 'flex', gap: 12, marginTop: 5, flexWrap: 'wrap' }}>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<ClockCircleOutlined style={{ fontSize: 11, color: '#D97706' }} />
							<Text style={{ fontSize: 12, color: 'var(--text-2)' }}>{session.hoursWorked.toFixed(1)}h</Text>
						</span>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<NodeIndexOutlined style={{ fontSize: 11, color: '#6366f1' }} />
							<Text style={{ fontSize: 12, color: 'var(--text-2)' }}>{session.distanceKm.toFixed(1)} km</Text>
						</span>
						<span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<CheckCircleOutlined style={{ fontSize: 11, color: pctColor }} />
							<Text style={{ fontSize: 12, color: pctColor }}>
								{session.centersVisited}/{session.centersTotal} centers
							</Text>
						</span>
					</div>
				</div>

				{/* % badge + chevron */}
				<div style={{ textAlign: 'center', flexShrink: 0 }}>
					<Text strong style={{ fontSize: 15, color: pctColor, display: 'block' }}>{pct}%</Text>
					<Text style={{ fontSize: 10, color: 'var(--text-3)' }}>{isExpanded ? '▲' : '▼'}</Text>
				</div>
			</div>

			{/* ── Expanded: center breakdown ────────────────────────────────────── */}
			{isExpanded && session.centers.length > 0 && (
				<div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
					{session.centers.map((c, idx) => {
						const status = c.visitStatus.toLowerCase();
						const dotColor = STATUS_COLOR[status] ?? '#94a3b8';
						const tagColor = STATUS_TAG_COLOR[status] ?? 'default';
						const isVisited = status === 'visited';

						return (
							<div
								key={c.id}
								style={{
									display: 'flex', alignItems: 'center', gap: 10,
									padding: '7px 0',
									borderBottom: idx < session.centers.length - 1 ? '1px solid var(--border-light, #f1f5f9)' : 'none',
								}}
							>
								{/* Dot */}
								<div style={{
									width: 8, height: 8, borderRadius: '50%',
									background: dotColor, flexShrink: 0, marginTop: 1,
								}} />

								{/* Name + address */}
								<div style={{ flex: 1, minWidth: 0 }}>
									<Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block' }}>
										{idx + 1}. {c.name}
									</Text>
									{c.address && (
										<Text
											style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
										>
											{c.address}
										</Text>
									)}
								</div>

								{/* Status tag */}
								{isVisited ? (
									<Tag color="success" style={{ fontSize: 11, margin: 0 }}>
										✓ {c.visitedAt
											? new Date(c.visitedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
											: 'Visited'}
									</Tag>
								) : (
									<Tag color={tagColor} style={{ fontSize: 11, margin: 0, textTransform: 'capitalize' }}>
										{c.visitStatus}
									</Tag>
								)}
							</div>
						);
					})}
				</div>
			)}

			{isExpanded && session.centers.length === 0 && (
				<div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
					<Text style={{ fontSize: 12, color: 'var(--text-3)' }}>No center data for this session.</Text>
				</div>
			)}
		</Card>
	);
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
	const [selectedEmployee, setSelectedEmployee] = useState(null);
	const [expandedId, setExpandedId] = useState(null);

	const { data: empData } = useEmployees({ limit: 100 });
	const employees = empData?.employees ?? [];

	const { data: sessions = [], isLoading, isError } = useHistoryData({
		employeeId: selectedEmployee,
		lastDays: 30,
	});

	const handleToggle = (id) => setExpandedId((prev) => (prev === id ? null : id));

	const handleEmployeeChange = (val) => {
		setSelectedEmployee(val);
		setExpandedId(null);
	};

	// ── Summary totals across all sessions ──────────────────────────────────────
	const totals = sessions.reduce(
		(acc, s) => ({
			hours: acc.hours + s.hoursWorked,
			distance: acc.distance + s.distanceKm,
			visited: acc.visited + s.centersVisited,
			total: acc.total + s.centersTotal,
		}),
		{ hours: 0, distance: 0, visited: 0, total: 0 },
	);

	// ── Render ───────────────────────────────────────────────────────────────────

	return (
		<div style={{ padding: '24px 32px', maxWidth: 960, minHeight: '100%' }}>
			<Title level={3} style={{ margin: '0 0 20px', color: 'var(--text)', fontWeight: 800 }}>
				Location History
			</Title>

			{/* ── Filter bar ──────────────────────────────────────────────────── */}
			<Card
				style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 20 }}
				styles={{ body: { padding: '16px 20px' } }}
			>
				<div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
					<Select
						placeholder="Select employee"
						style={{ width: 240 }}
						value={selectedEmployee}
						onChange={handleEmployeeChange}
						showSearch
						optionFilterProp="children"
						allowClear
					>
						{employees.map((e) => (
							<Option key={e._id} value={e._id}>{e.name}</Option>
						))}
					</Select>

					{selectedEmployee && !isLoading && sessions.length > 0 && (
						<Text style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>
							Last 30 days · {sessions.length} session{sessions.length !== 1 ? 's' : ''}
						</Text>
					)}
				</div>
			</Card>

			{/* ── 30-day summary strip ────────────────────────────────────────── */}
			{selectedEmployee && !isLoading && sessions.length > 0 && (
				<div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
					{[
						{ icon: <ClockCircleOutlined />, label: 'Total Hours', value: `${totals.hours.toFixed(1)}h`, color: '#D97706' },
						{ icon: <NodeIndexOutlined />, label: 'Total Distance', value: `${totals.distance.toFixed(1)} km`, color: '#6366f1' },
						{ icon: <EnvironmentOutlined />, label: 'Centers Visited', value: `${totals.visited}/${totals.total}`, color: '#10b981' },
						{ icon: <CheckCircleOutlined />, label: 'Sessions', value: sessions.length, color: '#3b82f6' },
					].map(({ icon, label, value, color }) => (
						<Card
							key={label}
							style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', flex: '1 1 140px' }}
							styles={{ body: { padding: '12px 16px' } }}
						>
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<span style={{ color, fontSize: 18 }}>{icon}</span>
								<div>
									<Text style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>{label}</Text>
									<Text strong style={{ fontSize: 15, color: 'var(--text)' }}>{value}</Text>
								</div>
							</div>
						</Card>
					))}
				</div>
			)}

			{/* ── Body ────────────────────────────────────────────────────────── */}
			{!selectedEmployee ? (
				<Empty
					description={<Text style={{ color: 'var(--text-2)' }}>Select an employee to view their history</Text>}
					style={{ marginTop: 80 }}
				/>
			) : isLoading ? (
				<div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
					<Spin size="large" />
				</div>
			) : isError ? (
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description={<Text style={{ color: '#ef4444' }}>Failed to load history. Please try again.</Text>}
					style={{ marginTop: 80 }}
				/>
			) : sessions.length === 0 ? (
				<Empty
					image={Empty.PRESENTED_IMAGE_SIMPLE}
					description={<Text style={{ color: 'var(--text-2)' }}>No sessions found in the last 30 days</Text>}
					style={{ marginTop: 80 }}
				/>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{sessions.map((session) => (
						<SessionCard
							key={session.id}
							session={session}
							isExpanded={expandedId === session.id}
							onToggle={handleToggle}
						/>
					))}
				</div>
			)}
		</div>
	);
}