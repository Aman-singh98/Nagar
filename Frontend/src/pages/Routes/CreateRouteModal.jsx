// import { useEffect } from 'react';
// import {
// 	Modal, Button, Divider,
// 	Typography, Space, Tooltip, Tag, theme, Grid,
// } from 'antd';
// import {
// 	PlusOutlined, DeleteOutlined, EnvironmentOutlined,
// 	BranchesOutlined,
// } from '@ant-design/icons';
// import { useForm, useFieldArray, Controller } from 'react-hook-form';
// import { z } from 'zod';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { useCreateRoute } from '../../hooks/useRoutes.js';

// const { Text } = Typography;
// const { useBreakpoint } = Grid;

// // ── Zod schema ───────────────────────────────────────────────────────────────

// const centerSchema = z.object({
// 	name: z.string().min(2, 'At least 2 characters'),
// 	order: z.coerce.number().min(1, 'Required'),
// 	lat: z.coerce
// 		.number({ invalid_type_error: 'Latitude is required' })
// 		.min(-90, 'Must be between -90 and 90')
// 		.max(90, 'Must be between -90 and 90'),
// 	lng: z.coerce
// 		.number({ invalid_type_error: 'Longitude is required' })
// 		.min(-180, 'Must be between -180 and 180')
// 		.max(180, 'Must be between -180 and 180'),
// 	radius: z.coerce.number().min(50, 'Min 50m').max(5000, 'Max 5000m'),
// 	address: z.string().optional(),
// });

// const routeSchema = z.object({
// 	name: z.string().min(2, 'At least 2 characters'),
// 	centers: z.array(centerSchema).min(1, 'Add at least one center'),
// });

// // ── Helpers ──────────────────────────────────────────────────────────────────

// const makeCenter = (order) => ({
// 	name: '', lat: '', lng: '', radius: 100, order, address: '',
// });

// // ── FieldWrapper — label + error message ─────────────────────────────────────

// function FieldWrapper({ label, error, optional, style, children }) {
// 	return (
// 		<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, ...style }}>
// 			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
// 				<span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
// 				{optional && (
// 					<Tag style={{ fontSize: 10, lineHeight: '16px' }}>Optional</Tag>
// 				)}
// 			</div>
// 			{children}
// 			{error && (
// 				<span style={{ fontSize: 11, color: '#ff4d4f' }}>{error}</span>
// 			)}
// 		</div>
// 	);
// }

// // ── Native inputs styled to match Ant Design ─────────────────────────────────

// function StyledInput({ error, style, ...props }) {
// 	const { token } = theme.useToken();
// 	return (
// 		<input
// 			{...props}
// 			style={{
// 				width: '100%',
// 				height: 32,
// 				padding: '4px 11px',
// 				borderRadius: token.borderRadius,
// 				border: `1px solid ${error ? '#ff4d4f' : token.colorBorder}`,
// 				background: token.colorBgContainer,
// 				color: token.colorText,
// 				fontSize: 14,
// 				outline: 'none',
// 				boxSizing: 'border-box',
// 				...style,
// 			}}
// 		/>
// 	);
// }

// function StyledNumberInput({ error, style, ...props }) {
// 	const { token } = theme.useToken();
// 	return (
// 		<input
// 			type="number"
// 			{...props}
// 			style={{
// 				width: '100%',
// 				height: 32,
// 				padding: '4px 11px',
// 				borderRadius: token.borderRadius,
// 				border: `1px solid ${error ? '#ff4d4f' : token.colorBorder}`,
// 				background: token.colorBgContainer,
// 				color: token.colorText,
// 				fontSize: 14,
// 				outline: 'none',
// 				boxSizing: 'border-box',
// 				...style,
// 			}}
// 		/>
// 	);
// }

// // ── CenterCard ───────────────────────────────────────────────────────────────

// function CenterCard({ index, control, errors, canRemove, onRemove }) {
// 	const { token } = theme.useToken();
// 	const screens = useBreakpoint();
// 	const e = errors?.centers?.[index] ?? {};

