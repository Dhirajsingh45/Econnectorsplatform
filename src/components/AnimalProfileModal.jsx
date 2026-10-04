import { useState, useEffect } from 'react';
import { X, MapPin, Calendar, Heart, Syringe, Scissors, Eye, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { animalService, vetService, sightingService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './AnimalProfileModal.css';

export default function AnimalProfileModal({ animalId, onClose }) {
  const { currentUser } = useAppContext();

  const [animal, setAnimal] = useState(null);
  const [medRecords, setMedRecords] = useState([]);
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // New sighting form
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingNotes, setSightingNotes] = useState('');
  const [sightingPhoto, setSightingPhoto] = useState('');
  const [submittingSighting, setSubmittingSighting] = useState(false);

  useEffect(() => {
    const loadAnimal = async () => {
      if (!animalId) return;
      setLoading(true);
      setError(null);

      try {
        const [animalData, records, sightingData] = await Promise.all([
          animalService.getById(animalId),
          vetService.getByAnimal(animalId).catch(() => []),
          sightingService.getByAnimal(animalId).catch(() => [])
        ]);

        setAnimal(animalData);
        setMedRecords(Array.isArray(records) ? records : []);
        setSightings(Array.isArray(sightingData) ? sightingData : []);
      } catch (err) {
        setError('Unable to load animal dossier: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    loadAnimal();
  }, [animalId]);

  const handleRecordSighting = async (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Cannot record sighting without GPS.');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      setSubmittingSighting(true);
      try {
        await sightingService.create({
          animalId: animal.animalId,
          location: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          },
          conditionNotes: sightingNotes,
          photo: sightingPhoto || undefined
        });

        setSightingNotes('');
        setSightingPhoto('');
        setShowSightingForm(false);

        // Refresh sightings
        const updated = await sightingService.getByAnimal(animalId).catch(() => []);
        setSightings(Array.isArray(updated) ? updated : []);

      } catch (err) {
        alert(err.message || 'Failed to record sighting.');
      } finally {
        setSubmittingSighting(false);
      }
    }, () => {
      alert('Location access was denied. GPS is required to record an accurate sighting.');
    });
  };

  const getQrCodeUrl = (animalIdentifier) => {
    const baseUrl = window.location.origin;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${baseUrl}/animal/${animalIdentifier}`)}`;
  };

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <div className="profile-title">
            <span className="fauna-id-badge">{animal?.animalId || animal?.faunaId || 'Loading...'}</span>
            <h2 className="mt-xs capitalize">{animal?.species || '...'} · Digital Dossier</h2>
          </div>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <div className="profile-body flex items-center justify-center">
            <div className="loading-skeleton" style={{ height: '300px', width: '100%', borderRadius: '12px' }} />
          </div>
        ) : error ? (
          <div className="profile-body">
            <div className="error-alert">{error}</div>
          </div>
        ) : animal ? (
          <>
            <div className="profile-tabs">
              {['overview', 'medical', 'sightings', 'qr'].map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="profile-body">
              {activeTab === 'overview' && (
                <div className="overview-grid">
                  <div className="overview-photos">
                    {animal.photographs?.length > 0 || animal.images?.length > 0 ? (
                      <img
                        src={animal.photographs?.[0] || animal.images?.[0]}
                        alt={animal.species}
                        className="dossier-photo"
                      />
                    ) : (
                      <div className="dossier-photo-placeholder">
                        <span className="text-6xl">🐾</span>
                        <p className="text-muted text-sm mt-sm">No photograph on record</p>
                      </div>
                    )}
                  </div>
                  <div className="overview-details">
                    <table className="info-table">
                      <tbody>
                        <tr><td>Fauna ID</td><td className="text-accent font-mono">{animal.animalId}</td></tr>
                        <tr><td>Species</td><td className="capitalize">{animal.species}</td></tr>
                        <tr><td>Breed</td><td>{animal.breed || '—'}</td></tr>
                        <tr><td>Sex</td><td className="capitalize">{animal.sex || 'Unknown'}</td></tr>
                        <tr><td>Est. Age</td><td>{animal.estimatedAge || '—'}</td></tr>
                        <tr><td>Status</td><td><span className="badge badge-normal capitalize">{animal.status}</span></td></tr>
                        <tr><td>Sterilized</td><td className={animal.sterilizationStatus === 'yes' ? 'text-accent' : 'text-muted'}>{animal.sterilizationStatus || 'Unknown'}</td></tr>
                        <tr><td>Vaccinations</td><td>{animal.vaccinationRecords?.length || 0} record(s)</td></tr>
                        <tr><td>Location</td><td>{animal.location?.address || animal.location?.city || '—'}</td></tr>
                        <tr><td>Markings</td><td>{animal.identifyingMarkings || animal.features || '—'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'medical' && (
                <div>
                  <h3 className="mb-md">Medical Timeline</h3>
                  {medRecords.length === 0 ? (
                    <div className="empty-board p-xl text-center">
                      <Heart size={36} className="text-muted mx-auto mb-md" />
                      <p className="text-muted">No medical records found for this animal.</p>
                    </div>
                  ) : (
                    <div className="timeline">
                      {medRecords.map((r, i) => (
                        <div key={r._id || i} className="timeline-event">
                          <div className="timeline-dot" />
                          <div className="timeline-content glass-panel p-md">
                            <div className="flex justify-between text-xs text-muted mb-xs">
                              <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                              <span className="capitalize badge badge-normal">{r.dischargeStatus || 'In Care'}</span>
                            </div>
                            {r.diagnosis && <p><strong>Diagnosis:</strong> {r.diagnosis}</p>}
                            {r.examination && <p className="text-sm text-muted">{r.examination}</p>}
                            {r.treatment && <p className="text-sm mt-xs"><strong>Treatment:</strong> {r.treatment}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'sightings' && (
                <div>
                  <div className="flex justify-between items-center mb-md">
                    <h3>Movement Sightings</h3>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setShowSightingForm(!showSightingForm)}
                    >
                      <Eye size={14} /> Record Sighting
                    </button>
                  </div>

                  {showSightingForm && (
                    <form className="glass-panel p-md mb-md rounded" onSubmit={handleRecordSighting}>
                      <p className="text-xs text-muted mb-sm">Your current GPS location will be recorded automatically.</p>
                      <div className="field-group mb-sm">
                        <label className="text-sm">Condition Notes</label>
                        <textarea
                          className="form-textarea"
                          rows="2"
                          placeholder="Animal appears healthy / injured / fed..."
                          value={sightingNotes}
                          onChange={(e) => setSightingNotes(e.target.value)}
                        />
                      </div>
                      <div className="field-group mb-sm">
                        <label className="text-sm">Photo URL (optional)</label>
                        <input
                          className="form-select"
                          placeholder="https://..."
                          value={sightingPhoto}
                          onChange={(e) => setSightingPhoto(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm w-full" disabled={submittingSighting}>
                        {submittingSighting ? 'Recording...' : '📍 Submit Sighting with GPS'}
                      </button>
                    </form>
                  )}

                  {sightings.length === 0 ? (
                    <div className="empty-board p-xl text-center">
                      <MapPin size={36} className="text-muted mx-auto mb-md" />
                      <p className="text-muted">No movement sightings recorded for this animal yet.</p>
                    </div>
                  ) : (
                    <div className="timeline">
                      {sightings.map((s, i) => (
                        <div key={s._id || i} className="timeline-event">
                          <div className="timeline-dot" />
                          <div className="timeline-content glass-panel p-md">
                            <div className="flex justify-between text-xs text-muted mb-xs">
                              <span>{new Date(s.timestamp).toLocaleString()}</span>
                              {s.distanceFromLastSightingKm > 0 && (
                                <span className="text-accent">+{s.distanceFromLastSightingKm} km</span>
                              )}
                            </div>
                            <p className="text-sm">
                              <MapPin size={12} className="inline" /> {s.location?.address || `${s.location?.lat?.toFixed(4)}, ${s.location?.lng?.toFixed(4)}`}
                            </p>
                            {s.conditionNotes && <p className="text-xs text-muted mt-xs">{s.conditionNotes}</p>}
                            {s.observer?.name && <p className="text-xs text-muted mt-xs">By: {s.observer.name}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'qr' && (
                <div className="qr-section text-center p-xl">
                  <h3 className="mb-md">Verified Digital Animal Passport QR</h3>
                  <p className="text-muted text-sm mb-lg">
                    Field-scannable cryptographic identity. Direct link to public welfare & vaccination history.
                  </p>
                  <div className="qr-container glass-panel p-lg inline-block" style={{ background: '#ffffff', borderRadius: '16px' }}>
                    <QRCodeSVG
                      value={`${window.location.origin}/passport/${animal.animalId || animal.faunaId || animal._id}`}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                    <p className="fauna-id-badge text-sm mt-md" style={{ color: '#111', background: '#FF8C42' }}>
                      {animal.animalId || animal.faunaId}
                    </p>
                  </div>
                  <div className="mt-lg flex items-center justify-center gap-md" style={{ flexWrap: 'wrap' }}>
                    <a
                      href={`/passport/${animal.animalId || animal.faunaId || animal._id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary btn-sm flex items-center gap-xs"
                    >
                      <ExternalLink size={14} /> Open Digital Passport View
                    </a>
                  </div>
                  {animal.rfidChip && <p className="text-xs text-muted mt-md">RFID Chip: {animal.rfidChip}</p>}
                  {animal.microchipId && <p className="text-xs text-muted mt-xs">Microchip ID: {animal.microchipId}</p>}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
