import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import {
  AlertTriangle, Clock, CheckCircle, Plus, Shield, MapPin, Eye,
  Heart, X, Send, Camera, Navigation, Loader, CheckSquare, ImageOff, LocateFixed, Move, Map
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import 'leaflet/dist/leaflet.css';
import './TaskBoard.css';

// ── Location helpers ───────────────────────────────────────────────────────
const GEO_ERRORS = {
  1: 'Location permission denied. Place the rescue pin manually before submitting.',
  2: 'Location signal unavailable. Place the rescue pin manually before submitting.',
  3: 'Location timed out. Try again or place the rescue pin manually.',
};

const DEFAULT_MAP_CENTER = [28.6139, 77.2090];

const RescuePinIcon = new L.DivIcon({
  className: 'report-location-pin',
  html: '<div class="report-location-pin-core"></div><div class="report-location-pin-pulse"></div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const getReadableLocationParts = (payload = {}) => {
  const address = payload.address || {};
  const area = address.neighbourhood || address.suburb || address.quarter || address.road || address.hamlet || address.village || '';
  const city = address.city || address.town || address.municipality || address.county || '';
  const state = address.state || address.region || '';
  const country = address.country || '';

  return {
    address: payload.display_name || [area, city, state, country].filter(Boolean).join(', '),
    area,
    city,
    state,
    country,
  };
};

function ModalMapRecenter({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) map.setView(center, 17, { animate: true });
  }, [center, map]);

  return null;
}