// 	return (
// 		<div
// 			style={{
// 				border: `1px solid ${token.colorBorderSecondary}`,
// 				borderRadius: token.borderRadiusLG,
// 				overflow: 'hidden',
// 				background: token.colorBgLayout,
// 			}}
// 		>
// 			{/* Card header */}
// 			<div
// 				style={{
// 					display: 'flex',
// 					alignItems: 'center',
// 					justifyContent: 'space-between',
// 					padding: '10px 14px',
// 					background: token.colorFillQuaternary,
// 					borderBottom: `1px solid ${token.colorBorderSecondary}`,
// 				}}
// 			>
// 				<Space size={8}>
// 					<div
// 						style={{
// 							width: 22,
// 							height: 22,
// 							borderRadius: '50%',
// 							background: token.colorPrimary,
// 							display: 'flex',
// 							alignItems: 'center',
// 							justifyContent: 'center',
// 							fontSize: 11,
// 							fontWeight: 700,
// 							color: '#fff',
// 						}}
// 					>
// 						{index + 1}
// 					</div>
// 					<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
// 						Center {index + 1}
// 					</Text>
// 				</Space>

// 				{canRemove && (
// 					<Tooltip title="Remove center">
// 						<Button
// 							type="text"
// 							danger
// 							size="small"
// 							icon={<DeleteOutlined />}
// 							onClick={onRemove}
// 							style={{ fontSize: 12 }}
// 						>
// 							{screens.sm ? 'Remove' : ''}
// 						</Button>
// 					</Tooltip>
// 				)}
// 			</div>

// 			{/* Card body */}
// 			<div style={{ padding: screens.sm ? '14px 14px 4px' : '10px 10px 4px' }}>

// 				{/* Row 1: Name + Order */}
// 				<div
// 					style={{
// 						display: 'grid',
// 						gridTemplateColumns: screens.sm ? '1fr 100px' : '1fr 80px',
// 						gap: screens.sm ? 12 : 8,
// 					}}
// 				>
// 					<FieldWrapper label="Center Name" error={e.name?.message}>
// 						<Controller
// 							name={`centers.${index}.name`}
// 							control={control}
// 							render={({ field }) => (
// 								<StyledInput
// 									{...field}
// 									placeholder="Apollo Pharmacy – MG Road"
// 									error={e.name?.message}
// 								/>
// 							)}
// 						/>
// 					</FieldWrapper>

// 					<FieldWrapper label="Order" error={e.order?.message}>
// 						<Controller
// 							name={`centers.${index}.order`}
// 							control={control}
// 							render={({ field }) => (
// 								<StyledNumberInput
// 									{...field}
// 									min={1}
// 									error={e.order?.message}
// 								/>
// 							)}
// 						/>
// 					</FieldWrapper>
// 				</div>

// 				{/* Row 2: Lat / Lng / Radius */}
// 				<div
// 					style={{
// 						display: 'grid',
// 						gridTemplateColumns: screens.sm ? '1fr 1fr 1fr' : '1fr 1fr',
// 						gap: screens.sm ? 12 : 8,
// 					}}
// 				>
// 					<FieldWrapper label="Latitude" error={e.lat?.message}>
// 						<Controller
// 							name={`centers.${index}.lat`}
// 							control={control}
// 							render={({ field }) => (
// 								<StyledNumberInput
// 									{...field}
// 									placeholder="28.6315"
// 									step="0.0001"
// 									error={e.lat?.message}
// 								/>
// 							)}
// 						/>
// 					</FieldWrapper>

// 					<FieldWrapper label="Longitude" error={e.lng?.message}>
// 						<Controller
// 							name={`centers.${index}.lng`}
// 							control={control}
// 							render={({ field }) => (
// 								<StyledNumberInput
// 									{...field}
// 									placeholder="77.2167"
// 									step="0.0001"
// 									error={e.lng?.message}
// 								/>
// 							)}
// 						/>
// 					</FieldWrapper>

// 					<FieldWrapper
// 						label="Radius (m)"
// 						error={e.radius?.message}
// 						style={{ gridColumn: screens.sm ? 'auto' : '1 / -1' }}
// 					>
// 						<Controller
// 							name={`centers.${index}.radius`}
// 							control={control}
// 							render={({ field }) => (
// 								<StyledNumberInput
// 									{...field}
// 									min={50}
// 									max={5000}
// 									step={10}
// 									error={e.radius?.message}
// 								/>
// 							)}
// 						/>
// 					</FieldWrapper>
// 				</div>

