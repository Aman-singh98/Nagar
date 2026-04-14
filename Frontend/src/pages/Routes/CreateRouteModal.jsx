import { useEffect } from 'react';
import {
	Modal, Button, Divider,
	Typography, Space, Tooltip, Tag, theme, Grid,
} from 'antd';
import {
	PlusOutlined, DeleteOutlined, EnvironmentOutlined,
	BranchesOutlined,
} from '@ant-design/icons';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateRoute } from '../../hooks/useRoutes.js';

const { Text } = Typography;
const { useBreakpoint } = Grid;

// ── Zod schema ───────────────────────────────────────────────────────────────

const centerSchema = z.object({
	name: z.string().min(2, 'At least 2 characters'),
	order: z.coerce.number().min(1, 'Required'),
	lat: z.coerce
		.number({ invalid_type_error: 'Latitude is required' })
		.min(-90, 'Must be between -90 and 90')
		.max(90, 'Must be between -90 and 90'),
	lng: z.coerce
		.number({ invalid_type_error: 'Longitude is required' })
		.min(-180, 'Must be between -180 and 180')
		.max(180, 'Must be between -180 and 180'),
	radius: z.coerce.number().min(50, 'Min 50m').max(5000, 'Max 5000m'),
	address: z.string().optional(),
});

const routeSchema = z.object({
	name: z.string().min(2, 'At least 2 characters'),
	centers: z.array(centerSchema).min(1, 'Add at least one center'),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeCenter = (order) => ({
	name: '', lat: '', lng: '', radius: 100, order, address: '',
});

// ── FieldWrapper — label + error message ─────────────────────────────────────

function FieldWrapper({ label, error, optional, style, children }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, ...style }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				<span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
				{optional && (
					<Tag style={{ fontSize: 10, lineHeight: '16px' }}>Optional</Tag>
				)}
			</div>
			{children}
			{error && (
				<span style={{ fontSize: 11, color: '#ff4d4f' }}>{error}</span>
			)}
		</div>
	);
}

// ── Native inputs styled to match Ant Design ─────────────────────────────────

function StyledInput({ error, style, ...props }) {
	const { token } = theme.useToken();
	return (
		<input
			{...props}
			style={{
				width: '100%',
				height: 32,
				padding: '4px 11px',
				borderRadius: token.borderRadius,
				border: `1px solid ${error ? '#ff4d4f' : token.colorBorder}`,
				background: token.colorBgContainer,
				color: token.colorText,
				fontSize: 14,
				outline: 'none',
				boxSizing: 'border-box',
				...style,
			}}
		/>
	);
}

function StyledNumberInput({ error, style, ...props }) {
	const { token } = theme.useToken();
	return (
		<input
			type="number"
			{...props}
			style={{
				width: '100%',
				height: 32,
				padding: '4px 11px',
				borderRadius: token.borderRadius,
				border: `1px solid ${error ? '#ff4d4f' : token.colorBorder}`,
				background: token.colorBgContainer,
				color: token.colorText,
				fontSize: 14,
				outline: 'none',
				boxSizing: 'border-box',
				...style,
			}}
		/>
	);
}

// ── CenterCard ───────────────────────────────────────────────────────────────

function CenterCard({ index, control, errors, canRemove, onRemove }) {
	const { token } = theme.useToken();
	const screens = useBreakpoint();
	const e = errors?.centers?.[index] ?? {};

	return (
		<div
			style={{
				border: `1px solid ${token.colorBorderSecondary}`,
				borderRadius: token.borderRadiusLG,
				overflow: 'hidden',
				background: token.colorBgLayout,
			}}
		>
			{/* Card header */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					padding: '10px 14px',
					background: token.colorFillQuaternary,
					borderBottom: `1px solid ${token.colorBorderSecondary}`,
				}}
			>
				<Space size={8}>
					<div
						style={{
							width: 22,
							height: 22,
							borderRadius: '50%',
							background: token.colorPrimary,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: 11,
							fontWeight: 700,
							color: '#fff',
						}}
					>
						{index + 1}
					</div>
					<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
						Center {index + 1}
					</Text>
				</Space>

				{canRemove && (
					<Tooltip title="Remove center">
						<Button
							type="text"
							danger
							size="small"
							icon={<DeleteOutlined />}
							onClick={onRemove}
							style={{ fontSize: 12 }}
						>
							{screens.sm ? 'Remove' : ''}
						</Button>
					</Tooltip>
				)}
			</div>

			{/* Card body */}
			<div style={{ padding: screens.sm ? '14px 14px 4px' : '10px 10px 4px' }}>

				{/* Row 1: Name + Order */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: screens.sm ? '1fr 100px' : '1fr 80px',
						gap: screens.sm ? 12 : 8,
					}}
				>
					<FieldWrapper label="Center Name" error={e.name?.message}>
						<Controller
							name={`centers.${index}.name`}
							control={control}
							render={({ field }) => (
								<StyledInput
									{...field}
									placeholder="Apollo Pharmacy – MG Road"
									error={e.name?.message}
								/>
							)}
						/>
					</FieldWrapper>

					<FieldWrapper label="Order" error={e.order?.message}>
						<Controller
							name={`centers.${index}.order`}
							control={control}
							render={({ field }) => (
								<StyledNumberInput
									{...field}
									min={1}
									error={e.order?.message}
								/>
							)}
						/>
					</FieldWrapper>
				</div>

				{/* Row 2: Lat / Lng / Radius */}
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: screens.sm ? '1fr 1fr 1fr' : '1fr 1fr',
						gap: screens.sm ? 12 : 8,
					}}
				>
					<FieldWrapper label="Latitude" error={e.lat?.message}>
						<Controller
							name={`centers.${index}.lat`}
							control={control}
							render={({ field }) => (
								<StyledNumberInput
									{...field}
									placeholder="28.6315"
									step="0.0001"
									error={e.lat?.message}
								/>
							)}
						/>
					</FieldWrapper>

					<FieldWrapper label="Longitude" error={e.lng?.message}>
						<Controller
							name={`centers.${index}.lng`}
							control={control}
							render={({ field }) => (
								<StyledNumberInput
									{...field}
									placeholder="77.2167"
									step="0.0001"
									error={e.lng?.message}
								/>
							)}
						/>
					</FieldWrapper>

					<FieldWrapper
						label="Radius (m)"
						error={e.radius?.message}
						style={{ gridColumn: screens.sm ? 'auto' : '1 / -1' }}
					>
						<Controller
							name={`centers.${index}.radius`}
							control={control}
							render={({ field }) => (
								<StyledNumberInput
									{...field}
									min={50}
									max={5000}
									step={10}
									error={e.radius?.message}
								/>
							)}
						/>
					</FieldWrapper>
				</div>

				{/* Row 3: Address */}
				<FieldWrapper label="Address" error={e.address?.message} optional>
					<Controller
						name={`centers.${index}.address`}
						control={control}
						render={({ field }) => (
							<StyledInput
								{...field}
								placeholder="Street, Area, City"
								error={e.address?.message}
							/>
						)}
					/>
				</FieldWrapper>

			</div>
		</div>
	);
}

