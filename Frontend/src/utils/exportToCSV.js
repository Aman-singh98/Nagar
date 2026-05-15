/**
 * @file utils/exportToCSV.js
 * @description Reusable CSV export utility. (F086)
 *
 * Uses browser Blob + anchor click download pattern.
 * Works in all modern browsers. No library needed.
 *
 * Usage:
 *   exportToCSV(data, 'daily-report-2026-05-01');
 *
 * @module utils/exportToCSV
 */

/**
 * Converts an array of objects to a CSV string and triggers download.
 *
 * @param {Record<string, unknown>[]} data    - Array of flat objects
 * @param {string}                   filename - Without .csv extension
 */
export const exportToCSV = (data, filename) => {
   if (!data || data.length === 0) return;

   // Extract headers from first row
   const headers = Object.keys(data[0]);

   // Build CSV rows
   const escape = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      // Wrap in quotes if contains comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
         return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
   };

   const csvRows = [
      headers.map(escape).join(','),
      ...data.map((row) => headers.map((h) => escape(row[h])).join(',')),
   ];

   const csvString = csvRows.join('\n');
   const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);

   const link = document.createElement('a');
   link.href = url;
   link.download = `${filename}.csv`;
   link.style.display = 'none';
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
};

/**
 * Flattens nested report objects for CSV export.
 * Converts Date objects to ISO strings, removes ObjectId noise.
 *
 * @param {Record<string, unknown>[]} data
 * @param {string[]} [columns] - Optional column whitelist
 * @returns {Record<string, string>[]}
 */
export const flattenForCSV = (data, columns = null) => {
   return data.map((row) => {
      const flat = {};
      const keys = columns ?? Object.keys(row);
      for (const key of keys) {
         const val = row[key];
         if (val instanceof Date) {
            flat[key] = val.toISOString();
         } else if (typeof val === 'object' && val !== null) {
            flat[key] = JSON.stringify(val);
         } else {
            flat[key] = val;
         }
      }
      return flat;
   });
};