function ModalMapTapHandler({ enabled, onPlace }) {
  useMapEvents({
    click(event) {
      if (enabled) onPlace({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

// ── Image → base64 ─────────────────────────────────────────────────────────
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export default function TaskBoard() {
  const { t } = useTranslation();
  const { tasks, addReport, updateTask, verifyTask, currentUser, loading, error, setError } = useAppContext();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [toast, setToast] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Form state
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | detecting | granted | denied
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationNote, setLocationNote] = useState('');
  const [locationDetails, setLocationDetails] = useState(null);
  const [adjustLocationMode, setAdjustLocationMode] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef();

  const filteredTasks = tasks.filter((t) =>
    filter === 'all' ||
    (filter === 'unassigned' && t.status === 'Reported') ||
    t.status.toLowerCase() === filter.toLowerCase()
  );

  const triggerToast = (msg, type = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 4000);
  };

  const openForm = () => {
    setShowForm(true);
    setFormError(null);
    setLocationStatus('idle');
    setLocationCoords(null);
    setLocationNote('');
    setLocationDetails(null);
    setAdjustLocationMode(false);
    setReverseGeocoding(false);
    setImages([]);
    setImagePreviews([]);
    // Auto-detect location when form opens
    detectLocation();
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError(null);
    setSubmitting(false);
    setAdjustLocationMode(false);
  };

  const routeLocation = useLocation();

  useEffect(() => {
    if (routeLocation.state?.openForm) {
      openForm();
      // Clear route state so it doesn't open again on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [routeLocation]);

  useEffect(() => {
    if (!showForm) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showForm]);

  const reverseGeocodeLocation = useCallback(async (coords, accuracy, source = 'gps') => {
    setReverseGeocoding(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );

      if (!response.ok) throw new Error('Reverse geocoding failed');

      const payload = await response.json();
      const readable = getReadableLocationParts(payload);
      setLocationDetails({
        ...readable,
        accuracy,
        source,
        confirmed: false,
      });
      setLocationNote(readable.area || readable.city ? 'Location detected. Please verify the rescue pin.' : 'Coordinates detected. Please verify the rescue pin.');
    } catch (err) {
      console.warn('[GPS-Form] Reverse geocoding failed:', err.message);
      setLocationDetails({
        address: '',
        area: '',
        city: '',
        state: '',
        country: '',
        accuracy,
        source,
        confirmed: false,
      });
      setLocationNote('Coordinates detected. Address lookup failed, but you can still adjust and confirm the pin.');
    } finally {
      setReverseGeocoding(false);
    }
  }, []);

  const setPreciseLocation = useCallback((coords, accuracy = null, source = 'manual') => {
    setLocationCoords(coords);
    setLocationStatus(source === 'gps' ? 'granted' : 'granted');
    setLocationDetails((prev) => ({
      address: '',
      area: '',
      city: '',
      state: '',
      country: '',
      ...prev,
      accuracy,
      source,
      confirmed: false,
    }));
    reverseGeocodeLocation(coords, accuracy, source);
  }, [reverseGeocodeLocation]);

  const confirmLocation = () => {
    if (!locationCoords) {
      setFormError('Please detect your GPS location or place the rescue pin manually.');
      return;
    }
    setLocationDetails((prev) => ({
      address: '',
      area: '',
      city: '',
      state: '',
      country: '',
      accuracy: null,
      source: 'manual',
      ...prev,
      confirmed: true,
    }));
    setAdjustLocationMode(false);
    setFormError(null);
    setLocationNote('Location confirmed for rescue dispatch.');
  };

  // ── Location detection ────────────────────────────────────────────────
  const detectLocation = async () => {
    console.log('[GPS-Form] Detecting location...');
    if (!('geolocation' in navigator)) {
      console.warn('[GPS-Form] Geolocation not supported by this browser.');
      setLocationStatus('denied');
      setAdjustLocationMode(true);
      setLocationNote('Geolocation not supported in this browser. Place the rescue pin manually.');
      return;
    }

    let permissionState = 'prompt';
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      try {
        const statusObj = await navigator.permissions.query({ name: 'geolocation' });
        permissionState = statusObj.state;
        console.log(`[GPS-Form] Permission state check: "${permissionState}"`);
      } catch (err) {
        console.warn('[GPS-Form] Permissions status check failed, querying direct GPS prompt:', err.message);
      }
    }

    if (permissionState === 'denied') {
      console.warn('[GPS-Form] Geolocation is explicitly blocked.');
      setLocationStatus('denied');
      setAdjustLocationMode(true);
      setLocationNote('Location access denied. Place the rescue pin manually.');
      return;
    }

    setLocationStatus('detecting');
    setLocationNote('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log('[GPS-Form] Geolocation coordinates successfully received:', coords);
        setAdjustLocationMode(false);
        setPreciseLocation(coords, pos.coords.accuracy, 'gps');
      },
      (err) => {
        console.error('[GPS-Form] Geolocation retrieval failed.', {
          code: err.code,
          message: err.message,
        });

        if (err.code === 1) {
          // PERMISSION_DENIED
          setLocationStatus('denied');
          setAdjustLocationMode(true);
          setLocationNote('Location access denied. Place the rescue pin manually.');
        } else {
          // TIMEOUT (3) or POSITION_UNAVAILABLE (2)
          setLocationStatus('error');
          setAdjustLocationMode(true);
          setLocationNote(GEO_ERRORS[err.code] || 'Location signal unavailable. Place the rescue pin manually.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Image handling ────────────────────────────────────────────────────
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // Size guard: max 2MB per image
    const oversized = files.filter((f) => f.size > 2 * 1024 * 1024);
    if (oversized.length) {
      setFormError(`Image "${oversized[0].name}" is too large. Max 2MB per image.`);
      return;
    }

    try {
      const base64s = await Promise.all(files.map(fileToBase64));
      setImages((prev) => [...prev, ...base64s]);
      setImagePreviews((prev) => [...prev, ...base64s]);
      setFormError(null);
    } catch {
      setFormError('Image upload failed. Please try a different image.');
    }
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Form submit ───────────────────────────────────────────────────────
  const handleReport = async (e) => {
    e.preventDefault();
    setFormError(null);

    const animalType = e.target.animalType.value;
    const urgency = e.target.urgency.value;
    const description = e.target.description.value.trim();

    // Client-side validation
    if (!description || description.length < 5) {
      setFormError('Please describe the situation (minimum 5 characters).');
      return;
    }

    if (images.length === 0) {
      setFormError('Please upload at least one image of the animal.');
      return;
    }

    if (!locationCoords) {
      setFormError('Please detect your GPS location or place the rescue pin manually.');
      return;
    }

    if (!locationDetails?.confirmed) {
      setFormError('Please confirm the rescue location before submitting.');
      return;
    }

    const location = {
      lat: locationCoords.lat,
      lng: locationCoords.lng,
      address: locationDetails?.address || '',
      area: locationDetails?.area || '',
      city: locationDetails?.city || '',
      state: locationDetails?.state || '',
      country: locationDetails?.country || '',
      accuracy: locationDetails?.accuracy,
      source: locationDetails?.source || 'manual',
      confirmed: true,
    };

    setSubmitting(true);
    try {
      await addReport({ animalType, urgency, description, images, location });
      closeForm();
      triggerToast('Emergency report submitted successfully. Nearby responders can now see this case.', 'success');
    } catch (err) {
      setSubmitting(false);
      // Show the exact backend error message
      const msg = err.message || 'Report submission failed.';
      setFormError(msg);
    }
  };

  // ── Task status update ────────────────────────────────────────────────
  const handleStatusUpdate = async (id, status) => {
    try {
      if (status === 'Verified') {
        const success = await verifyTask(id);
        if (success) triggerToast('Rescue verified! This animal is now safe. 🦺', 'success');
      } else {
        await updateTask(id, status);
        if (status === 'In Progress') triggerToast('Task accepted. Every life matters. 💚', 'success');
        if (status === 'Completed') triggerToast('Task completed! Great work.', 'success');
      }
    } catch (err) {
      triggerToast(err.message || 'Action failed.', 'error');
    }
  };

  const urgencyColors = { Low: 'low', Medium: 'medium', High: 'high', Critical: 'critical' };
  const modalMapCenter = locationCoords ? [locationCoords.lat, locationCoords.lng] : DEFAULT_MAP_CENTER;
  const locationTitle = locationDetails?.area || locationDetails?.city || 'Precise rescue pin';
  const locationSubtitle = [locationDetails?.city, locationDetails?.state, locationDetails?.country].filter(Boolean).join(', ');
  const locationAccuracy = typeof locationDetails?.accuracy === 'number'
    ? `±${Math.round(locationDetails.accuracy)} meters`
    : 'Manual precision';

  return (
    <div className="task-board animate-fade-in">
      <header className="board-header mb-xl">
        <div className="header-info">
          <h1>Rescue Operations Board</h1>
          <p className="text-muted">Real-time emergency dispatch queue, automated triage, and volunteer field tracking</p>
        </div>
        <button className="btn btn-primary" onClick={openForm}>
          <Plus size={20} />
          <span>{t('tasks.new_report')}</span>
        </button>
      </header>

      {/* ── Report Form Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="form-overlay" onClick={closeForm}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form className="report-form" onSubmit={handleReport} noValidate>
              <div className="form-header">
                <h2>{t('tasks.form.title')}</h2>
                <button type="button" className="close-btn" onClick={closeForm}>
                  <X size={24} />
                </button>
              </div>

              {/* Form error banner */}
              {formError && (
                <div className="form-error-banner">
                  <AlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}

              <div className="form-body">
                {/* Animal Type */}
                <div className="field-group">
                  <label>{t('tasks.form.animal_type')}</label>
                  <select name="animalType" className="form-select">
                    <option value="dog">Dog</option>
                    <option value="cat">Cat</option>
                    <option value="cow">Cow / Cattle</option>
                    <option value="bull">Bull</option>
                    <option value="goat">Goat</option>
                    <option value="pig">Pig</option>
                    <option value="bird">Bird</option>
                    <option value="monkey">Monkey</option>
                    <option value="wildlife">Other Wildlife</option>
                  </select>
                </div>

                {/* Urgency */}
                <div className="field-group">
                  <label>{t('tasks.form.urgency')}</label>
                  <select name="urgency" className="form-select">
                    <option value="Low">Low — Needs attention soon</option>
                    <option value="Medium" selected>Medium — Needs help today</option>
                    <option value="High">High — In distress now</option>
                    <option value="Critical">Critical — Life threatening</option>
                  </select>
                </div>

                {/* Description */}
                <div className="field-group">
                  <label>{t('tasks.form.details')}</label>
                  <textarea
                    name="description"
                    className="form-textarea"
                    rows="4"
                    placeholder="Describe what you see — injuries, behaviour, exact location details..."
                    required
                  />
                </div>

                {/* Image Upload */}
                <div className="field-group">
                  <label>
                    Photos <span className="field-required">*</span>
                    <span className="field-hint"> — At least 1 photo required</span>
                  </label>

                  {imagePreviews.length > 0 && (
                    <div className="image-preview-grid">
                      {imagePreviews.map((src, idx) => (
                        <div key={idx} className="preview-item">
                          <img src={src} alt={`Preview ${idx + 1}`} />
                          <button
                            type="button"
                            className="remove-image-btn"
                            onClick={() => removeImage(idx)}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="image-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera size={20} />
                    <span>{images.length > 0 ? 'Add More Photos' : 'Upload Photos'}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </div>

                {/* Location Status */}
                <div className="field-group">
                  <label>Location</label>
                  <div className={`location-panel ${locationStatus}`}>
                    <div className="location-status-row">
                      <div className="location-status-copy">
                        {locationStatus === 'detecting' && <Loader size={18} className="spin" />}
                        {locationStatus === 'granted' && <LocateFixed size={18} />}
                        {(locationStatus === 'denied' || locationStatus === 'error' || locationStatus === 'idle') && <MapPin size={18} />}
                        <span>
                          {locationStatus === 'idle' ? 'Location will be auto-detected.' : locationNote}
                          {reverseGeocoding && ' Fetching address...'}
                        </span>
                      </div>
                      <button type="button" className="retry-location-btn" onClick={detectLocation} disabled={locationStatus === 'detecting'}>
                        Retry GPS
                      </button>
                    </div>

                    <div className="location-card">
                      <div>
                        <span className="location-eyebrow">
                          {locationDetails?.confirmed ? 'Location Confirmed' : locationCoords ? 'Location Detected' : 'Awaiting Location'}
                        </span>
                        <h3>{locationCoords ? locationTitle : 'Detect GPS or place pin'}</h3>
                        {locationCoords && (
                          <>
                            <p>{locationSubtitle || locationDetails?.address || 'Address lookup unavailable'}</p>
                            <div className="coordinate-grid">
                              <span>Lat: {locationCoords.lat.toFixed(6)}</span>
                              <span>Lng: {locationCoords.lng.toFixed(6)}</span>
                              <span>Accuracy: {locationAccuracy}</span>
                            </div>
                          </>
                        )}
                      </div>
                      {locationDetails?.confirmed && <CheckCircle size={22} className="location-confirmed-icon" />}
                    </div>

                    <div className={`location-map-preview ${adjustLocationMode ? 'adjusting' : ''}`}>
                      {adjustLocationMode && (
                        <div className="map-adjust-hint">
                          Tap the map or drag the pin to set the exact rescue point.
                        </div>
                      )}
                      <MapContainer
                        center={modalMapCenter}
                        zoom={locationCoords ? 17 : 12}
                        scrollWheelZoom={true}
                        className="report-location-map"
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <ModalMapRecenter center={modalMapCenter} />
                        <ModalMapTapHandler enabled={adjustLocationMode} onPlace={(coords) => setPreciseLocation(coords, null, 'manual')} />
                        {locationCoords && (
                          <Marker
                            position={[locationCoords.lat, locationCoords.lng]}
                            icon={RescuePinIcon}
                            draggable={adjustLocationMode}
                            eventHandlers={{
                              dragend: (event) => {
                                const next = event.target.getLatLng();
                                setPreciseLocation({ lat: next.lat, lng: next.lng }, null, 'manual');
                              },
                            }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    <div className="location-actions">
                      <button
                        type="button"
                        className={`btn btn-outline ${adjustLocationMode ? 'active' : ''}`}
                        onClick={() => setAdjustLocationMode((prev) => !prev)}
                      >
                        <Move size={17} />
                        {adjustLocationMode ? 'Finish Adjusting' : 'Adjust Pin'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-teal"
                        onClick={confirmLocation}
                        disabled={!locationCoords}
                      >
                        <CheckSquare size={17} />
                        Confirm Location
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => navigate('/app/map')}
                      >
                        <Map size={17} />
                        Open Full Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-footer">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={submitting || loading}
                >
                  {submitting || loading ? (
                    <><Loader size={18} className="spin" /> Submitting report...</>
                  ) : (
                    <><Send size={18} /> Submit Emergency Report</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Task Details Modal ─────────────────────────────────────────── */}
      {selectedTask && (
        <div className="form-overlay" onClick={() => setSelectedTask(null)}>
          <div className="form-container task-details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <h2>{selectedTask.title || `${(selectedTask.animalType || 'Animal').toUpperCase()} Alert`}</h2>
              <button type="button" className="close-btn" onClick={() => setSelectedTask(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="form-body">
              {selectedTask.report?.images?.length > 0 ? (
                <img src={selectedTask.report.images[0]} alt="Report" className="task-detail-image" />
              ) : (
                <div className="no-image-placeholder">
                  <ImageOff size={32} />
                  <span>No photo provided</span>
                </div>
              )}
              
              <div className="task-detail-grid">
                <div className="detail-item">
                  <label>Status</label>
                  <span>{selectedTask.status}</span>
                </div>
                <div className="detail-item">
                  <label>Urgency</label>
                  <span className={`status-badge ${urgencyColors[selectedTask.urgency] || 'medium'}`}>{selectedTask.urgency}</span>
                </div>
                <div className="detail-item">
                  <label>Time Reported</label>
                  <span>{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleString() : '—'}</span>
                </div>
              </div>

              <div className="field-group">
                <label>Description</label>
                <p className="task-detail-text">{selectedTask.description}</p>
              </div>

              <div className="field-group">
                <label>Location</label>
                <p className="task-detail-text">
                  <MapPin size={16} style={{display: 'inline', marginRight: '4px', verticalAlign: 'middle'}}/>
                  {selectedTask.location?.address || `${selectedTask.location?.lat?.toFixed(5)}, ${selectedTask.location?.lng?.toFixed(5)}`}
                </p>
              </div>
            </div>

            <div className="form-footer">
               {selectedTask.status === 'Reported' && (
                  <button
                    className="btn btn-primary w-full"
                    onClick={() => {
                      handleStatusUpdate(selectedTask._id || selectedTask.id, 'In Progress');
                      setSelectedTask(null);
                    }}
                  >
                    {t('tasks.actions.accept')}
                  </button>
                )}
                {selectedTask.status === 'In Progress' && (
                  <button
                    className="btn btn-teal w-full"
                    onClick={() => {
                      handleStatusUpdate(selectedTask._id || selectedTask.id, 'Completed');
                      setSelectedTask(null);
                    }}
                  >
                    {t('tasks.actions.complete')}
                  </button>
                )}
                {selectedTask.status === 'Completed' && currentUser?.role !== 'ngo' && (
                  <div className="status-note text-center">{t('tasks.status.awaiting')}</div>
                )}
                <button
                  type="button"
                  className="btn btn-outline w-full mt-sm"
                  onClick={() => {
                    const id = selectedTask._id || selectedTask.id;
                    setSelectedTask(null);
                    navigate(`/app/rescue/${id}`);
                  }}
                >
                  <Eye size={16} /> Open Full Operational Case File
                </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="board-filters mb-lg">
        {['all', 'unassigned', 'in progress', 'en route', 'stabilized', 'completed', 'verified'].map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Task Grid ─────────────────────────────────────────────────────── */}
      <div className="tasks-container">
        {filteredTasks.length === 0 ? (
          <div className="empty-board">
            <Shield size={64} className="empty-icon" />
            <h3>{t('tasks.empty.title')}</h3>
            <p>{t('tasks.empty.desc')}</p>
          </div>
        ) : (
          <div className="task-grid">
            {filteredTasks.map((task) => (
              <div 
                key={task._id || task.id} 
                className={`task-card ${urgencyColors[task.urgency] || 'medium'}`}
                onClick={() => setSelectedTask(task)}
                style={{ cursor: 'pointer' }}
              >
                <div className="task-header">
                  <div className={`status-badge ${urgencyColors[task.urgency] || 'medium'}`}>
                    {task.urgency}
                  </div>
                  <span className="task-id">FN-RES-{(task._id || task.id || '').slice(-6).toUpperCase()}</span>
                </div>

                <div className="task-content">
                  <h3>{(task.animalType || 'ANIMAL').toUpperCase()} Alert</h3>
                  <p>{task.description}</p>

                  {task.report?.aiAnalysis && (
                    <div className="ai-verification mt-sm">
                      <div className="ai-badge">
                        <Shield size={12} />
                        <span>ARC Verified</span>
                      </div>
                      <span className="digital-id">UID: {task.report.aiAnalysis.animalDigitalId}</span>
                    </div>
                  )}
                </div>

                <div className="task-footer">
                  <div className="task-meta">
                    <div className="meta-row">
                      <MapPin size={14} />
                      <span>{task.location?.address || `${task.location?.lat?.toFixed(3) || '—'}, ${task.location?.lng?.toFixed(3) || '—'}`}</span>
                    </div>
                    <div className="meta-row">
                      <Clock size={14} />
                      <span>{task.createdAt ? new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/rescue/${task._id || task.id}`);
                      }}
                      title="Open Full Case Dossier"
                    >
                      <Eye size={13} /> Case
                    </button>
                    {task.status === 'Reported' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task._id || task.id, 'In Progress'); }}
                      >
                        {t('tasks.actions.accept')}
                      </button>
                    )}
                    {task.status === 'In Progress' && (
                      <button
                        className="btn btn-teal btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task._id || task.id, 'Completed'); }}
                      >
                        {t('tasks.actions.complete')}
                      </button>
                    )}
                    {task.status === 'Completed' && currentUser?.role === 'ngo' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(task._id || task.id, 'Verified'); }}
                      >
                        {t('tasks.actions.verify')}
                      </button>
                    )}
                    {task.status === 'Completed' && currentUser?.role !== 'ngo' && (
                      <div className="status-note">{t('tasks.status.awaiting')}</div>
                    )}
                    {task.status === 'Verified' && (
                      <div className="status-confirmed">
                        <CheckCircle size={16} />
                        {t('tasks.status.verified')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Toast Notification ────────────────────────────────────────────── */}
      {(toast || error) && (
        <div className={`board-toast ${toastType === 'error' || error ? 'error' : ''}`}>
          {toast || error}
        </div>
      )}
    </div>
  );
}
