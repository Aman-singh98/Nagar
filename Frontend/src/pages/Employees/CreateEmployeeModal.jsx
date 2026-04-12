import { useEffect } from 'react';
import {
	Modal, Form, Input, Select, Button, Divider, Row, Col,
	Typography, Space, Avatar, Tag, theme, Grid,
} from 'antd';
import {
	UserOutlined, MailOutlined, LockOutlined,
	CrownOutlined, TeamOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { useCreateEmployee, useManagers } from '../../hooks/useEmployees.js';

const { Text } = Typography;
const { Password } = Input;
const { useToken } = theme;
const { useBreakpoint } = Grid;

// ── Role options ─────────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
	{
		value: 'employee',
		label: 'Employee',
		icon: <UserOutlined />,
		description: 'Standard access — assigned routes and check-ins',
		// Ant Design semantic token keys for this role
		colorKey: 'colorSuccess',
		bgKey: 'colorSuccessBg',
		borderKey: 'colorSuccessBorder',
	},
	{
		value: 'manager',
		label: 'Manager',
		icon: <TeamOutlined />,
		description: 'Manage employees, view reports and locations',
		colorKey: 'colorPrimary',
		bgKey: 'colorPrimaryBg',
		borderKey: 'colorPrimaryBorder',
	},
	{
		value: 'admin',
		label: 'Admin',
		icon: <CrownOutlined />,
		description: 'Full access — settings, billing, and all data',
		colorKey: 'colorError',     // purple isn't a direct token — error (red-ish) or use primary
		bgKey: 'colorErrorBg',
		borderKey: 'colorErrorBorder',
	},
];

// Ant Design Tag colors still use named strings — these are fine (library-managed)
const ROLE_TAG_COLOR = {
	employee: 'green',
	manager: 'blue',
	admin: 'purple',
};

// ── Password strength rules ───────────────────────────────────────────────────
const PASSWORD_RULES = [
	{ pattern: /.{8,}/, label: '8+ chars' },
	{ pattern: /[A-Z]/, label: 'Uppercase' },
	{ pattern: /[a-z]/, label: 'Lowercase' },
	{ pattern: /[0-9]/, label: 'Number' },
];