// ── Main Modal ───────────────────────────────────────────────────────────────

export default function CreateRouteModal({ open, onClose }) {
	const create = useCreateRoute();
	const { token } = theme.useToken();
	const screens = useBreakpoint();

	const {
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(routeSchema),
		defaultValues: { name: '', centers: [makeCenter(1)] },
	});

	const { fields, append, remove } = useFieldArray({ control, name: 'centers' });

	// Reset form when modal closes
	useEffect(() => {
		if (!open) {
			const timer = setTimeout(() => reset({ name: '', centers: [makeCenter(1)] }), 300);
			return () => clearTimeout(timer);
		}
	}, [open, reset]);

	const onSubmit = async (values) => {
		try {
			await create.mutateAsync(values);
			onClose();
		} catch {
			// Error toast handled in useCreateRoute onError
		}
	};

	const handleClose = () => {
		if (create.isPending) return;
		onClose();
	};

	const isPending = create.isPending || isSubmitting;

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
							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<BranchesOutlined style={{ color: '#fff', fontSize: 16 }} />
					</div>
					<div>
						<div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: token.colorText }}>
							Create Route
						</div>
						<div style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 400 }}>
							Define a route with ordered visit centers
						</div>
					</div>
				</Space>
			}
			footer={null}
			width={screens.md ? 620 : '95vw'}
			maskClosable={!isPending}
			closable={!isPending}
			destroyOnClose={false}
			styles={{
				header: { paddingBottom: 16 },
				body: {
					paddingTop: 0,
					maxHeight: '75dvh',
					overflowY: 'auto',
					paddingRight: 2,
				},
			}}
		>
			<form onSubmit={handleSubmit(onSubmit)}>

				{/* Route Name */}
				<FieldWrapper label="Route Name" error={errors.name?.message}>
					<Controller
						name="name"
						control={control}
						render={({ field }) => (
							<StyledInput
								{...field}
								placeholder="e.g. Delhi North AM"
								error={errors.name?.message}
							/>
						)}
					/>
				</FieldWrapper>

				<Divider style={{ margin: '4px 0 20px', borderColor: token.colorBorderSecondary }} />

				{/* Centers section header */}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 14,
						flexWrap: 'wrap',
						gap: 8,
					}}
				>
					<Space size={8}>
						<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
							Visit Centers
						</Text>
						<Tag color="processing" style={{ fontWeight: 700 }}>
							{fields.length} added
						</Tag>
					</Space>
					<Button
						size="small"
						icon={<PlusOutlined />}
						onClick={() => append(makeCenter(fields.length + 1))}
						style={{ fontWeight: 600 }}
					>
						Add Center
					</Button>
				</div>

				{/* Centers list */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{fields.map((field, index) => (
						<CenterCard
							key={field.id}
							index={index}
							control={control}
							errors={errors}
							canRemove={fields.length > 1}
							onRemove={() => remove(index)}
						/>
					))}
				</div>

				{/* Root-level "add at least one center" error */}
				{errors.centers?.message && (
					<div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 8 }}>
						{errors.centers.message}
					</div>
				)}

				{/* Footer */}
				<Divider style={{ margin: '20px 0 16px', borderColor: token.colorBorderSecondary }} />

				<div
					style={{
						display: 'flex',
						gap: 10,
						justifyContent: 'flex-end',
						flexWrap: 'wrap',
					}}
				>
					<Button
						size={screens.md ? 'large' : 'middle'}
						onClick={handleClose}
						disabled={isPending}
						style={{ minWidth: screens.sm ? 100 : 80 }}
					>
						Cancel
					</Button>
					<Button
						type="primary"
						htmlType="submit"
						size={screens.md ? 'large' : 'middle'}
						loading={isPending}
						icon={<EnvironmentOutlined />}
						style={{
							minWidth: screens.sm ? 160 : 120,
							fontWeight: 600,
							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
							border: 'none',
						}}
					>
						{isPending ? 'Creating…' : 'Create Route'}
					</Button>
				</div>

			</form>
		</Modal>
	);
}
