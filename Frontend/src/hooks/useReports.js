/**
 * @file hooks/useReports.js
 * @description React Query hooks for report and location history endpoints.
 *
 * @module hooks/useReports
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const PDF_TIMEOUT_MS = 30_000; // 30s

/**
 * Returns the stored auth token from localStorage.
 * Adjust the key to match your auth implementation.
 *
 * @returns {string}
 */
const getAuthToken = () => localStorage.getItem('accessToken') ?? '';

/**
 * Shared fetch wrapper with auth header and JSON error handling.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<any>}
 */
const apiFetch = async (url, options = {}) => {
	const response = await fetch(url, {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${getAuthToken()}`,
			...options.headers,
		},
	});

	if (!response.ok) {
		const errorBody = await response.json().catch(() => ({}));
		throw new Error(errorBody.message ?? `HTTP ${response.status}`);
	}

	return response;
};

// ─── F085: Team Comparison Report Hook ───────────────────────────────────────

/**
 * Fetches the team comparison KPIs for a given date.
 *
 * @returns {{
 *   data: Array|null,
 *   isLoading: boolean,
 *   error: string|null,
 *   fetchTeamReport: (date: string) => Promise<void>
 * }}
 */
export const useTeamReport = () => {
	const [data, setData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchTeamReport = useCallback(async (date) => {
		setIsLoading(true);
		setError(null);

		try {
			const res = await apiFetch(`${API_BASE}/reports/team?date=${date}`);
			const json = await res.json();
			setData(json.data?.employees ?? []);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { data, isLoading, error, fetchTeamReport };
};

// ─── F084: Center Visit History Hook ─────────────────────────────────────────

/**
 * Fetches visit history for a specific center within a date range.
 *
 * @returns {{
 *   data: Array|null,
 *   isLoading: boolean,
 *   error: string|null,
 *   fetchCenterHistory: (centerId: string, startDate: string, endDate: string) => Promise<void>
 * }}
 */
export const useCenterVisitHistory = () => {
	const [data, setData] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	const fetchCenterHistory = useCallback(async (centerId, startDate, endDate) => {
		setIsLoading(true);
		setError(null);

		try {
			const url = `${API_BASE}/centers/${centerId}/visits?startDate=${startDate}&endDate=${endDate}`;
			const res = await apiFetch(url);
			const json = await res.json();
			setData(json.data?.visits ?? []);
		} catch (err) {
			setError(err.message);
		} finally {
			setIsLoading(false);
		}
	}, []);

	return { data, isLoading, error, fetchCenterHistory };
};

// ─── F087: PDF Download Hook ──────────────────────────────────────────────────

/**
 * Calls the PDF endpoint and triggers a browser file download.
 * Handles the 30-second timeout recommended in the Week 19 tip.
 *
 * @returns {{
 *   isGenerating: boolean,
 *   error: string|null,
 *   downloadPdfReport: (params: { employeeId, startDate, endDate }) => Promise<void>
 * }}
 */
export const usePdfDownload = () => {
	const [isGenerating, setIsGenerating] = useState(false);
	const [error, setError] = useState(null);

	const downloadPdfReport = useCallback(async ({ employeeId, startDate, endDate }) => {
		setIsGenerating(true);
		setError(null);

		// AbortController enables the 30-second timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), PDF_TIMEOUT_MS);

		try {
			const url = `${API_BASE}/reports/pdf?employeeId=${employeeId}&startDate=${startDate}&endDate=${endDate}`;

			const response = await fetch(url, {
				credentials: 'include',
				headers: { Authorization: `Bearer ${getAuthToken()}` },
				signal: controller.signal,
			});

			if (!response.ok) {
				const errBody = await response.json().catch(() => ({}));
				throw new Error(errBody.message ?? `HTTP ${response.status}`);
			}

			// Stream the binary blob and trigger download
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');

			// Extract filename from Content-Disposition header if available
			const disposition = response.headers.get('Content-Disposition') ?? '';
			const match = disposition.match(/filename="([^"]+)"/);
			anchor.download = match ? match[1] : `report_${employeeId}.pdf`;
			anchor.href = blobUrl;
			anchor.style.display = 'none';

			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(blobUrl);

		} catch (err) {
			if (err.name === 'AbortError') {
				setError('PDF generation timed out. Try a shorter date range.');
			} else {
				setError(err.message);
			}
		} finally {
			clearTimeout(timeoutId);
			setIsGenerating(false);
		}
	}, []);

	return { isGenerating, error, downloadPdfReport };
};


export const reportKeys = {
	all: () => ['reports'],
	daily: (params) => [...reportKeys.all(), 'daily', params],
	weekly: (params) => [...reportKeys.all(), 'weekly', params],
	mapData: (params) => [...reportKeys.all(), 'map', params],
};

/**
 * Fetch daily report for one or all employees.
 *
 * @param {{ date?: string, employeeId?: string, startDate?: string, endDate?: string, enabled?: boolean }} params
 */
export const useDailyReport = ({ date, employeeId, startDate, endDate, enabled = true } = {}) => {
	return useQuery({
		queryKey: reportKeys.daily({ date, employeeId, startDate, endDate }),
		queryFn: () =>
			api.get('/reports/daily', {
				params: { date, employeeId, startDate, endDate },
			}).then((r) => r.data.data ?? r.data),
		enabled: enabled && !!(date || (startDate && endDate)),
		staleTime: 2 * 60 * 1000,
	});
};

/**
 * Fetch weekly report for one employee.
 *
 * @param {{ employeeId: string, weekStart: string, enabled?: boolean }} params
 */
export const useWeeklyReport = ({ employeeId, weekStart, enabled = true } = {}) => {
	return useQuery({
		queryKey: reportKeys.weekly({ employeeId, weekStart }),
		queryFn: () =>
			api.get('/reports/weekly', {
				params: { employeeId, weekStart },
			}).then((r) => r.data.data ?? r.data),
		enabled: enabled && !!(employeeId && weekStart),
		staleTime: 2 * 60 * 1000,
	});
};

/**
 * Fetch location map data (GPS polyline points + assignment info).
 *
 * @param {{ employeeId: string, date: string, enabled?: boolean }} params
 */
export const useLocationMapData = ({ employeeId, date, enabled = true } = {}) => {
	return useQuery({
		queryKey: reportKeys.mapData({ employeeId, date }),
		queryFn: () =>
			api.get('/locations/map', {
				params: { employeeId, date },
			}).then((r) => r.data.data ?? r.data),
		enabled: enabled && !!(employeeId && date),
		staleTime: 5 * 60 * 1000,
	});
};