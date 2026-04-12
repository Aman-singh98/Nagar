/**
 * @file CreateAssignmentModal.jsx
 * Modal form to create a new route assignment.
 *
 * Uses Ant Design Form + Modal instead of raw HTML form.
 * Keeps validation logic via Ant Design's built-in form rules (no extra schema lib needed).
 * Follows SRP: only responsible for the creation form UI.
 */

import { useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Button, Space } from 'antd';
import dayjs from 'dayjs';
import { useCreateAssignment } from '../../hooks/useAssignments.js';
import { useEmployees } from '../../hooks/useEmployees.js';
import { useRoutes } from '../../hooks/useRoutes.js';

const REQUIRED = [{ required: true, message: 'This field is required' }];

export default function CreateAssignmentModal({ open, onClose, selectedDate }) {
   const [form] = Form.useForm();

   const create                       = useCreateAssignment();
   const { data: empData }            = useEmployees({ role: 'employee', isActive: 'true', limit: 100 });
   const { data: routeData }          = useRoutes({ isActive: 'true', limit: 100 });

   const employees = empData?.employees ?? [];
   const routes    = routeData?.routes   ?? [];

   // Sync external selectedDate into form whenever it changes
   useEffect(() => {
      if (open) {
         form.setFieldValue('date', selectedDate ? dayjs(selectedDate) : dayjs());
      }
   }, [open, selectedDate, form]);

   const handleFinish = async (values) => {
      await create.mutateAsync({
         employeeId: values.employeeId,
         routeId:    values.routeId,
         date:       values.date.format('YYYY-MM-DD'),
      });
      form.resetFields();
      onClose();
   };

   const handleCancel = () => {
      form.resetFields();
      onClose();
   };

   return (
      <Modal
         open={open}
         onCancel={handleCancel}
         title="Assign Route"
         footer={null}
         destroyOnClose
         width={480}
      >
         <p style={{ color: 'rgba(0,0,0,0.45)', marginTop: -8, marginBottom: 20, fontSize: 13 }}>
            Assign a field route to an employee for a specific date.
         </p>

         <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            requiredMark={false}
         >
            <Form.Item label="Employee" name="employeeId" rules={REQUIRED}>
               <Select
                  placeholder="Select employee"
                  showSearch
                  optionFilterProp="label"
                  options={employees.map((e) => ({
                     value: e._id,
                     label: `${e.name} (${e.email})`,
                  }))}
               />
            </Form.Item>

            <Form.Item label="Route" name="routeId" rules={REQUIRED}>
               <Select
                  placeholder="Select route"
                  showSearch
                  optionFilterProp="label"
                  options={routes.map((r) => ({
                     value: r._id,
                     label: `${r.name} (${r.centers?.length ?? 0} centers)`,
                  }))}
               />
            </Form.Item>

            <Form.Item label="Date" name="date" rules={REQUIRED}>
               <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
               <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                  <Button onClick={handleCancel}>Cancel</Button>
                  <Button
                     type="primary"
                     htmlType="submit"
                     loading={create.isPending}
                  >
                     Create Assignment
                  </Button>
               </Space>
            </Form.Item>
         </Form>
      </Modal>
   );
}
