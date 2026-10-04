import { useState, useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import { MapPin, Navigation, AlertTriangle, Loader, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createMapIcon = (color) => new L.DivIcon({
  className: 'map-marker-v2',
  html: `<div class="marker-core" style="background: ${color}"></div><div class="marker-halo" style="border-color: ${color}"></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const UserMarkerIcon = new L.DivIcon({
  className: 'user-marker-v2',
  html: '<div class="user-pulse"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const ManualPinIcon = new L.DivIcon({
  className: 'manual-pin-v2',
  html: '<div class="manual-pin-core">📍</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Recenter map when center changes
function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Handle click-to-place-manual-pin
function ManualPinHandler({ enabled, onPin }) {
  useMapEvents({
    click(e) {
      if (enabled) {
        onPin([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

const GEO_ERROR_MESSAGES = {
  1: 'Location permission denied. Tap anywhere on the map to place your pin manually.',
  2: 'Location signal unavailable. You can place a pin manually by clicking the map.',
  3: 'Location request timed out. Try again or place a pin manually.',
};

const DEFAULT_CENTER = [28.6139, 77.2090];

export default function MapView() {
  const { t } = useTranslation();
  const { tasks } = useAppContext();

  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);
  const [activeTask, setActiveTask] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | detecting | granted | denied | error
  const [geoToast, setGeoToast] = useState(null);
  const [manualPinMode, setManualPinMode] = useState(false);
  const [manualPin, setManualPin] = useState(null);

  const showGeoToast = (msg, type = 'info') => {
    setGeoToast({ msg, type });
    setTimeout(() => setGeoToast(null), 5000);
  };

  // Auto-detect on mount
  useEffect(() => {
    attemptGeoLocation();
  }, []);

  const attemptGeoLocation = useCallback(async () => {
    console.log('[GPS] Syncing user position...');
    if (!('geolocation' in navigator)) {
      console.warn('[GPS] Geolocation API not supported by browser.');
      setGeoStatus('denied');
      setManualPinMode(true);
      showGeoToast('Geolocation not supported. Click the map to place your location.', 'warning');
      return;
    }

    setGeoToast(null);

    // ── 1. Query Geolocation Permission State ────────────────────
    let permissionState = 'prompt';
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const statusObj = await navigator.permissions.query({ name: 'geolocation' });
        permissionState = statusObj.state;
        console.log(`[GPS] Geolocation query state: "${permissionState}"`);
        
        statusObj.onchange = () => {
          console.log(`[GPS] Dynamic Geolocation state updated to: "${statusObj.state}"`);
        };
      } catch (err) {
        console.warn('[GPS] Geolocation status check failed, using fallback direct prompt:', err.message);
      }
    }

    if (permissionState === 'denied') {
      console.warn('[GPS] Geolocation permission is blocked by browser configuration.');
      setGeoStatus('denied');
      setManualPinMode(true);
      showGeoToast('Location access denied. You can manually place a marker on the map.', 'warning');
      return;
    }

    // ── 2. Request Geolocation Coordinates ──────────────────────────
    setGeoStatus('detecting');
    console.log('[GPS] Launching browser geolocation request...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = [pos.coords.latitude, pos.coords.longitude];
        console.log('[GPS] Geolocation successful. Coordinates returned:', center);
        
        setUserLocation(center);
        setGeoStatus('granted');
        setManualPinMode(false);
        showGeoToast('✓ Location synced successfully.', 'success');
      },
      (err) => {
        console.error('[GPS] Geolocation error encountered.', {
          code: err.code,
          message: err.message,
        });

        if (err.code === 1) {
          // PERMISSION_DENIED
          console.warn('[GPS] User denied location permission request.');
          setGeoStatus('denied');
          setManualPinMode(true);
          showGeoToast('Location access denied. You can manually place a marker on the map.', 'warning');
        } else {
          // POSITION_UNAVAILABLE (2) or TIMEOUT (3)
          console.warn('[GPS] Geolocation failed (timeout/unavailable signal). Not a permission block.');
          setGeoStatus('error'); // Flag as standard error rather than denied
          const msg = GEO_ERROR_MESSAGES[err.code] || 'Location signal unavailable. Try again or place pin manually.';
          showGeoToast(msg, 'warning');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  const handleManualPin = useCallback((latlng) => {
    setManualPin(latlng);
    setUserLocation(latlng);
    showGeoToast(`✓ Location set manually at ${latlng[0].toFixed(4)}, ${latlng[1].toFixed(4)}`, 'success');
  }, []);

  const markers = useMemo(() =>
    tasks.map((task) => ({
      ...task,
      icon: createMapIcon(
        task.urgency === 'Critical' ? '#E74C3C' :
        task.urgency === 'High'     ? '#E67E22' :
        task.status === 'Verified'  ? '#2ECC71' : 'var(--primary)'
      ),
    })), [tasks]);

  return (
    <div className="map-view animate-fade-in">
      <div className="map-sidebar">
        <header className="sidebar-header">
          <h1>{t('nav.map')}</h1>
          <p className="text-muted">{t('map.subtitle')}</p>
        </header>

        <div className="map-stats-panel mt-lg">
          <div className="map-stat-card">
            <span className="stat-num">{tasks.filter((t) => t.status === 'Reported').length}</span>
            <span className="stat-label">{t('map.stats.active')}</span>
          </div>
          <div className="map-stat-card">
            <span className="stat-num">{tasks.filter((t) => t.status === 'In Progress').length}</span>
            <span className="stat-label">{t('map.stats.rescue')}</span>
          </div>
        </div>

        {/* Location sync button */}
        <button
          className={`btn btn-primary w-full mt-lg ${geoStatus === 'detecting' ? 'loading' : ''}`}
          onClick={attemptGeoLocation}
          disabled={geoStatus === 'detecting'}
        >
          {geoStatus === 'detecting' ? (
            <><Loader size={18} className="spin" /> Detecting...</>
          ) : (
            <><Navigation size={18} /> {t('map.sync')}</>
          )}
        </button>

        {/* Manual pin toggle */}
        {(geoStatus === 'denied' || geoStatus === 'error') && (
          <button
            className={`btn w-full mt-sm ${manualPinMode ? 'btn-teal' : 'btn-outline'}`}
            onClick={() => setManualPinMode((prev) => !prev)}
          >
            <MapPin size={18} />
            {manualPinMode ? '📍 Click map to place pin' : 'Place pin manually'}
          </button>
        )}

        {/* Geo status message */}
        {geoStatus === 'denied' && (
          <div className="location-denied-notice mt-sm">
            <AlertTriangle size={14} />
            <span>Location permission denied. You can manually place a marker by clicking the map.</span>
          </div>
        )}

        {/* Recent reports feed */}
        <div className="report-feed mt-xl">
          <h3>{t('map.recent')}</h3>
          <div className="feed-list">
            {tasks.length === 0 ? (
              <div className="empty-feed-warm">
                <span>🌿</span>
                <p>Your area is calm right now. Reports will appear here as they come in.</p>
              </div>
            ) : (
              tasks.slice(0, 8).map((task) => {
                const taskId = task._id || task.id;
                const isActive = activeTask && (activeTask._id || activeTask.id) === taskId;
                return (
                  <div
                    key={taskId}
                    className={`feed-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTask(task);
                      if (task.location?.lat && task.location?.lng) {
                        setUserLocation([task.location.lat, task.location.lng]);
                      }
                    }}
                  >
                    <div className={`urgency-dot ${task.urgency?.toLowerCase()}`} />
                    <div className="feed-content">
                      <span className="feed-title">
                        {task.animalType || 'Animal'} • {task.urgency}
                      </span>
                      <p className="feed-desc">
                        {(task.description || '').slice(0, 45)}{task.description?.length > 45 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="map-content">
        {/* Geo toast overlay */}
        {geoToast && (
          <div className={`map-toast ${geoToast.type}`}>
            <span>{geoToast.msg}</span>
            <button onClick={() => setGeoToast(null)}><X size={14} /></button>
          </div>
        )}

        {/* Manual pin hint */}
        {manualPinMode && (
          <div className="manual-pin-hint">
            📍 Click anywhere on the map to place your location
          </div>
        )}

        <MapContainer
          center={userLocation}
          zoom={14}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
          cursor={manualPinMode ? 'crosshair' : 'grab'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
          />

          <MapRecenter center={userLocation} />
          <ManualPinHandler enabled={manualPinMode} onPin={handleManualPin} />

          {/* User / manual marker */}
          <Marker position={userLocation} icon={manualPin ? ManualPinIcon : UserMarkerIcon}>
            <Popup>
              <div className="user-popup">
                <strong>{manualPin ? 'Your placed location' : t('map.user_title')}</strong>
                <span>{manualPin ? 'Manually placed pin' : t('map.user_subtitle')}</span>
              </div>
            </Popup>
          </Marker>

          {/* Task markers */}
          {markers.map((task) => {
            const taskId = task._id || task.id;
            if (!task.location?.lat || !task.location?.lng) return null;
            return (
              <Marker
                key={taskId}
                position={[task.location.lat, task.location.lng]}
                icon={task.icon}
                eventHandlers={{ click: () => setActiveTask(task) }}
              >
                <Popup>
                  <div className="task-popup">
                    <div className="popup-header">
                      <strong>{t('map.animal_in_need')}</strong>
                      <span className={`badge ${task.urgency?.toLowerCase()}`}>{task.urgency}</span>
                    </div>
                    <p>{task.description}</p>
                    <div className="popup-actions">
                      <button className="btn-sm btn-primary">{t('map.help_now')}</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Active task radius circle */}
          {activeTask?.location?.lat && activeTask?.location?.lng && (
            <Circle
              center={[activeTask.location.lat, activeTask.location.lng]}
              radius={300}
              pathOptions={{ color: 'var(--primary)', fillColor: 'var(--primary)', fillOpacity: 0.1 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