// 				{/* Row 3: Address */}
// 				<FieldWrapper label="Address" error={e.address?.message} optional>
// 					<Controller
// 						name={`centers.${index}.address`}
// 						control={control}
// 						render={({ field }) => (
// 							<StyledInput
// 								{...field}
// 								placeholder="Street, Area, City"
// 								error={e.address?.message}
// 							/>
// 						)}
// 					/>
// 				</FieldWrapper>

// 			</div>
// 		</div>
// 	);
// }

// // ── Main Modal ───────────────────────────────────────────────────────────────

// export default function CreateRouteModal({ open, onClose }) {
// 	const create = useCreateRoute();
// 	const { token } = theme.useToken();
// 	const screens = useBreakpoint();

// 	const {
// 		control,
// 		handleSubmit,
// 		reset,
// 		formState: { errors, isSubmitting },
// 	} = useForm({
// 		resolver: zodResolver(routeSchema),
// 		defaultValues: { name: '', centers: [makeCenter(1)] },
// 	});

// 	const { fields, append, remove } = useFieldArray({ control, name: 'centers' });

// 	// Reset form when modal closes
// 	useEffect(() => {
// 		if (!open) {
// 			const timer = setTimeout(() => reset({ name: '', centers: [makeCenter(1)] }), 300);
// 			return () => clearTimeout(timer);
// 		}
// 	}, [open, reset]);

// 	const onSubmit = async (values) => {
// 		try {
// 			await create.mutateAsync(values);
// 			onClose();
// 		} catch {
// 			// Error toast handled in useCreateRoute onError
// 		}
// 	};

// 	const handleClose = () => {
// 		if (create.isPending) return;
// 		onClose();
// 	};

// 	const isPending = create.isPending || isSubmitting;

// 	return (
// 		<Modal
// 			open={open}
// 			onCancel={handleClose}
// 			title={
// 				<Space>
// 					<div
// 						style={{
// 							width: 36,
// 							height: 36,
// 							borderRadius: 8,
// 							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
// 							display: 'flex',
// 							alignItems: 'center',
// 							justifyContent: 'center',
// 						}}
// 					>
// 						<BranchesOutlined style={{ color: '#fff', fontSize: 16 }} />
// 					</div>
// 					<div>
// 						<div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, color: token.colorText }}>
// 							Create Route
// 						</div>
// 						<div style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 400 }}>
// 							Define a route with ordered visit centers
// 						</div>
// 					</div>
// 				</Space>
// 			}
// 			footer={null}
// 			width={screens.md ? 620 : '95vw'}
// 			maskClosable={!isPending}
// 			closable={!isPending}
// 			destroyOnClose={false}
// 			styles={{
// 				header: { paddingBottom: 16 },
// 				body: {
// 					paddingTop: 0,
// 					maxHeight: '75dvh',
// 					overflowY: 'auto',
// 					paddingRight: 2,
// 				},
// 			}}
// 		>
// 			<form onSubmit={handleSubmit(onSubmit)}>

// 				{/* Route Name */}
// 				<FieldWrapper label="Route Name" error={errors.name?.message}>
// 					<Controller
// 						name="name"
// 						control={control}
// 						render={({ field }) => (
// 							<StyledInput
// 								{...field}
// 								placeholder="e.g. Delhi North AM"
// 								error={errors.name?.message}
// 							/>
// 						)}
// 					/>
// 				</FieldWrapper>

// 				<Divider style={{ margin: '4px 0 20px', borderColor: token.colorBorderSecondary }} />

// 				{/* Centers section header */}
// 				<div
// 					style={{
// 						display: 'flex',
// 						alignItems: 'center',
// 						justifyContent: 'space-between',
// 						marginBottom: 14,
// 						flexWrap: 'wrap',
// 						gap: 8,
// 					}}
// 				>
// 					<Space size={8}>
// 						<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
// 							Visit Centers
// 						</Text>
// 						<Tag color="processing" style={{ fontWeight: 700 }}>
// 							{fields.length} added
// 						</Tag>
// 					</Space>
// 					<Button
// 						size="small"
// 						icon={<PlusOutlined />}
// 						onClick={() => append(makeCenter(fields.length + 1))}
// 						style={{ fontWeight: 600 }}
// 					>
// 						Add Center
// 					</Button>
// 				</div>

