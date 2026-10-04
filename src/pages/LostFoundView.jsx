import { useState, useEffect } from 'react';
import { 
  Search, Plus, MapPin, Phone, AlertCircle, CheckCircle2, 
  RefreshCw, Filter, Shield, Share2, Eye, HeartHandshake, 
  AlertTriangle, ExternalLink, HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { lostFoundService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './LostFoundView.css';

export default function LostFoundView() {
  const { currentUser } = useAppContext();
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [filterSpecies, setFilterSpecies] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New Report Modal State
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState('LOST'); // 'LOST' | 'FOUND' | 'SIGHTING'
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    species: 'dog',
    petName: '',
    breed: '',
    primaryColor: '',
    gender: 'Unknown',
    isInjured: false,
    injuryDetails: '',
    canHoldSafely: false,
    sightingDirection: '',
    contactName: currentUser?.name || '',
    contactPhone: currentUser?.phone || '',
    isPhonePublic: false,
    identifyingMarks: '',
    circumstances: '',
    area: '',
    city: currentUser?.location?.city || '',
    photoUrl: '',
    targetReportId: ''
  });

  // Match Modal State
  const [matchReport, setMatchReport] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchingLoading, setMatchingLoading] = useState(false);

  // Reunion Modal State
  const [reunionReport, setReunionReport] = useState(null);
  const [reunionNotes, setReunionNotes] = useState('');

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterType !== 'ALL') params.type = filterType;
      if (filterSpecies !== 'ALL') params.species = filterSpecies;
      if (searchQuery) params.search = searchQuery;

      const data = await lostFoundService.getReports(params);
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load Lost/Found reports:', err);
      setError('Unable to fetch Lost & Found listings from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterType, filterSpecies]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!formData.contactName || !formData.contactPhone) {
      showToast('Contact name and phone number are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await lostFoundService.createReport({
        type: reportType,
        species: formData.species,
        petName: formData.petName,
        photos: formData.photoUrl ? [formData.photoUrl] : [],
        attributes: {
          breed: formData.breed,
          primaryColor: formData.primaryColor,
          gender: formData.gender,
          isInjured: formData.isInjured,
          injuryDetails: formData.injuryDetails,
          canHoldSafely: formData.canHoldSafely,
          sightingDirection: formData.sightingDirection
        },
        lastSeenLocation: {
          lat: currentUser?.location?.lat || 28.6139,
          lng: currentUser?.location?.lng || 77.2090,
          address: formData.area || 'Neighborhood area',
          area: formData.area || 'Neighborhood area',
          city: formData.city || 'Metro'
        },
        contactName: formData.contactName,
        contactPhone: formData.contactPhone,
        isPhonePublic: formData.isPhonePublic,
        identifyingMarks: formData.identifyingMarks,
        circumstances: formData.circumstances,
        targetReportId: formData.targetReportId
      });

      showToast(`Report filed successfully! Alert published to community map. 📢`);
      setShowModal(false);
      setFormData({
        species: 'dog',
        petName: '',
        breed: '',
        primaryColor: '',
        gender: 'Unknown',
        isInjured: false,
        injuryDetails: '',
        canHoldSafely: false,
        sightingDirection: '',
        contactName: currentUser?.name || '',
        contactPhone: currentUser?.phone || '',
        isPhonePublic: false,
        identifyingMarks: '',
        circumstances: '',
        area: '',
        city: '',
        photoUrl: '',
        targetReportId: ''
      });
      fetchReports();
    } catch (err) {
      showToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMatches = async (report) => {
    setMatchReport(report);
    setMatchingLoading(true);
    try {
      const results = await lostFoundService.findMatches(report._id || report.reportId);
      setMatches(Array.isArray(results) ? results : []);
    } catch (err) {
      showToast(err.message || 'Failed to find candidate matches', 'error');
      setMatches([]);
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleConvertToRescue = async (reportId) => {
    if (!confirm('This will dispatch an active emergency rescue case for this injured animal. Proceed?')) return;
    try {
      const res = await lostFoundService.convertToRescue(reportId);
      showToast('Found animal escalated into active Emergency Rescue Task! 🚑');
      fetchReports();
    } catch (err) {
      showToast(err.message || 'Failed to convert to rescue case', 'error');
    }
  };

  const handleReunionSubmit = async (e) => {
    e.preventDefault();
    if (!reunionReport) return;
    try {
      await lostFoundService.recordReunion(reunionReport._id || reunionReport.reportId, { notes: reunionNotes });
      showToast('Pet verified as reunited! Case marked resolved. 🎉');
      setReunionReport(null);
      setReunionNotes('');
      fetchReports();
    } catch (err) {
      showToast(err.message || 'Failed to record reunion', 'error');
    }
  };

  return (
    <div className="lost-found-container animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`lf-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <header className="lf-hero glass-panel">
        <div className="lf-hero-content">
          <div className="flex items-center gap-sm">
            <span className="badge badge-high text-xs uppercase tracking-wider">Hyperlocal Community Mesh</span>
            <span className="live-pill">SAFE REUNION NETWORK</span>
          </div>
          <h1 className="lf-hero-title">Lost & Found Animal Registry</h1>
          <p className="lf-hero-subtitle">
            Hyperlocal network connecting lost pet guardians, community finders, and rescue responders. 
            Automated attribute correlation, safe masked contact, and instant emergency rescue escalation.
          </p>
        </div>

        {/* 3 Core Action Buttons (Section 13) */}
        <div className="lf-hero-actions">
          <button 
            className="btn btn-danger btn-sm"
            onClick={() => { setReportType('LOST'); setShowModal(true); }}
          >
            🚨 I Lost an Animal
          </button>
          <button 
            className="btn btn-teal btn-sm"
            onClick={() => { setReportType('FOUND'); setShowModal(true); }}
          >
            🐾 I Found an Animal
          </button>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => { setReportType('SIGHTING'); setShowModal(true); }}
          >
            👁️ I Saw an Animal (Sighting)
          </button>
        </div>
      </header>

      {/* Search and Filters Bar */}
      <div className="lf-filter-bar glass-panel">
        <form onSubmit={handleSearchSubmit} className="flex gap-sm items-center flex-wrap w-full">
          <div className="filter-item">
            <label>Report Type:</label>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="lf-select"
            >
              <option value="ALL">All Reports</option>
              <option value="LOST">Lost Pets</option>
              <option value="FOUND">Found Animals</option>
              <option value="SIGHTING">Sightings</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Species:</label>
            <select 
              value={filterSpecies} 
              onChange={(e) => setFilterSpecies(e.target.value)}
              className="lf-select"
            >
              <option value="ALL">All Species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
              <option value="cow">Cows</option>
              <option value="bird">Birds</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="filter-search flex-1">
            <input 
              type="text" 
              placeholder="Search by Pet Name, Markings, or Case ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="lf-input"
            />
            <button type="submit" className="btn btn-outline btn-sm">Search</button>
          </div>

          <button type="button" className="btn btn-outline btn-sm" onClick={fetchReports} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </form>
      </div>

      {/* Reports Grid */}
      {loading ? (
        <div className="lf-loading glass-panel">
          <RefreshCw size={24} className="spin text-accent mb-sm" />
          <p>Querying verified neighborhood community listings...</p>
        </div>
      ) : reports.length === 0 ? (
        /* Rich Empty State (Section 26) */
        <div className="lf-empty-card glass-panel">
          <div className="empty-bubble">🔍</div>
          <h3>No Active Lost & Found Reports</h3>
          <p className="empty-description">
            There are currently no active lost pet or found animal alerts registered in this sector.
            If you have lost a companion animal or spotted a stray pet in distress, create a report immediately.
          </p>
          <div className="flex gap-sm justify-center">
            <button className="btn btn-danger btn-sm" onClick={() => { setReportType('LOST'); setShowModal(true); }}>
              Report Lost Pet
            </button>
            <button className="btn btn-teal btn-sm" onClick={() => { setReportType('FOUND'); setShowModal(true); }}>
              Report Found Pet
            </button>
          </div>
        </div>
      ) : (
        <div className="lf-reports-grid">
          {reports.map(report => {
            const isLost = report.type === 'LOST';
            const isInjured = report.attributes?.isInjured;
            const isTransferred = report.status === 'TRANSFERRED_TO_RESCUE';
            const isReunited = report.status === 'REUNITED';

            return (
              <div key={report._id} className={`lf-card glass-panel ${isLost ? 'card-lost' : 'card-found'}`}>
                <div className="lf-card-media">
                  {report.photos?.[0] ? (
                    <img src={report.photos[0]} alt={report.petName || report.species} className="lf-img" />
                  ) : (
                    <div className="lf-img-placeholder">🐾</div>
                  )}
                  <span className={`lf-type-pill ${isLost ? 'pill-lost' : 'pill-found'}`}>
                    {report.type}
                  </span>
                  {isInjured && (
                    <span className="lf-injured-pill">
                      <AlertTriangle size={11} /> INJURED
                    </span>
                  )}
                </div>

                <div className="lf-card-body">
                  <div className="flex justify-between items-center mb-xs">
                    <span className="mono-id text-accent text-xs">{report.reportId || report._id?.slice(-8).toUpperCase()}</span>
                    <span className="lf-status-tag">{report.status?.replace(/_/g, ' ')}</span>
                  </div>

                  <h3 className="lf-pet-name">
                    {report.petName ? report.petName : `Unidentified ${report.species}`}
                  </h3>

                  <p className="lf-location">
                    <MapPin size={13} className="text-muted mr-xs" />
                    {report.lastSeenLocation?.area || report.lastSeenLocation?.city || 'Neighborhood area'}
                  </p>

                  <div className="lf-traits-row">
                    <span className="trait-tag">{report.species}</span>
                    {report.attributes?.breed && <span className="trait-tag">{report.attributes.breed}</span>}
                    {report.attributes?.primaryColor && <span className="trait-tag">{report.attributes.primaryColor}</span>}
                  </div>

                  <p className="lf-marks">
                    {report.identifyingMarks || report.circumstances || 'No additional features recorded.'}
                  </p>

                  {/* Safe Contact Bar */}
                  <div className="lf-contact-bar">
                    <div className="flex items-center gap-xs">
                      <Shield size={12} className="text-teal" />
                      <span className="text-xs font-bold text-teal">{report.contactName}</span>
                    </div>
                    <span className="text-xs mono-id text-muted">{report.contactPhone}</span>
                  </div>

                  {/* Actions Row */}
                  <div className="lf-card-actions">
                    <button 
                      className="btn btn-outline btn-sm flex-1"
                      onClick={() => handleOpenMatches(report)}
                    >
                      Check Matches
                    </button>

                    <Link 
                      to={`/lost-found/${report.reportId || report._id}`} 
                      className="btn btn-outline btn-sm"
                      title="Shareable Public Poster"
                    >
                      <Share2 size={13} />
                    </Link>

                    {/* Found Injured Animal -> Convert to Rescue Case (Section 13.2, 35) */}
                    {report.type === 'FOUND' && isInjured && !isTransferred && (
                      <button 
                        className="btn btn-danger btn-sm"
                        onClick={() => handleConvertToRescue(report._id)}
                        title="Escalate directly to Active Emergency Rescue Dispatch"
                      >
                        Dispatch Rescue
                      </button>
                    )}

                    {/* Reunion Action */}
                    {!isReunited && currentUser && (
                      <button 
                        className="btn btn-outline btn-sm text-green"
                        onClick={() => setReunionReport(report)}
                        title="Record Verified Reunion"
                      >
                        <HeartHandshake size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE REPORT MODAL */}
      {showModal && (
        <div className="form-overlay" onClick={() => setShowModal(false)}>
          <div className="form-container modal-wide" onClick={(e) => e.stopPropagation()}>
            <form className="report-form" onSubmit={handleCreateReport}>
              <div className="form-header">
                <h2 className="text-accent">
                  {reportType === 'LOST' ? '🚨 Report a Lost Animal' : reportType === 'FOUND' ? '🐾 Report a Found Animal' : '👁️ Report a Sighting'}
                </h2>
                <button type="button" className="close-btn" onClick={() => setShowModal(false)}>×</button>
              </div>

              <div className="form-body">
                <div className="field-row">
                  <div className="field-group flex-1">
                    <label>Report Type</label>
                    <select 
                      className="form-select" 
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                    >
                      <option value="LOST">I Lost an Animal</option>
                      <option value="FOUND">I Found an Animal</option>
                      <option value="SIGHTING">I Spotted an Animal (Sighting)</option>
                    </select>
                  </div>
                  <div className="field-group flex-1">
                    <label>Species</label>
                    <select 
                      className="form-select"
                      value={formData.species}
                      onChange={(e) => setFormData({...formData, species: e.target.value})}
                    >
                      <option value="dog">Dog / Canine</option>
                      <option value="cat">Cat / Feline</option>
                      <option value="cow">Cow / Cattle</option>
                      <option value="bird">Bird</option>
                      <option value="other">Other Species</option>
                    </select>
                  </div>
                </div>

                {reportType === 'LOST' && (
                  <div className="field-row">
                    <div className="field-group flex-1">
                      <label>Pet Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Bruno"
                        value={formData.petName}
                        onChange={(e) => setFormData({...formData, petName: e.target.value})}
                      />
                    </div>
                    <div className="field-group flex-1">
                      <label>Breed / Appearance</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. Indie mix, Labrador"
                        value={formData.breed}
                        onChange={(e) => setFormData({...formData, breed: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="field-row">
                  <div className="field-group flex-1">
                    <label>Primary Fur/Coat Color</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. Golden brown, Black & white"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({...formData, primaryColor: e.target.value})}
                    />
                  </div>
                  <div className="field-group flex-1">
                    <label>Gender</label>
                    <select 
                      className="form-select"
                      value={formData.gender}
                      onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    >
                      <option value="Unknown">Unknown</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* Found Animal specific checks */}
                {reportType === 'FOUND' && (
                  <div className="field-group bg-dark-panel p-sm rounded mb-sm">
                    <label className="checkbox-agreement mb-xs">
                      <input 
                        type="checkbox" 
                        checked={formData.isInjured}
                        onChange={(e) => setFormData({...formData, isInjured: e.target.checked})}
                      />
                      <span className="text-danger font-bold">Animal appears injured or in acute medical distress</span>
                    </label>
                    {formData.isInjured && (
                      <input 
                        type="text" 
                        className="form-input mt-xs" 
                        placeholder="Describe injury (e.g. limping, bleeding, road hit)..."
                        value={formData.injuryDetails}
                        onChange={(e) => setFormData({...formData, injuryDetails: e.target.value})}
                      />
                    )}
                    <label className="checkbox-agreement mt-xs">
                      <input 
                        type="checkbox" 
                        checked={formData.canHoldSafely}
                        onChange={(e) => setFormData({...formData, canHoldSafely: e.target.checked})}
                      />
                      <span>Finder can safely hold animal temporarily until rescue/guardian arrives</span>
                    </label>
                  </div>
                )}

                <div className="field-row">
                  <div className="field-group flex-1">
                    <label>Approximate Area / Landmark</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="e.g. Near Metro Gate 3, Sector 14"
                      value={formData.area}
                      onChange={(e) => setFormData({...formData, area: e.target.value})}
                    />
                  </div>
                  <div className="field-group flex-1">
                    <label>City</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      placeholder="e.g. New Delhi"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label>Distinctive Markings (Collar, Ear Notch, Tail)</label>
                  <textarea 
                    className="form-textarea" 
                    rows="2"
                    placeholder="Provide details that will help distinguish this animal..."
                    value={formData.identifyingMarks}
                    onChange={(e) => setFormData({...formData, identifyingMarks: e.target.value})}
                  />
                </div>

                <div className="field-group">
                  <label>Photograph URL (Optional)</label>
                  <input 
                    type="url" 
                    className="form-input" 
                    placeholder="https://images.unsplash.com/..."
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                  />
                </div>

                <div className="field-row">
                  <div className="field-group flex-1">
                    <label>Contact Name</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={formData.contactName}
                      onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                    />
                  </div>
                  <div className="field-group flex-1">
                    <label>Contact Phone Number</label>
                    <input 
                      type="tel" 
                      className="form-input" 
                      required 
                      value={formData.contactPhone}
                      onChange={(e) => setFormData({...formData, contactPhone: e.target.value})}
                    />
                  </div>
                </div>

                <label className="checkbox-agreement">
                  <input 
                    type="checkbox" 
                    checked={formData.isPhonePublic}
                    onChange={(e) => setFormData({...formData, isPhonePublic: e.target.checked})}
                  />
                  <span>Allow public display of my phone number (otherwise masked for privacy)</span>
                </label>
              </div>

              <div className="form-footer flex justify-end gap-sm">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Publish Community Listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANDIDATE MATCHES MODAL */}
      {matchReport && (
        <div className="form-overlay" onClick={() => setMatchReport(null)}>
          <div className="form-container modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="form-header">
              <div>
                <h2>Possible Matches for Case {matchReport.reportId || matchReport._id?.slice(-8).toUpperCase()}</h2>
                <p className="text-muted text-xs">Based on species, color, markings, and geographic radius.</p>
              </div>
              <button type="button" className="close-btn" onClick={() => setMatchReport(null)}>×</button>
            </div>

            <div className="form-body">
              {matchingLoading ? (
                <div className="text-center p-xl">
                  <RefreshCw size={24} className="spin text-accent mx-auto mb-sm" />
                  <p>Correlating report attributes across active listings...</p>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center p-xl text-muted">
                  <AlertCircle size={36} className="mx-auto mb-sm opacity-50" />
                  <h4>No Potential Matches Found Within 15 km</h4>
                  <p className="text-xs mt-xs">
                    We will continue cross-referencing new reports as citizens submit them.
                  </p>
                </div>
              ) : (
                <div className="matches-list">
                  {matches.map(m => (
                    <div key={m._id} className="match-card glass-panel">
                      <div className="flex gap-md items-center">
                        {m.photos?.[0] ? (
                          <img src={m.photos[0]} alt="Match" className="match-thumb" />
                        ) : (
                          <div className="match-thumb-placeholder">🐾</div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="mono-id text-accent text-xs">{m.reportId || m._id?.slice(-8).toUpperCase()}</span>
                            <span className="match-score-badge">{m.matchScore}% Signal</span>
                          </div>
                          <h4 className="mt-xs">{m.petName || m.species} · {m.attributes?.breed || 'Mixed'}</h4>
                          <p className="text-xs text-muted">Last seen: {m.lastSeenLocation?.area || m.lastSeenLocation?.city} ({m.distanceKm} km away)</p>
                          <p className="text-xs text-teal mt-xs">{m.matchExplanation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-footer flex justify-end">
              <button className="btn btn-outline btn-sm" onClick={() => setMatchReport(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* RECORD REUNION MODAL */}
      {reunionReport && (
        <div className="form-overlay" onClick={() => setReunionReport(null)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleReunionSubmit}>
              <div className="form-header">
                <h2 className="text-green flex items-center gap-xs">
                  <HeartHandshake size={18} /> Record Pet Reunion
                </h2>
                <button type="button" className="close-btn" onClick={() => setReunionReport(null)}>×</button>
              </div>

              <div className="form-body">
                <p className="text-xs text-muted mb-sm">
                  Mark case <strong>{reunionReport.reportId || reunionReport._id?.slice(-8).toUpperCase()}</strong> as verified and reunited.
                </p>
                <div className="field-group">
                  <label>Verification Notes</label>
                  <textarea 
                    className="form-textarea" 
                    rows="3" 
                    required 
                    placeholder="Details: Handover confirmed, collar verified, microchip matched..."
                    value={reunionNotes}
                    onChange={(e) => setReunionNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-footer flex justify-end gap-sm">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setReunionReport(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Confirm Reunion</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
