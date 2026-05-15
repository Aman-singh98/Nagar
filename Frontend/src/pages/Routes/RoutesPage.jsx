import { useState } from 'react';
import {
	Button, Typography, Card, Statistic, Tag, Tooltip,
	Popconfirm, Empty, Spin, Space, Divider, theme, Grid,
} from 'antd';
import {
	PlusOutlined, DeleteOutlined, EnvironmentOutlined,
	CompassOutlined, AimOutlined, BarChartOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { useRoutes, useDeleteRoute, routeKeys } from '../../hooks/useRoutes.js';
import { fmtDate } from '../../utils/helpers.js';
import CreateRouteModal from './CreateRouteModal.jsx';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

// ── Deterministic card accent per route name ─────────────────────────────────
const CARD_ACCENTS = [
	'#6366f1', '#8b5cf6', '#14b8a6', '#ec4899',
	'#f59e0b', '#10b981', '#3b82f6', '#f97316',
];
function routeAccent(name = '') {
	return CARD_ACCENTS[name.charCodeAt(0) % CARD_ACCENTS.length];
}

export default function RoutesPage() {
	const [showCreate, setShowCreate] = useState(false);
	const [deletingId, setDeletingId] = useState(null);

	const { token } = theme.useToken();
	const screens = useBreakpoint();
	const queryClient = useQueryClient();

	const { data, isLoading, isFetching } = useRoutes({ isActive: 'true' });
	const deleteRoute = useDeleteRoute();

	const routes = data?.routes ?? [];
	const totalCenters = routes.reduce((s, r) => s + (r.centers?.length ?? 0), 0);
	const avgCenters = routes.length ? Math.round(totalCenters / routes.length) : 0;

	const handleDelete = async (route) => {
		setDeletingId(route._id);
		try {
			await deleteRoute.mutateAsync(route._id);
		} finally {
			setDeletingId(null);
		}
	};

	const handleRefresh = () => {
		queryClient.invalidateQueries({ queryKey: routeKeys.lists() });
	};

	// ── Responsive stat cards: 1 col mobile → 3 col desktop ───────────────────
	const statCols = screens.md ? 3 : screens.sm ? 2 : 1;

	// ── Stat cards — colours adapt via token.colorPrimary tints ───────────────
	const STATS = [
		{
			key: 'routes',
			label: 'Active Routes',
			value: routes.length,
			icon: <CompassOutlined />,
			color: token.colorPrimary,
			bg: token.colorPrimaryBg,
		},
		{
			key: 'centers',
			label: 'Total Centers',
			value: totalCenters,
			icon: <EnvironmentOutlined />,
			color: token.colorSuccess,
			bg: token.colorSuccessBg,
		},
		{
			key: 'avg',
			label: 'Avg Centers / Route',
			value: avgCenters,
			icon: <BarChartOutlined />,
			color: token.colorWarning,
			bg: token.colorWarningBg,
		},
	];

	return (
		<div
			style={{
				padding: screens.md ? '28px 32px' : '16px',
				maxWidth: 1280,
				// Background adapts automatically — Ant Design sets body/layout bg
			}}
		>
			{/* ── Page Header ─────────────────────────────────────────────────── */}
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
						Routes
					</Title>
					<Text
						type="secondary"
						style={{ fontSize: screens.md ? 14 : 12 }}
					>
						Create and manage field routes with ordered visit centers
					</Text>
				</div>

				<Space wrap>
					<Tooltip title="Refresh">
						<Button
							icon={<ReloadOutlined spin={isFetching} />}
							onClick={handleRefresh}
						/>
					</Tooltip>
					<Button
						type="primary"
						size={screens.md ? 'large' : 'middle'}
						icon={<PlusOutlined />}
						onClick={() => setShowCreate(true)}
						style={{ fontWeight: 600 }}
					>
						{screens.sm ? 'Create Route' : '+ Route'}
					</Button>
				</Space>
			</div>

			{/* ── Stat Cards ──────────────────────────────────────────────────── */}
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
							prefix={
								<span style={{ color, fontSize: 16 }}>{icon}</span>
							}
							valueStyle={{ color, fontWeight: 700 }}
						/>
					</Card>
				))}
			</div>

			{/* ── Route Cards Grid ─────────────────────────────────────────────── */}
			{isLoading ? (
				<div
					style={{
						display: 'flex',
						justifyContent: 'center',
						padding: '80px 0',
					}}
				>
					<Spin size="large" />
				</div>
			) : routes.length === 0 ? (
				<Card
					variant="borderless"
					style={{
						textAlign: 'center',
						padding: '40px 0',
						borderRadius: token.borderRadiusLG,
						background: token.colorBgContainer,
						border: `1px solid ${token.colorBorderSecondary}`,
					}}
				>
					<Empty
						image={Empty.PRESENTED_IMAGE_SIMPLE}
						description={
							<Text type="secondary">
								No active routes yet.{' '}
								<a
									onClick={() => setShowCreate(true)}
									style={{ color: token.colorPrimary }}
								>
									Create your first route
								</a>
							</Text>
						}
					>
						<Button
							type="primary"
							icon={<PlusOutlined />}
							onClick={() => setShowCreate(true)}
						>
							Create Route
						</Button>
					</Empty>
				</Card>
			) : (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: screens.lg
							? 'repeat(auto-fill, minmax(330px, 1fr))'
							: screens.md
								? 'repeat(2, 1fr)'
								: '1fr',
						gap: screens.md ? 18 : 12,
					}}
				>
					{routes.map((route) => (
						<RouteCard
							key={route._id}
							route={route}
							accent={routeAccent(route.name)}
							deleting={deletingId === route._id}
							onDelete={() => handleDelete(route)}
						/>
					))}
				</div>
			)}

			<CreateRouteModal
				open={showCreate}
				onClose={() => setShowCreate(false)}
			/>
		</div>
	);
}