// 				{/* Centers list */}
// 				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
// 					{fields.map((field, index) => (
// 						<CenterCard
// 							key={field.id}
// 							index={index}
// 							control={control}
// 							errors={errors}
// 							canRemove={fields.length > 1}
// 							onRemove={() => remove(index)}
// 						/>
// 					))}
// 				</div>

// 				{/* Root-level "add at least one center" error */}
// 				{errors.centers?.message && (
// 					<div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 8 }}>
// 						{errors.centers.message}
// 					</div>
// 				)}

// 				{/* Footer */}
// 				<Divider style={{ margin: '20px 0 16px', borderColor: token.colorBorderSecondary }} />

// 				<div
// 					style={{
// 						display: 'flex',
// 						gap: 10,
// 						justifyContent: 'flex-end',
// 						flexWrap: 'wrap',
// 					}}
// 				>
// 					<Button
// 						size={screens.md ? 'large' : 'middle'}
// 						onClick={handleClose}
// 						disabled={isPending}
// 						style={{ minWidth: screens.sm ? 100 : 80 }}
// 					>
// 						Cancel
// 					</Button>
// 					<Button
// 						type="primary"
// 						htmlType="submit"
// 						size={screens.md ? 'large' : 'middle'}
// 						loading={isPending}
// 						icon={<EnvironmentOutlined />}
// 						style={{
// 							minWidth: screens.sm ? 160 : 120,
// 							fontWeight: 600,
// 							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
// 							border: 'none',
// 						}}
// 					>
// 						{isPending ? 'Creating…' : 'Create Route'}
// 					</Button>
// 				</div>

// 			</form>
// 		</Modal>
// 	);
// }

import { useEffect, useRef, useState, useCallback } from 'react';
import {
	Modal, Button, Divider,
	Typography, Space, Tooltip, Tag, theme, Grid, Input,
} from 'antd';
import {
	PlusOutlined, DeleteOutlined, EnvironmentOutlined,
	BranchesOutlined, SearchOutlined, AimOutlined, CheckOutlined,
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
		.min(-90).max(90),
	lng: z.coerce
		.number({ invalid_type_error: 'Longitude is required' })
		.min(-180).max(180),
	radius: z.coerce.number().min(50, 'Min 50m').max(5000, 'Max 5000m'),
	address: z.string().optional(),
});

const routeSchema = z.object({
	name: z.string().min(2, 'At least 2 characters'),
	centers: z.array(centerSchema).min(1, 'Add at least one center'),
});

const makeCenter = (order) => ({
	name: '', lat: '', lng: '', radius: 100, order, address: '',
});

// ── FieldWrapper ─────────────────────────────────────────────────────────────

function FieldWrapper({ label, error, optional, style, children }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12, ...style }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
				<span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
				{optional && <Tag style={{ fontSize: 10, lineHeight: '16px' }}>Optional</Tag>}
			</div>
			{children}
			{error && <span style={{ fontSize: 11, color: '#ff4d4f' }}>{error}</span>}
		</div>
	);
}

function StyledInput({ error, style, ...props }) {
	const { token } = theme.useToken();
	return (
		<input
			{...props}
			style={{
				width: '100%', height: 32, padding: '4px 11px',
				borderRadius: token.borderRadius,
				border: `1px solid ${error ? '#ff4d4f' : token.colorBorder}`,
				background: token.colorBgContainer, color: token.colorText,
				fontSize: 14, outline: 'none', boxSizing: 'border-box', ...style,
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
				width: '100%', height: 32, padding: '4px 11px',
				borderRadius: token.borderRadius,
				border: `1px solid ${error ? '#ff4d4f' : token.colorBorder}`,
				background: token.colorBgContainer, color: token.colorText,
				fontSize: 14, outline: 'none', boxSizing: 'border-box', ...style,
			}}
		/>
	);
}

// ── Full Screen Map Picker Modal ──────────────────────────────────────────────

