/**
 * @file utils/downloadPdfReport.js
 * @description PDF report download helper.
 *
 * Calls backend GET /reports/pdf and triggers browser download.
 *
 * Usage:
 *   await downloadPdfReport({ employeeId, startDate, endDate, token });
 */

import api from '../api/axios.js';

/**
 * Downloads a PDF report for an employee.
 *
 * @param {{ employeeId: string, startDate: string, endDate: string }} params
 */
export const downloadPdfReport = async ({ employeeId, startDate, endDate }) => {
   const response = await api.get('/reports/pdf', {
      params: { employeeId, startDate, endDate },
      responseType: 'blob',
      timeout: 30_000, // 30s timeout for large reports
   });

   const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
   const link = document.createElement('a');
   link.href = url;
   link.download = `report-${employeeId}-${startDate}-${endDate}.pdf`;
   link.style.display = 'none';
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
};