// ── PasswordStrength ──────────────────────────────────────────────────────────
function PasswordStrength({ value = '' }) {
	const { token } = useToken();

	const passed = PASSWORD_RULES.filter((r) => r.pattern.test(value));
	const strength = passed.length;

	// Strength colours — use semantic tokens where possible
	const STRENGTH_COLORS = [
		token.colorError,         // 1 — weak
		token.colorWarning,       // 2 — fair
		token.colorWarningActive, // 3 — good
		token.colorSuccess,       // 4 — strong
	];
	const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

	if (!value) return null;

	const activeColor = STRENGTH_COLORS[strength - 1] ?? token.colorError;

	return (
		<div style={{ marginTop: 8 }}>
			{/* Progress bars */}
			<div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
				{PASSWORD_RULES.map((_, i) => (
					<div
						key={i}
						style={{
							flex: 1,
							height: 4,
							borderRadius: 2,
							background: i < strength ? activeColor : token.colorFillSecondary,  // ← token
							transition: 'background 0.3s',
						}}
					/>
				))}
			</div>

			{/* Rule chips */}
			<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
				<Space size={6} wrap>
					{PASSWORD_RULES.map((r, i) => (
						<Text
							key={i}
							style={{
								fontSize: 11,
								color: r.pattern.test(value)
									? token.colorSuccess            // ← token
									: token.colorTextQuaternary,    // ← token (replaces #bfbfbf)
								transition: 'color 0.2s',
							}}
						>
							✓ {r.label}
						</Text>
					))}
				</Space>
				{strength > 0 && (
					<Text style={{ fontSize: 11, color: activeColor, fontWeight: 600 }}>
						{STRENGTH_LABELS[strength - 1]}
					</Text>
				)}
			</div>
		</div>
	);
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function CreateEmployeeModal({ open, onClose }) {
	const [form] = Form.useForm();
	const create = useCreateEmployee();
	const { token } = useToken();
	const screens = useBreakpoint();

	const { data: managersData, isLoading: managersLoading } = useManagers();
	const managers = managersData?.managers ?? [];

	const selectedRole = Form.useWatch('role', form);
	const passwordValue = Form.useWatch('password', form);

	useEffect(() => {
		if (!open) {
			const timer = setTimeout(() => form.resetFields(), 300);
			return () => clearTimeout(timer);
		}
	}, [open, form]);

	const handleSubmit = async (values) => {
		try {
			await create.mutateAsync(values);
			onClose();
		} catch {
			// Error toast handled in useCreateEmployee onError
		}
	};

	const handleClose = () => {
		if (create.isPending) return;
		onClose();
	};

	return (
		<Modal
			open={open}
			onCancel={handleClose}
			title={
				<Space>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 8,
							// gradient uses token primary instead of hardcoded purple
							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<UserOutlined style={{ color: '#fff', fontSize: 16 }} />
					</div>
					<div>
						<div
							style={{
								fontSize: 16,
								fontWeight: 700,
								lineHeight: 1.3,
								color: token.colorText,            // ← adapts dark/light
							}}
						>
							Add Employee
						</div>
						<div
							style={{
								fontSize: 12,
								color: token.colorTextSecondary,   // ← adapts dark/light
								fontWeight: 400,
							}}
						>
							Create a new team member account
						</div>
					</div>
				</Space>
			}
			footer={null}
			width={screens.md ? 580 : '95vw'}          // ← full-width on mobile
			maskClosable={!create.isPending}
			closable={!create.isPending}
			destroyOnClose={false}
			styles={{
				header: { paddingBottom: 16 },
				body: { paddingTop: 0 },
			}}
		>
			<Form
				form={form}
				layout="vertical"
				initialValues={{ role: 'employee' }}
				onFinish={handleSubmit}
				requiredMark={false}
				size={screens.md ? 'large' : 'middle'}
			>
				{/* ── Basic Info: stacks to 1 col on mobile ── */}
				<Row gutter={16}>
					<Col xs={24} sm={12}>
						<Form.Item
							name="name"
							label={
								<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
									Full Name
								</Text>
							}
							rules={[
								{ required: true, message: 'Name is required' },
								{ min: 2, message: 'At least 2 characters' },
							]}
						>
							<Input
								prefix={<UserOutlined style={{ color: token.colorTextQuaternary }} />}
								placeholder="Jane Smith"
								autoComplete="name"
							/>
						</Form.Item>
					</Col>
					<Col xs={24} sm={12}>
						<Form.Item
							name="email"
							label={
								<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
									Email Address
								</Text>
							}
							rules={[
								{ required: true, message: 'Email is required' },
								{ type: 'email', message: 'Enter a valid email' },
							]}
						>
							<Input
								prefix={<MailOutlined style={{ color: token.colorTextQuaternary }} />}
								placeholder="jane@company.com"
								autoComplete="email"
								type="email"
							/>
						</Form.Item>
					</Col>
				</Row>

				{/* ── Password ── */}
				<Form.Item
					name="password"
					label={
						<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
							Password
						</Text>
					}
					rules={[
						{ required: true, message: 'Password is required' },
						{ min: 8, message: 'At least 8 characters required' },
						{
							validator(_, value) {
								if (!value) return Promise.resolve();
								if (!/[A-Z]/.test(value)) return Promise.reject('Needs an uppercase letter');
								if (!/[a-z]/.test(value)) return Promise.reject('Needs a lowercase letter');
								if (!/[0-9]/.test(value)) return Promise.reject('Needs a digit');
								return Promise.resolve();
							},
						},
					]}
				>
					<Password
						prefix={<LockOutlined style={{ color: token.colorTextQuaternary }} />}
						placeholder="Min 8 chars with uppercase, lowercase, digit"
						autoComplete="new-password"
					/>
				</Form.Item>
				<PasswordStrength value={passwordValue} />

				<Divider style={{ margin: '20px 0 16px', borderColor: token.colorBorderSecondary }} />

				{/* ── Role Selector ── */}
				<Form.Item
					name="role"
					label={
						<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
							Role
						</Text>
					}
					rules={[{ required: true, message: 'Please select a role' }]}
				>
					{/* Stack to column on very small screens */}
					<div
						style={{
							display: 'flex',
							flexDirection: screens.sm ? 'row' : 'column',
							gap: 10,
						}}
					>
						{ROLE_OPTIONS.map((opt) => {
							const isSelected = selectedRole === opt.value;
							const roleColor = token[opt.colorKey];
							const roleBg = token[opt.bgKey];
							const roleBorder = token[opt.borderKey];

							return (
								<div
									key={opt.value}
									onClick={() => form.setFieldValue('role', opt.value)}
									style={{
										flex: 1,
										padding: screens.sm ? '12px 14px' : '10px 12px',
										borderRadius: token.borderRadiusLG,
										// ← border and bg both adapt via tokens
										border: `2px solid ${isSelected ? roleBorder : token.colorBorderSecondary}`,
										background: isSelected ? roleBg : token.colorBgLayout,
										cursor: 'pointer',
										transition: 'all 0.2s',
										textAlign: 'center',
									}}
								>
									<div
										style={{
											fontSize: 20,
											marginBottom: 4,
											color: isSelected ? roleColor : token.colorTextSecondary,
										}}
									>
										{opt.icon}
									</div>
									<Tag
										color={ROLE_TAG_COLOR[opt.value]}
										style={{ fontWeight: 600, fontSize: 11, margin: '0 0 4px' }}
									>
										{opt.label}
									</Tag>
									<div
										style={{
											fontSize: 11,
											color: token.colorTextSecondary,   // ← token (replaces #8c8c8c)
											lineHeight: 1.4,
										}}
									>
										{opt.description}
									</div>
								</div>
							);
						})}
					</div>
				</Form.Item>
				{/* ── Manager Selector (employee role only) ── */}
				{selectedRole === 'employee' && (
					<Form.Item
						name="managerId"
						label={
							<Space size={6}>
								<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
									Assign Manager
								</Text>
								<Tag style={{ fontSize: 10, lineHeight: '16px' }}>Optional</Tag>
							</Space>
						}
					>
						<Select
							placeholder="Select a manager (optional)"
							loading={managersLoading}
							allowClear
							showSearch
							optionFilterProp="label"
							options={managers.map((m) => ({
								value: m._id,
								label: m.name,
								email: m.email,
							}))}
							optionRender={(opt) => (
								<Space>
									<Avatar
										size={24}
										style={{
											background: token.colorPrimary,   // ← token (replaces #5c6bc0)
											fontSize: 11,
										}}
									>
										{opt.data.label?.charAt(0)?.toUpperCase()}
									</Avatar>
									<div>
										<div style={{ fontSize: 13, fontWeight: 500, color: token.colorText }}>
											{opt.data.label}
										</div>
										<div style={{ fontSize: 11, color: token.colorTextSecondary }}>
											{opt.data.email}
										</div>
									</div>
								</Space>
							)}
							notFoundContent={
								managersLoading ? 'Loading...' : (
									<Text type="secondary" style={{ fontSize: 13 }}>No managers found</Text>
								)
							}
						/>
					</Form.Item>
				)}

				{/* ── Footer ── */}
				<Divider style={{ margin: '20px 0 16px', borderColor: token.colorBorderSecondary }} />
				<div
					style={{
						display: 'flex',
						gap: 10,
						justifyContent: 'flex-end',
						flexWrap: 'wrap',         // stacks on very small screens
					}}
				>
					<Button
						size={screens.md ? 'large' : 'middle'}
						onClick={handleClose}
						disabled={create.isPending}
						style={{ minWidth: screens.sm ? 100 : 80 }}
					>
						Cancel
					</Button>
					<Button
						type="primary"
						htmlType="submit"
						size={screens.md ? 'large' : 'middle'}
						loading={create.isPending}
						icon={<SafetyOutlined />}
						style={{
							minWidth: screens.sm ? 160 : 120,
							fontWeight: 600,
							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
							border: 'none',
						}}
					>
						{create.isPending ? 'Creating…' : 'Create Employee'}
					</Button>
				</div>
			</Form>
		</Modal>
	);
}