function MapPickerModal({ open, centerIndex, onConfirm, onCancel }) {
	const { token } = theme.useToken();
	const mapRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const markerRef = useRef(null);
	const [searchText, setSearchText] = useState('');
	const [searching, setSearching] = useState(false);
	const [pickedLatLng, setPickedLatLng] = useState(null);
	const [searchResults, setSearchResults] = useState([]);

	// Init map when modal opens
	useEffect(() => {
		if (!open) return;
		const timer = setTimeout(() => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.invalidateSize();
				return;
			}
			import('leaflet').then((L) => {
				if (!mapRef.current || mapInstanceRef.current) return;

				delete L.Icon.Default.prototype._getIconUrl;
				L.Icon.Default.mergeOptions({
					iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
					iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
					shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
				});

				const map = L.map(mapRef.current, {
					center: [20.5937, 78.9629],
					zoom: 5,
					zoomControl: true,
				});

				// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				// 	attribution: '© OpenStreetMap contributors',
				// 	maxZoom: 19,
				// }).addTo(map);
				// CartoDB Voyager tiles (Google Maps jaisa — shops, chowks, streets sab)
				L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
					attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
					subdomains: 'abcd',
					maxZoom: 20,
				}).addTo(map);

				map.on('click', (e) => {
					const lat = parseFloat(e.latlng.lat.toFixed(6));
					const lng = parseFloat(e.latlng.lng.toFixed(6));

					if (markerRef.current) {
						markerRef.current.setLatLng([lat, lng]);
						markerRef.current.getPopup()?.setContent(`📍 ${lat}, ${lng}`);
						markerRef.current.openPopup();
					} else {
						markerRef.current = L.marker([lat, lng])
							.addTo(map)
							.bindPopup(`📍 ${lat}, ${lng}`)
							.openPopup();
					}
					setPickedLatLng({ lat, lng });
				});

				mapInstanceRef.current = map;
			});
		}, 300);

		return () => clearTimeout(timer);
	}, [open]);

	// Cleanup map on unmount
	useEffect(() => {
		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
				markerRef.current = null;
			}
		};
	}, []);

	// Reset on close
	useEffect(() => {
		if (!open) {
			setPickedLatLng(null);
			setSearchText('');
			setSearchResults([]);
			if (markerRef.current && mapInstanceRef.current) {
				mapInstanceRef.current.removeLayer(markerRef.current);
				markerRef.current = null;
			}
		}
	}, [open]);

	// Search — supports city, sector, address, landmark
	const handleSearch = async () => {
		if (!searchText.trim()) return;
		setSearching(true);
		setSearchResults([]);
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchText)}&format=json&limit=5&addressdetails=1`,
				{ headers: { 'Accept-Language': 'en' } },
			);
			const data = await res.json();
			setSearchResults(data);
			if (data.length > 0 && mapInstanceRef.current) {
				mapInstanceRef.current.setView(
					[parseFloat(data[0].lat), parseFloat(data[0].lon)], 15,
				);
			}
		} catch (e) {
			console.warn('Search failed:', e);
		} finally {
			setSearching(false);
		}
	};

	const handleResultClick = (result) => {
		if (!mapInstanceRef.current) return;
		mapInstanceRef.current.setView(
			[parseFloat(result.lat), parseFloat(result.lon)], 16,
		);
		setSearchResults([]);
		setSearchText(result.display_name.split(',').slice(0, 3).join(', '));
	};

	const handleConfirm = () => {
		if (!pickedLatLng) return;
		onConfirm(pickedLatLng.lat, pickedLatLng.lng);
		setPickedLatLng(null);
	};

	return (
		<Modal
			open={open}
			onCancel={onCancel}
			title={
				<Space>
					<AimOutlined style={{ color: token.colorPrimary, fontSize: 18 }} />
					<div>
						<div style={{ fontSize: 15, fontWeight: 700, color: token.colorText }}>
							Pick Location {centerIndex !== null ? `— Center ${centerIndex + 1}` : ''}
						</div>
						<div style={{ fontSize: 11, color: token.colorTextSecondary }}>
							Search a place, then click on the map to drop a pin
						</div>
					</div>
				</Space>
			}
			width="92vw"
			style={{ top: 16, maxWidth: 1200 }}
			styles={{ body: { padding: '12px 16px 0' } }}
			footer={
				<div style={{
					display: 'flex', alignItems: 'center',
					justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
				}}>
					{pickedLatLng ? (
						<Tag color="success" style={{ fontSize: 12, padding: '4px 12px' }}>
							📍 Lat: {pickedLatLng.lat} &nbsp;|&nbsp; Lng: {pickedLatLng.lng}
						</Tag>
					) : (
						<Text type="secondary" style={{ fontSize: 12 }}>
							Click on the map to select a location
						</Text>
					)}
					<Space>
						<Button onClick={onCancel}>Cancel</Button>
						<Button
							type="primary"
							icon={<CheckOutlined />}
							disabled={!pickedLatLng}
							onClick={handleConfirm}
							style={{ fontWeight: 600, minWidth: 160 }}
						>
							Confirm Location
						</Button>
					</Space>
				</div>
			}
			maskClosable={false}
			destroyOnClose={false}
		>
			{/* Search bar */}
			<div style={{ position: 'relative', marginBottom: 8 }}>
				<Space.Compact style={{ width: '100%' }}>
					<Input
						placeholder="Search city, sector, area, address… e.g. Sector 17 Chandigarh, Mohali Phase 7"
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						onPressEnter={handleSearch}
						prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
						allowClear
						size="large"
					/>
					<Button
						type="primary"
						icon={<SearchOutlined />}
						loading={searching}
						onClick={handleSearch}
						size="large"
						style={{ minWidth: 100 }}
					>
						Search
					</Button>
				</Space.Compact>

				{/* Dropdown results */}
				{searchResults.length > 0 && (
					<div style={{
						position: 'absolute', top: '100%', left: 0, right: 0,
						zIndex: 9999,
						background: token.colorBgContainer,
						border: `1px solid ${token.colorBorderSecondary}`,
						borderRadius: token.borderRadius,
						boxShadow: token.boxShadowSecondary,
						marginTop: 4,
						maxHeight: 220,
						overflowY: 'auto',
					}}>
						{searchResults.map((r, i) => (
							<div
								key={i}
								onClick={() => handleResultClick(r)}
								style={{
									padding: '9px 14px', cursor: 'pointer', fontSize: 13,
									color: token.colorText,
									borderBottom: i < searchResults.length - 1
										? `1px solid ${token.colorBorderSecondary}` : 'none',
									transition: 'background 0.15s',
								}}
								onMouseEnter={(e) => e.currentTarget.style.background = token.colorFillSecondary}
								onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
							>
								<EnvironmentOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
								{r.display_name}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Hint bar */}
			<div style={{
				padding: '6px 12px', marginBottom: 8,
				background: token.colorInfoBg,
				borderRadius: token.borderRadius,
				border: `1px solid ${token.colorInfoBorder}`,
			}}>
				<Text style={{ fontSize: 12, color: token.colorInfoText }}>
					🖱️ Click anywhere on the map to drop a pin. Click again to move it.
				</Text>
			</div>

			{/* Map */}
			<div
				ref={mapRef}
				style={{
					height: 'calc(90vh - 280px)',
					minHeight: 400,
					width: '100%',
					borderRadius: token.borderRadiusLG,
					overflow: 'hidden',
					border: `1px solid ${token.colorBorderSecondary}`,
					background: '#e8e8e8',
					marginBottom: 0,
				}}
			/>
		</Modal>
	);
}

// ── CenterCard ───────────────────────────────────────────────────────────────

function CenterCard({ index, control, errors, canRemove, onRemove, onPickLocation }) {
	const { token } = theme.useToken();
	const screens = useBreakpoint();
	const e = errors?.centers?.[index] ?? {};

	return (
		<div style={{
			border: `1px solid ${token.colorBorderSecondary}`,
			borderRadius: token.borderRadiusLG,
			overflow: 'hidden',
			background: token.colorBgLayout,
		}}>
			{/* Header */}
			<div style={{
				display: 'flex', alignItems: 'center', justifyContent: 'space-between',
				padding: '10px 14px',
				background: token.colorFillQuaternary,
				borderBottom: `1px solid ${token.colorBorderSecondary}`,
			}}>
				<Space size={8}>
					<div style={{
						width: 22, height: 22, borderRadius: '50%',
						background: token.colorPrimary,
						display: 'flex', alignItems: 'center', justifyContent: 'center',
						fontSize: 11, fontWeight: 700, color: '#fff',
					}}>
						{index + 1}
					</div>
					<Text style={{ fontSize: 13, fontWeight: 600 }}>Center {index + 1}</Text>
				</Space>

				<Space size={8}>
					{/* Pick on Map button */}
					<Button
						size="small"
						icon={<AimOutlined />}
						onClick={() => onPickLocation(index)}
						style={{
							fontSize: 12, fontWeight: 600,
							color: token.colorPrimary,
							borderColor: token.colorPrimary,
						}}
					>
						{screens.sm ? 'Pick on Map' : '📍'}
					</Button>

					{canRemove && (
						<Tooltip title="Remove center">
							<Button
								type="text" danger size="small"
								icon={<DeleteOutlined />}
								onClick={onRemove}
							>
								{screens.sm ? 'Remove' : ''}
							</Button>
						</Tooltip>
					)}
				</Space>
			</div>

			{/* Body */}
			<div style={{ padding: screens.sm ? '14px 14px 4px' : '10px 10px 4px' }}>
				<div style={{
					display: 'grid',
					gridTemplateColumns: screens.sm ? '1fr 100px' : '1fr 80px',
					gap: screens.sm ? 12 : 8,
				}}>
					<FieldWrapper label="Center Name" error={e.name?.message}>
						<Controller name={`centers.${index}.name`} control={control}
							render={({ field }) => (
								<StyledInput {...field} placeholder="Apollo Pharmacy – MG Road" error={e.name?.message} />
							)}
						/>
					</FieldWrapper>
					<FieldWrapper label="Order" error={e.order?.message}>
						<Controller name={`centers.${index}.order`} control={control}
							render={({ field }) => (
								<StyledNumberInput {...field} min={1} error={e.order?.message} />
							)}
						/>
					</FieldWrapper>
				</div>

				<div style={{
					display: 'grid',
					gridTemplateColumns: screens.sm ? '1fr 1fr 1fr' : '1fr 1fr',
					gap: screens.sm ? 12 : 8,
				}}>
					<FieldWrapper label="Latitude" error={e.lat?.message}>
						<Controller name={`centers.${index}.lat`} control={control}
							render={({ field }) => (
								<StyledNumberInput
									{...field} placeholder="28.6315" step="0.0001"
									error={e.lat?.message}
									style={{ background: field.value ? '#f6ffed' : undefined }}
								/>
							)}
						/>
					</FieldWrapper>
					<FieldWrapper label="Longitude" error={e.lng?.message}>
						<Controller name={`centers.${index}.lng`} control={control}
							render={({ field }) => (
								<StyledNumberInput
									{...field} placeholder="77.2167" step="0.0001"
									error={e.lng?.message}
									style={{ background: field.value ? '#f6ffed' : undefined }}
								/>
							)}
						/>
					</FieldWrapper>
					<FieldWrapper label="Radius (m)" error={e.radius?.message}
						style={{ gridColumn: screens.sm ? 'auto' : '1 / -1' }}>
						<Controller name={`centers.${index}.radius`} control={control}
							render={({ field }) => (
								<StyledNumberInput {...field} min={50} max={5000} step={10} error={e.radius?.message} />
							)}
						/>
					</FieldWrapper>
				</div>

				<FieldWrapper label="Address" error={e.address?.message} optional>
					<Controller name={`centers.${index}.address`} control={control}
						render={({ field }) => (
							<StyledInput {...field} placeholder="Street, Area, City" error={e.address?.message} />
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

	const [mapPickerOpen, setMapPickerOpen] = useState(false);
	const [pickingForIndex, setPickingForIndex] = useState(null);

	const {
		control, handleSubmit, reset, setValue,
		formState: { errors, isSubmitting },
	} = useForm({
		resolver: zodResolver(routeSchema),
		defaultValues: { name: '', centers: [makeCenter(1)] },
	});

	const { fields, append, remove } = useFieldArray({ control, name: 'centers' });

	useEffect(() => {
		if (!open) {
			const timer = setTimeout(() => {
				reset({ name: '', centers: [makeCenter(1)] });
				setMapPickerOpen(false);
				setPickingForIndex(null);
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [open, reset]);

	const handlePickLocation = useCallback((index) => {
		setPickingForIndex(index);
		setMapPickerOpen(true);
	}, []);

	const handleMapConfirm = useCallback((lat, lng) => {
		if (pickingForIndex === null) return;
		setValue(`centers.${pickingForIndex}.lat`, lat, { shouldValidate: true });
		setValue(`centers.${pickingForIndex}.lng`, lng, { shouldValidate: true });
		setMapPickerOpen(false);
		setPickingForIndex(null);
	}, [pickingForIndex, setValue]);

	const handleMapCancel = useCallback(() => {
		setMapPickerOpen(false);
		setPickingForIndex(null);
	}, []);

	const onSubmit = async (values) => {
		try {
			await create.mutateAsync(values);
			onClose();
		} catch {
			// toast handled in useCreateRoute
		}
	};

	const handleClose = () => {
		if (create.isPending) return;
		onClose();
	};

	const isPending = create.isPending || isSubmitting;

	return (
		<>
			{/* ── Create Route Modal ─────────────────────────────────────── */}
			<Modal
				open={open}
				onCancel={handleClose}
				title={
					<Space>
						<div style={{
							width: 36, height: 36, borderRadius: 8,
							background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
							display: 'flex', alignItems: 'center', justifyContent: 'center',
						}}>
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
				width={screens.md ? 640 : '95vw'}
				maskClosable={!isPending}
				closable={!isPending}
				destroyOnClose={false}
				styles={{
					header: { paddingBottom: 16 },
					body: { paddingTop: 0, maxHeight: '80dvh', overflowY: 'auto', paddingRight: 2 },
				}}
			>
				<form onSubmit={handleSubmit(onSubmit)}>
					<FieldWrapper label="Route Name" error={errors.name?.message}>
						<Controller name="name" control={control}
							render={({ field }) => (
								<StyledInput {...field} placeholder="e.g. Delhi North AM" error={errors.name?.message} />
							)}
						/>
					</FieldWrapper>

					<Divider style={{ margin: '4px 0 20px', borderColor: token.colorBorderSecondary }} />

					<div style={{
						display: 'flex', alignItems: 'center', justifyContent: 'space-between',
						marginBottom: 14, flexWrap: 'wrap', gap: 8,
					}}>
						<Space size={8}>
							<Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
								Visit Centers
							</Text>
							<Tag color="processing" style={{ fontWeight: 700 }}>{fields.length} added</Tag>
						</Space>
						<Button
							size="small" icon={<PlusOutlined />}
							onClick={() => append(makeCenter(fields.length + 1))}
							style={{ fontWeight: 600 }}
						>
							Add Center
						</Button>
					</div>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
						{fields.map((field, index) => (
							<CenterCard
								key={field.id}
								index={index}
								control={control}
								errors={errors}
								canRemove={fields.length > 1}
								onRemove={() => remove(index)}
								onPickLocation={handlePickLocation}
							/>
						))}
					</div>

					{errors.centers?.message && (
						<div style={{ color: '#ff4d4f', fontSize: 12, marginTop: 8 }}>
							{errors.centers.message}
						</div>
					)}

					<Divider style={{ margin: '20px 0 16px', borderColor: token.colorBorderSecondary }} />

					<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
						<Button
							size={screens.md ? 'large' : 'middle'}
							onClick={handleClose} disabled={isPending}
							style={{ minWidth: screens.sm ? 100 : 80 }}
						>
							Cancel
						</Button>
						<Button
							type="primary" htmlType="submit"
							size={screens.md ? 'large' : 'middle'}
							loading={isPending} icon={<EnvironmentOutlined />}
							style={{
								minWidth: screens.sm ? 160 : 120, fontWeight: 600,
								background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
								border: 'none',
							}}
						>
							{isPending ? 'Creating…' : 'Create Route'}
						</Button>
					</div>
				</form>
			</Modal>

			{/* ── Full Screen Map Picker ─────────────────────────────────── */}
			<MapPickerModal
				open={mapPickerOpen}
				centerIndex={pickingForIndex}
				onConfirm={handleMapConfirm}
				onCancel={handleMapCancel}
			/>
		</>
	);
}
