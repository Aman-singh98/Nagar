import { useEffect } from 'react';
import {
  Modal, Form, Input, InputNumber, Button, Divider,
  Typography, Space, Tooltip, Tag, Alert, theme, Grid,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EnvironmentOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { useCreateRoute } from '../../hooks/useRoutes.js';

const { Text } = Typography;
const { useBreakpoint } = Grid;

// ── Validation helpers ───────────────────────────────────────────────────────

const validateLat = (_, value) => {
  if (value === null || value === undefined || value === '')
    return Promise.reject('Latitude is required');
  if (value < -90 || value > 90)
    return Promise.reject('Must be between -90 and 90');
  return Promise.resolve();
};

const validateLng = (_, value) => {
  if (value === null || value === undefined || value === '')
    return Promise.reject('Longitude is required');
  if (value < -180 || value > 180)
    return Promise.reject('Must be between -180 and 180');
  return Promise.resolve();
};

// ── Default center factory ───────────────────────────────────────────────────
const makeCenter = (order) => ({
  name: '', lat: null, lng: null, radius: 100, order, address: '',
});

// ── CenterCard ───────────────────────────────────────────────────────────────
function CenterCard({ index, onRemove, canRemove }) {
  const { token }  = theme.useToken();
  const screens    = useBreakpoint();

  return (
    <div
      style={{
        border:       `1px solid ${token.colorBorderSecondary}`,  // ← token, adapts mode
        borderRadius: token.borderRadiusLG,
        overflow:     'hidden',
        background:   token.colorBgLayout,                        // ← adapts mode
      }}
    >
      {/* Card header */}
      <div
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '10px 14px',
          background:     token.colorFillQuaternary,              // ← adapts mode
          borderBottom:   `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Space size={8}>
          <div
            style={{
              width:          22,
              height:         22,
              borderRadius:   '50%',
              background:     token.colorPrimary,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       11,
              fontWeight:     700,
              color:          '#fff',
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
            display:             'grid',
            gridTemplateColumns: screens.sm ? '1fr 100px' : '1fr 80px',
            gap:                 screens.sm ? 12 : 8,
          }}
        >
          <Form.Item
            name={['centers', index, 'name']}
            label={
              <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>
                Center Name
              </Text>
            }
            rules={[
              { required: true, message: 'Name is required' },
              { min: 2, message: 'At least 2 characters' },
            ]}
            style={{ marginBottom: 12 }}
          >
            <Input
              prefix={<EnvironmentOutlined style={{ color: token.colorTextQuaternary }} />}
              placeholder="Apollo Pharmacy – MG Road"
            />
          </Form.Item>

          <Form.Item
            name={['centers', index, 'order']}
            label={
              <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>
                Order
              </Text>
            }
            rules={[{ required: true, message: 'Required' }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        {/* Row 2: Lat / Lng / Radius — stacks to 2-col on mobile */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: screens.sm ? '1fr 1fr 1fr' : '1fr 1fr',
            gap:                 screens.sm ? 12 : 8,
          }}
        >
          <Form.Item
            name={['centers', index, 'lat']}
            label={
              <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>
                Latitude
              </Text>
            }
            rules={[{ validator: validateLat }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="28.6315"
              step={0.0001}
              stringMode
            />
          </Form.Item>

          <Form.Item
            name={['centers', index, 'lng']}
            label={
              <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>
                Longitude
              </Text>
            }
            rules={[{ validator: validateLng }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="77.2167"
              step={0.0001}
              stringMode
            />
          </Form.Item>

          {/* Radius spans full width on mobile (2-col grid → takes col 1) */}
          <Form.Item
            name={['centers', index, 'radius']}
            label={
              <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>
                Radius (m)
              </Text>
            }
            rules={[
              { required: true, message: 'Required' },
              { type: 'number', min: 50,   message: 'Min 50m'   },
              { type: 'number', max: 5000, message: 'Max 5000m' },
            ]}
            style={{
              marginBottom:  12,
              // On mobile span 2 columns so it takes full width
              gridColumn:    screens.sm ? 'auto' : '1 / -1',
            }}
          >
            <InputNumber min={50} max={5000} step={10} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        {/* Row 3: Address */}
        <Form.Item
          name={['centers', index, 'address']}
          label={
            <Space size={6}>
              <Text style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary }}>
                Address
              </Text>
              <Tag style={{ fontSize: 10, lineHeight: '16px' }}>Optional</Tag>
            </Space>
          }
          style={{ marginBottom: 12 }}
        >
          <Input placeholder="Street, Area, City" />
        </Form.Item>
      </div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────────────
export default function CreateRouteModal({ open, onClose }) {
  const [form]  = Form.useForm();
  const create  = useCreateRoute();
  const { token } = theme.useToken();
  const screens   = useBreakpoint();

  const centers = Form.useWatch('centers', form) ?? [];

  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => form.resetFields(), 300);
      return () => clearTimeout(timer);
    }
  }, [open, form]);

  const handleAddCenter = () => {
    const current = form.getFieldValue('centers') ?? [];
    form.setFieldValue('centers', [...current, makeCenter(current.length + 1)]);
  };

  const handleRemoveCenter = (index) => {
    const current = form.getFieldValue('centers') ?? [];
    const updated = current
      .filter((_, i) => i !== index)
      .map((c, i) => ({ ...c, order: i + 1 }));
    form.setFieldValue('centers', updated);
  };

  const handleSubmit = async (values) => {
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

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <div
            style={{
              width:          36,
              height:         36,
              borderRadius:   8,
              background:     `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
            }}
          >
            <BranchesOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <div>
            <div
              style={{
                fontSize:   16,
                fontWeight: 700,
                lineHeight: 1.3,
                color:      token.colorText,          // ← adapts mode
              }}
            >
              Create Route
            </div>
            <div
              style={{
                fontSize:   12,
                color:      token.colorTextSecondary, // ← adapts mode
                fontWeight: 400,
              }}
            >
              Define a route with ordered visit centers
            </div>
          </div>
        </Space>
      }
      footer={null}
      width={screens.md ? 620 : '95vw'}          // ← full-width on mobile
      maskClosable={!create.isPending}
      closable={!create.isPending}
      destroyOnClose={false}
      styles={{
        header: { paddingBottom: 16 },
        body: {
          paddingTop:   0,
          maxHeight:    '75dvh',
          overflowY:    'auto',
          paddingRight: 2,
          // Modal body background adapts automatically via Ant Design theme
        },
      }}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
        initialValues={{ centers: [makeCenter(1)] }}
        size={screens.md ? 'large' : 'middle'}    // ← smaller inputs on mobile
      >
        {/* Route Name */}
        <Form.Item
          name="name"
          label={
            <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
              Route Name
            </Text>
          }
          rules={[
            { required: true, message: 'Route name is required' },
            { min: 2, message: 'At least 2 characters' },
          ]}
        >
          <Input
            prefix={
              <BranchesOutlined style={{ color: token.colorTextQuaternary }} />
            }
            placeholder="e.g. Delhi North AM"
          />
        </Form.Item>

        <Divider style={{ margin: '4px 0 20px', borderColor: token.colorBorderSecondary }} />

        {/* Centers Section Header */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   14,
            flexWrap:       'wrap',
            gap:            8,
          }}
        >
          <Space size={8}>
            <Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
              Visit Centers
            </Text>
            <Tag color="processing" style={{ fontWeight: 700 }}>
              {centers.length} added
            </Tag>
          </Space>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={handleAddCenter}
            style={{ fontWeight: 600 }}
          >
            Add Center
          </Button>
        </div>

        {/* Centers List */}
        <Form.List
          name="centers"
          rules={[
            {
              validator: async (_, list) => {
                if (!list || list.length === 0) {
                  return Promise.reject(new Error('Add at least one center'));
                }
              },
            },
          ]}
        >
          {(fields, _, { errors }) => (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {fields.map((field) => (
                  <CenterCard
                    key={field.key}
                    index={field.name}
                    canRemove={fields.length > 1}
                    onRemove={() => handleRemoveCenter(field.name)}
                  />
                ))}
              </div>
              {errors.length > 0 && (
                <Alert
                  type="error"
                  message={errors[0]}
                  showIcon
                  style={{ marginTop: 12 }}
                />
              )}
            </>
          )}
        </Form.List>

        {/* Footer */}
        <Divider style={{ margin: '20px 0 16px', borderColor: token.colorBorderSecondary }} />

        <div
          style={{
            display:        'flex',
            gap:            10,
            justifyContent: 'flex-end',
            flexWrap:       'wrap',          // stacks on very small screens
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
            icon={<EnvironmentOutlined />}
            style={{
              minWidth:   screens.sm ? 160 : 120,
              fontWeight: 600,
              // gradient uses token colours so it's consistent with the theme primary
              background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryActive} 100%)`,
              border:     'none',
            }}
          >
            {create.isPending ? 'Creating…' : 'Create Route'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
