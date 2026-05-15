/**
 * @file pages/History/HistoryPage.jsx
 * @description Location history map page with polyline, timeline playback, and reports.
 *
 * Features:
 *  - F079: GPS polyline on Leaflet map
 *  - F080: Planned route overlay toggle
 *  - F081/F082: Distance + hours worked stats
 *  - F088: Date range filter
 *  - F058: Timeline playback with Play/Pause + scrubber
 *
 * @module pages/History/HistoryPage
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Select, DatePicker, Button, Card, Typography, Statistic,
  Slider, Switch, Spin, Empty, Tag, Tooltip,
} from 'antd';
import {
  PlayCircleOutlined, PauseCircleOutlined, EnvironmentOutlined,
  ClockCircleOutlined, DashboardOutlined, NodeIndexOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import dayjs from 'dayjs';
import { useEmployees } from '../../hooks/useEmployees.js';
import { useLocationMapData, useDailyReport } from '../../hooks/useReports.js';
import { STATUS_COLORS } from '../Live-map/mapUtils.js';

const { Text, Title } = Typography;
const { Option } = Select;

// ─── Constants ────────────────────────────────────────────────────────────────

const PLAYBACK_SPEED = 10; // 10x real time
const FRAME_INTERVAL = 100; // ms between animation frames

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDistance = (meters) => {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (minutes) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// ─── Map Component (Leaflet) ──────────────────────────────────────────────────

function HistoryMap({ points, centers, showPlannedRoute, playbackIndex, mapRef }) {
  const polylineRef   = useRef(null);
  const markersRef    = useRef([]);
  const centerPinsRef = useRef([]);
  const playMarkerRef = useRef(null);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;

    import('leaflet').then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map('history-map-container', {
        center: [28.6139, 77.209],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapRef]);

  // Draw polyline + start/end pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    import('leaflet').then((L) => {
      // Remove previous layers
      if (polylineRef.current) map.removeLayer(polylineRef.current);
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      // Draw polyline
      const latlngs = points.map((p) => [p.lat, p.lng]);
      polylineRef.current = L.polyline(latlngs, {
        color: '#6366f1',
        weight: 3,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(map);

      // Start pin (green)
      const startIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid #fff;box-shadow:0 2px 8px #10b98166"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markersRef.current.push(
        L.marker([points[0].lat, points[0].lng], { icon: startIcon })
          .addTo(map)
          .bindTooltip('Start', { permanent: false }),
      );

      // End pin (red)
      const endIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff;box-shadow:0 2px 8px #ef444466"></div>`,
        className: '',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      markersRef.current.push(
        L.marker([points[points.length - 1].lat, points[points.length - 1].lng], { icon: endIcon })
          .addTo(map)
          .bindTooltip('End', { permanent: false }),
      );

      // Fit bounds
      map.fitBounds(polylineRef.current.getBounds().pad(0.15));
    });
  }, [points, mapRef]);

  // Draw planned route centers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import('leaflet').then((L) => {
      centerPinsRef.current.forEach((l) => map.removeLayer(l));
      centerPinsRef.current = [];

      if (!showPlannedRoute || centers.length === 0) return;

      centers.forEach((center) => {
        const icon = L.divIcon({
          html: `<div style="width:26px;height:26px;border-radius:50%;background:#f59e0b;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">${center.order}</div>`,
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker([center.lat, center.lng], { icon })
          .addTo(map)
          .bindTooltip(center.name, { direction: 'top' });

        const circle = L.circle([center.lat, center.lng], {
          radius: center.radius,
          color: '#f59e0b',
          weight: 1.5,
          fillOpacity: 0.06,
        }).addTo(map);

        centerPinsRef.current.push(marker, circle);
      });
    });
  }, [centers, showPlannedRoute, mapRef]);

  // Update playback marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || playbackIndex === null || playbackIndex >= points.length) return;

    import('leaflet').then((L) => {
      const point = points[playbackIndex];

      if (!playMarkerRef.current) {
        const icon = L.divIcon({
          html: `<div style="width:16px;height:16px;border-radius:50%;background:#6366f1;border:3px solid #fff;box-shadow:0 0 12px #6366f1aa"></div>`,
          className: '',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        playMarkerRef.current = L.marker([point.lat, point.lng], { icon }).addTo(map);
      } else {
        playMarkerRef.current.setLatLng([point.lat, point.lng]);
      }

      map.panTo([point.lat, point.lng], { animate: true, duration: 0.3 });
    });
  }, [playbackIndex, points, mapRef]);

  return (
    <div
      id="history-map-container"
      style={{ width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDate,     setSelectedDate]     = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showPlannedRoute, setShowPlannedRoute] = useState(true);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [playbackIndex,    setPlaybackIndex]    = useState(null);

  const mapRef      = useRef(null);
  const rafRef      = useRef(null);
  const lastTickRef = useRef(null);

  const { data: empData } = useEmployees({ limit: 100 });
  const employees = empData?.employees ?? [];

  const { data: mapData, isLoading: mapLoading } = useLocationMapData({
    employeeId: selectedEmployee,
    date:       selectedDate,
    enabled:    !!(selectedEmployee && selectedDate),
  });

  const points   = mapData?.points   ?? [];
  const centers  = mapData?.assignment?.centers ?? [];
  const summary  = mapData?.summary  ?? {};

  // ── Playback ────────────────────────────────────────────────────────────────

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const startPlayback = useCallback(() => {
    if (points.length === 0) return;
    setPlaybackIndex(0);
    setIsPlaying(true);
    lastTickRef.current = performance.now();
  }, [points]);

  useEffect(() => {
    if (!isPlaying || points.length === 0) return;

    const tick = (now) => {
      const elapsed = now - (lastTickRef.current ?? now);
      if (elapsed >= FRAME_INTERVAL) {
        lastTickRef.current = now;
        setPlaybackIndex((prev) => {
          const next = (prev ?? 0) + 1;
          if (next >= points.length) {
            stopPlayback();
            return points.length - 1;
          }
          return next;
        });
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, points, stopPlayback]);

  const handleSliderChange = useCallback((val) => {
    stopPlayback();
    setPlaybackIndex(val);
  }, [stopPlayback]);

  const currentPointTime = playbackIndex !== null && points[playbackIndex]
    ? format(new Date(points[playbackIndex].timestamp), 'HH:mm:ss')
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, minHeight: '100%' }}>
      <Title level={3} style={{ margin: '0 0 20px', color: 'var(--text)', fontWeight: 800 }}>
        Location History
      </Title>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Card
        style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 20 }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select
            placeholder="Select employee"
            style={{ width: 220 }}
            value={selectedEmployee}
            onChange={setSelectedEmployee}
            showSearch
            optionFilterProp="children"
          >
            {employees.map((e) => (
              <Option key={e._id} value={e._id}>{e.name}</Option>
            ))}
          </Select>

          <DatePicker
            value={selectedDate ? dayjs(selectedDate) : null}
            onChange={(_, dateStr) => setSelectedDate(dateStr)}
            style={{ width: 160 }}
            disabledDate={(d) => d && d > dayjs()}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <Text style={{ fontSize: 13, color: 'var(--text-2)' }}>Planned route</Text>
            <Switch
              checked={showPlannedRoute}
              onChange={setShowPlannedRoute}
              size="small"
            />
          </div>
        </div>
      </Card>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      {summary.totalPoints > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { icon: <NodeIndexOutlined />, label: 'Distance', value: formatDistance(summary.distanceMeters), color: '#6366f1' },
            { icon: <ClockCircleOutlined />, label: 'Duration', value: formatDuration(summary.durationMinutes), color: '#f59e0b' },
            { icon: <DashboardOutlined />, label: 'GPS Points', value: summary.totalPoints, color: '#10b981' },
            { icon: <EnvironmentOutlined />, label: 'Centers', value: `${centers.length}`, color: '#3b82f6' },
          ].map(({ icon, label, value, color }) => (
            <Card
              key={label}
              style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', flex: '1 1 140px' }}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color, fontSize: 18 }}>{icon}</span>
                <div>
                  <Text style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>{label}</Text>
                  <Text strong style={{ fontSize: 16, color: 'var(--text)' }}>{value}</Text>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <Card
        style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: 16 }}
        styles={{ body: { padding: 0, height: 480, position: 'relative' } }}
      >
        {mapLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, background: 'var(--surface)', borderRadius: 12 }}>
            <Spin size="large" />
          </div>
        )}

        {!selectedEmployee ? (
          <Empty description="Select an employee to view location history" style={{ paddingTop: 160 }} />
        ) : !mapLoading && points.length === 0 ? (
          <Empty description="No location data for this date" style={{ paddingTop: 160 }} />
        ) : (
          <HistoryMap
            points={points}
            centers={centers}
            showPlannedRoute={showPlannedRoute}
            playbackIndex={playbackIndex}
            mapRef={mapRef}
          />
        )}
      </Card>

      {/* ── Playback controls ────────────────────────────────────────────── */}
      {points.length > 0 && (
        <Card
          style={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }}
          styles={{ body: { padding: '14px 20px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
              <Button
                type="primary"
                shape="circle"
                icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isPlaying ? stopPlayback : startPlayback}
                size="large"
              />
            </Tooltip>

            <div style={{ flex: 1 }}>
              <Slider
                min={0}
                max={Math.max(0, points.length - 1)}
                value={playbackIndex ?? 0}
                onChange={handleSliderChange}
                tooltip={{ formatter: (val) => points[val] ? format(new Date(points[val].timestamp), 'HH:mm:ss') : '' }}
              />
            </div>

            {currentPointTime && (
              <Tag color="purple" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                {currentPointTime}
              </Tag>
            )}
          </div>
          <Text style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, display: 'block' }}>
            Playback at 10× speed · {points.length} GPS points · drag scrubber to jump to any moment
          </Text>
        </Card>
      )}
    </div>
  );
}