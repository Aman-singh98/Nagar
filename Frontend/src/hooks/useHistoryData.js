import { useQuery } from '@tanstack/react-query';
import api from '../api/axios.js';

const normaliseCenter = (raw) => ({
   id: String(raw._id ?? raw.id ?? ''),
   name: raw.name ?? '',
   address: raw.address ?? '',
   visitStatus: raw.visitStatus ?? 'pending',
   visitedAt: raw.visitedAt ?? null,
});

const normaliseSession = (raw) => ({
   id: String(raw._id ?? raw.id ?? ''),
   date: (raw.date ?? '').split('T')[0],
   hoursWorked: raw.hoursWorked ?? raw.totalHours ?? 0,
   distanceKm: raw.distanceKm ?? raw.totalDistanceKm ?? 0,
   centersVisited: raw.centersVisited ?? 0,
   centersTotal: raw.centersTotal ?? 0,
   centers: Array.isArray(raw.centers) ? raw.centers.map(normaliseCenter) : [],
});

export function useHistoryData({ employeeId, lastDays = 30 } = {}) {
   return useQuery({
      queryKey: ['history', { employeeId, lastDays }],
      queryFn: async () => {
         const { data } = await api.get('/reports/employee-history', {
            params: { employeeId, lastDays },
         });
         const raw = data?.sessions ?? data?.data ?? data ?? [];
         return Array.isArray(raw) ? raw.map(normaliseSession) : [];
      },
      enabled: !!employeeId,
      staleTime: 2 * 60 * 1000,
   });
}
