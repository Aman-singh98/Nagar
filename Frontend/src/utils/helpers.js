/**
 * Shared utility helpers used across the admin dashboard.
 */

/** Format a Date to "12 Apr 2026" */
export const fmtDate = (d) => {
   if (!d) return '—';
   return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Format a number as Indian Rupee */
export const fmtINR = (n) => n != null ? `₹${Number(n).toLocaleString('en-IN')}` : '—';

/** Capitalise first letter */
export const cap = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

/** Extract error message from axios error */
export const errMsg = (err) =>
   err?.response?.data?.message ?? err?.message ?? 'Something went wrong';

/** Role badge colour mapping */
export const roleMeta = {
   superadmin: { label: 'Super Admin', color: '#818cf8', bg: 'rgba(129,140,248,0.12)' },
   admin: { label: 'Admin', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
   manager: { label: 'Manager', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
   employee: { label: 'Employee', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

/** Assignment status colour */
export const statusMeta = {
   pending: { label: 'Pending', color: '#9999b3', bg: 'rgba(153,153,179,0.12)' },
   in_progress: { label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
   completed: { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
   skipped: { label: 'Skipped', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};