// ── RouteCard ────────────────────────────────────────────────────────────────

function RouteCard({ route, accent, deleting, onDelete }) {
	const { token } = theme.useToken();
	const centers = route.centers ?? [];

	return (
		<Card
			variant="outlined"
			styles={{ body: { padding: 0 } }}
			style={{
				borderRadius: token.borderRadiusLG,
				overflow: 'hidden',
				border: `1px solid ${token.colorBorderSecondary}`,
				boxShadow: token.boxShadowTertiary,
				transition: 'box-shadow 0.2s, transform 0.2s',
				cursor: 'default',
				background: token.colorBgContainer,
			}}
			onMouseEnter={(e) => {
				e.currentTarget.style.boxShadow = token.boxShadow;
				e.currentTarget.style.transform = 'translateY(-2px)';
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.boxShadow = token.boxShadowTertiary;
				e.currentTarget.style.transform = 'translateY(0)';
			}}
		>
			{/* Accent bar */}
			<div style={{ height: 4, background: accent }} />

			{/* Card Header */}
			<div style={{ padding: '16px 18px 12px' }}>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						gap: 10,
					}}
				>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{
								fontWeight: 700,
								fontSize: 15,
								color: token.colorText,       // ← adapts dark/light
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								lineHeight: 1.3,
							}}
						>
							{route.name}
						</div>
						<Text
							type="secondary"
							style={{ fontSize: 12 }}
						>
							Created {fmtDate(route.createdAt) || '—'}
						</Text>
					</div>
					<Tag
						color="processing"
						style={{ fontWeight: 700, fontSize: 12, flexShrink: 0 }}
					>
						{centers.length} {centers.length === 1 ? 'center' : 'centers'}
					</Tag>
				</div>
			</div>

			<Divider style={{ margin: 0, borderColor: token.colorBorderSecondary }} />

			{/* Centers List */}
			<div style={{ padding: '10px 18px' }}>
				{centers.length === 0 ? (
					<Text type="secondary" style={{ fontSize: 13 }}>
						No centers added
					</Text>
				) : (
					centers.slice(0, 4).map((center, idx) => (
						<div
							key={center._id ?? idx}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 10,
								padding: '7px 0',
								borderBottom: idx < Math.min(centers.length, 4) - 1
									? `1px solid ${token.colorBorderSecondary}`  // ← token, not hardcoded
									: 'none',
							}}
						>
							{/* Order badge */}
							<div
								style={{
									width: 24,
									height: 24,
									borderRadius: '50%',
									background: `${accent}18`,
									border: `1.5px solid ${accent}55`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: 11,
									fontWeight: 700,
									color: accent,
									flexShrink: 0,
								}}
							>
								{center.order}
							</div>

							{/* Center info */}
							<div style={{ flex: 1, minWidth: 0 }}>
								<div
									style={{
										fontSize: 13,
										fontWeight: 600,
										color: token.colorText,         // ← token
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{center.name}
								</div>
								<div style={{ fontSize: 11, color: token.colorTextQuaternary }}>  {/* ← token */}
									{Number(center.lat).toFixed(4)}, {Number(center.lng).toFixed(4)} · {center.radius}m
								</div>
							</div>

							<EnvironmentOutlined
								style={{ color: accent, fontSize: 13, flexShrink: 0 }}
							/>
						</div>
					))
				)}

				{centers.length > 4 && (
					<div style={{ textAlign: 'center', paddingTop: 8 }}>
						<Text type="secondary" style={{ fontSize: 12 }}>
							+{centers.length - 4} more{' '}
							{centers.length - 4 === 1 ? 'center' : 'centers'}
						</Text>
					</div>
				)}
			</div>

			<Divider style={{ margin: 0, borderColor: token.colorBorderSecondary }} />

			{/* Card Footer */}
			<div
				style={{
					padding: '10px 18px',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
				}}
			>
				<Space size={4}>
					<AimOutlined
						style={{ color: token.colorTextTertiary, fontSize: 12 }}
					/>
					<Text type="secondary" style={{ fontSize: 12 }}>
						{centers.length} stop{centers.length !== 1 ? 's' : ''}
					</Text>
				</Space>

				<Popconfirm
					title="Deactivate this route?"
					description={`"${route.name}" will be removed from active assignments.`}
					okText="Deactivate"
					okButtonProps={{ danger: true, size: 'small' }}
					cancelText="Cancel"
					placement="topRight"
					onConfirm={onDelete}
				>
					<Button
						danger
						size="small"
						loading={deleting}
						icon={<DeleteOutlined />}
					>
						Deactivate
					</Button>
				</Popconfirm>
			</div>
		</Card>
	);
}
