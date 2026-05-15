import { useState } from 'react';
import {
	Table, Button, Input, Select, Tag, Avatar, Space, Popconfirm,
	Typography, Card, Statistic, Row, Col, Badge, Tooltip, Empty,
	Spin, theme, Grid,
} from 'antd';
import {
	PlusOutlined, SearchOutlined, UserDeleteOutlined, TeamOutlined,
	CheckCircleOutlined, ApartmentOutlined, UserOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees, useDeactivateEmployee, EMPLOYEES_KEY } from '../../hooks/useEmployees.js';
import { fmtDate } from '../../utils/helpers.js';
import CreateEmployeeModal from './CreateEmployeeModal.jsx';

const { Title, Text } = Typography;
const { Search } = Input;
const { useToken } = theme;
const { useBreakpoint } = Grid;

// ── Deterministic avatar colour per name ──────────────────────────────────────
const AVATAR_COLORS = [
	'#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
	'#f59e0b', '#10b981', '#3b82f6', '#f97316',
];
const getAvatarColor = (name = '') =>
	AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const ROLE_CONFIG = {
	admin: { color: 'purple', label: 'Admin' },
	manager: { color: 'blue', label: 'Manager' },
	employee: { color: 'green', label: 'Employee' },
};

export default function EmployeesPage() {
	const [search, setSearch] = useState('');
	const [roleFilter, setRoleFilter] = useState('');
	const [showCreate, setShowCreate] = useState(false);
	const [deactivatingId, setDeactivatingId] = useState(null);

	const { token } = useToken();
	const screens = useBreakpoint();
	const queryClient = useQueryClient();

	const { data, isLoading, isFetching } = useEmployees({
		search: search || undefined,
		role: roleFilter || undefined,
	});
	const deactivate = useDeactivateEmployee();

	const employees = data?.employees ?? [];
	const total = data?.pagination?.totalDocs ?? 0;
	const activeCount = employees.filter((e) => e.isActive).length;
	const managerCount = employees.filter((e) => e.role === 'manager').length;

	const handleDeactivate = async (employee) => {
		setDeactivatingId(employee._id);
		try {
			await deactivate.mutateAsync(employee._id);
		} finally {
			setDeactivatingId(null);
		}
	};

	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: EMPLOYEES_KEY });
	};

	// ── Stat cards — colours via design tokens (auto dark/light) ─────────────
	const STATS = [
		{
			key: 'total',
			label: 'Total Employees',
			value: total,
			icon: <TeamOutlined />,
			color: token.colorPrimary,
			bg: token.colorPrimaryBg,
		},
		{
			key: 'active',
			label: 'Active',
			value: activeCount,
			icon: <CheckCircleOutlined />,
			color: token.colorSuccess,
			bg: token.colorSuccessBg,
		},
		{
			key: 'managers',
			label: 'Managers',
			value: managerCount,
			icon: <ApartmentOutlined />,
			color: token.colorWarning,
			bg: token.colorWarningBg,
		},
	];

	// ── Responsive columns — hide less-important cols on small screens ────────
	const columns = [
		{
			title: '#',
			key: 'index',
			width: 48,
			render: (_, __, i) => (
				<Text type="secondary" style={{ fontSize: 12 }}>{i + 1}</Text>
			),
		},
		{
			title: 'Employee',
			key: 'employee',
			render: (_, emp) => (
				<Space size={10}>
					<Avatar
						size={screens.md ? 36 : 30}
						style={{
							background: getAvatarColor(emp.name),
							fontWeight: 700,
							fontSize: screens.md ? 14 : 12,
							flexShrink: 0,
						}}
					>
						{emp.name?.charAt(0)?.toUpperCase()}
					</Avatar>
					<div>
						<div style={{ fontWeight: 600, color: token.colorText, lineHeight: 1.3 }}>
							{emp.name}
						</div>
						<div style={{ fontSize: 12, color: token.colorTextSecondary, lineHeight: 1.3 }}>
							{emp.email}
						</div>
					</div>
				</Space>
			),
		},
		{
			title: 'Role',
			dataIndex: 'role',
			key: 'role',
			width: 110,
			responsive: ['sm'],                      // hidden on xs
			render: (role) => {
				const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.employee;
				return (
					<Tag color={cfg.color} style={{ fontWeight: 600, fontSize: 12 }}>
						{cfg.label}
					</Tag>
				);
			},
		},
		{
			title: 'Status',
			key: 'status',
			width: 100,
			responsive: ['sm'],
			render: (_, emp) =>
				emp.isActive ? (
					<Badge
						status="success"
						text={
							<Text style={{ fontSize: 13, color: token.colorSuccess, fontWeight: 500 }}>
								Active
							</Text>
						}
					/>
				) : (
					<Badge
						status="default"
						text={<Text type="secondary" style={{ fontSize: 13 }}>Inactive</Text>}
					/>
				),
		},
		{
			title: 'Manager',
			key: 'manager',
			width: 140,
			responsive: ['md'],                      // only md+
			render: (_, emp) =>
				emp.managerId?.name ? (
					<Tooltip title={emp.managerId.email}>
						<Space size={6}>
							<Avatar size={22} icon={<UserOutlined />} />
							<Text style={{ fontSize: 13, color: token.colorText }}>
								{emp.managerId.name}
							</Text>
						</Space>
					</Tooltip>
				) : (
					<Text type="secondary" style={{ fontSize: 12 }}>—</Text>
				),
		},
		{
			title: 'Last Login',
			dataIndex: 'lastLoginAt',
			key: 'lastLoginAt',
			width: 120,
			responsive: ['lg'],                      // only lg+
			render: (date) => (
				<Text type="secondary" style={{ fontSize: 12 }}>
					{fmtDate(date) || '—'}
				</Text>
			),
		},
		{
			title: 'Actions',
			key: 'actions',
			width: 120,
			align: 'right',
			render: (_, emp) =>
				emp.isActive ? (
					<Popconfirm
						title="Deactivate employee?"
						description={`${emp.name} will lose access immediately.`}
						okText="Deactivate"
						okButtonProps={{ danger: true, size: 'small' }}
						cancelText="Cancel"
						onConfirm={() => handleDeactivate(emp)}
						placement="topRight"
					>
						<Button
							danger
							size="small"
							loading={deactivatingId === emp._id}
							icon={<UserDeleteOutlined />}
						>
							{screens.md ? 'Deactivate' : ''}
						</Button>
					</Popconfirm>
				) : null,
		},
	];

	// ── Stat grid: 1 col on xs, 3 col on sm+ ─────────────────────────────────
	const statCols = screens.sm ? 3 : 1;

	return (
		<div
			style={{
				padding: screens.md ? '28px 32px' : '16px',
				maxWidth: 1280,
			}}
		>
			{/* ── Page Header ──────────────────────────────────────────────────── */}
			<div
				style={{
					display: 'flex',
					alignItems: screens.sm ? 'center' : 'flex-start',
					flexDirection: screens.sm ? 'row' : 'column',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 24,
				}}
			>
				<div>
					<Title
						level={screens.md ? 3 : 4}
						style={{ margin: 0, fontWeight: 700, color: token.colorText }}
					>
						Employees
					</Title>
					<Text type="secondary" style={{ fontSize: screens.md ? 14 : 12 }}>
						Manage your team members and their access levels
					</Text>
				</div>
				<Button
					type="primary"
					size={screens.md ? 'large' : 'middle'}
					icon={<PlusOutlined />}
					onClick={() => setShowCreate(true)}
					style={{ fontWeight: 600, flexShrink: 0 }}
				>
					{screens.sm ? 'Add Employee' : '+ Add'}
				</Button>
			</div>

			{/* ── Stat Cards ───────────────────────────────────────────────────── */}
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: `repeat(${statCols}, 1fr)`,
					gap: screens.md ? 16 : 10,
					marginBottom: 24,
				}}
			>
				{STATS.map(({ key, label, value, icon, color, bg }) => (
					<Card
						key={key}
						variant="borderless"
						style={{
							background: bg,
							borderRadius: token.borderRadiusLG,
							border: `1px solid ${token.colorBorderSecondary}`,
						}}
					>
						<Statistic
							title={
								<Text style={{ fontSize: 13, color: token.colorTextSecondary }}>
									{label}
								</Text>
							}
							value={value}
							prefix={<span style={{ color, fontSize: 16 }}>{icon}</span>}
							valueStyle={{ color, fontWeight: 700 }}
						/>
					</Card>
				))}
			</div>

			{/* ── Filters Bar ──────────────────────────────────────────────────── */}
			<Card
				variant="borderless"
				styles={{ body: { padding: screens.md ? '14px 20px' : '12px' } }}
				style={{
					marginBottom: 16,
					borderRadius: token.borderRadiusLG,
					border: `1px solid ${token.colorBorderSecondary}`,
					background: token.colorBgContainer,
				}}
			>
				{/* Stack vertically on mobile, row on sm+ */}
				<div
					style={{
						display: 'flex',
						flexDirection: screens.sm ? 'row' : 'column',
						alignItems: screens.sm ? 'center' : 'stretch',
						gap: 10,
						flexWrap: 'wrap',
					}}
				>
					<div style={{ flex: '1 1 220px' }}>
						<Search
							placeholder="Search by name or email…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							allowClear
							prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
						/>
					</div>

					<Select
						value={roleFilter || undefined}
						placeholder="All Roles"
						allowClear
						onChange={(val) => setRoleFilter(val ?? '')}
						style={{ width: screens.sm ? 150 : '100%' }}
						options={[
							{ label: 'Admin', value: 'admin' },
							{ label: 'Manager', value: 'manager' },
							{ label: 'Employee', value: 'employee' },
						]}
					/>

					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							marginLeft: screens.sm ? 'auto' : 0,
						}}
					>
						<Tooltip title="Refresh">
							<Button
								icon={<ReloadOutlined spin={isFetching} />}
								onClick={handleRefresh}
							/>
						</Tooltip>
						<Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
							{employees.length} of {total} shown
						</Text>
					</div>
				</div>
			</Card>

			{/* ── Table ────────────────────────────────────────────────────────── */}
			<Card
				variant="borderless"
				styles={{ body: { padding: 0 } }}
				style={{
					borderRadius: token.borderRadiusLG,
					border: `1px solid ${token.colorBorderSecondary}`,
					background: token.colorBgContainer,
					overflow: 'hidden',
				}}
			>
				<Table
					dataSource={employees}
					columns={columns}
					rowKey="_id"
					loading={{
						spinning: isLoading,
						indicator: <Spin size="large" />,
					}}
					locale={{
						emptyText: (
							<Empty
								image={Empty.PRESENTED_IMAGE_SIMPLE}
								description={
									<span>
										No employees found.{' '}
										<a
											onClick={() => setShowCreate(true)}
											style={{ color: token.colorPrimary }}
										>
											Add one now
										</a>
									</span>
								}
							/>
						),
					}}
					pagination={{
						pageSize: 12,
						showSizeChanger: false,
						showTotal: (t) => `${t} employees`,
						style: { padding: '12px 20px', margin: 0 },
					}}
					scroll={{ x: 600 }}              // reduced min-width for mobile
					style={{ fontSize: 13 }}
				/>
			</Card>

			<CreateEmployeeModal
				open={showCreate}
				onClose={() => setShowCreate(false)}
			/>
		</div>
	);
}
