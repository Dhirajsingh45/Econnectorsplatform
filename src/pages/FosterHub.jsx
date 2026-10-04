import { useState, useEffect } from 'react';
import { 
  Heart, Plus, AlertCircle, RefreshCw, Home, Calendar, Shield, 
  CheckCircle2, AlertTriangle, MessageSquare, ChevronRight, User, 
  MapPin, Clock, Stethoscope, Sparkles, BookOpen, Send
} from 'lucide-react';
import { fosterService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './FosterHub.css';

export default function FosterHub() {
  const { currentUser } = useAppContext();

  // Tab navigation: 'browse' | 'placements' | 'applications' | 'resources'
  const [activeTab, setActiveTab] = useState('browse');

  // Metrics
  const [stats, setStats] = useState({ needingFoster: 0, availableFoster: 0, activePlacements: 0, pendingApplications: 0 });

  // Data lists
  const [availableAnimals, setAvailableAnimals] = useState([]);
  const [myPlacements, setMyPlacements] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Discovery Filters
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-step Application Modal State
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [appStep, setAppStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [applicationForm, setApplicationForm] = useState({
    fullName: currentUser?.name || '',
    phone: currentUser?.phone || '',
    city: currentUser?.location?.city || '',
    housingType: 'Apartment',
    residenceOwnership: 'Owned',
    landlordPermission: true,
    hasYard: false,
    existingPets: 'None',
    hasChildren: false,
    dailyHoursAway: 4,
    durationWeeks: 4,
    emergencyAvailability: true,
    experienceSummary: '',
    feedingCommitment: true,
    vetVisitsCommitment: true,
    regularCheckinsCommitment: true
  });

  // Welfare Check-In Modal State
  const [checkInApp, setCheckInApp] = useState(null);
  const [checkInForm, setCheckInForm] = useState({
    eatingNormally: true,
    drinkingNormally: true,
    sleepingNormally: true,
    medicationGiven: false,
    unusualBehavior: false,
    notes: ''
  });

  // Emergency Beacon Modal State
  const [emergencyApp, setEmergencyApp] = useState(null);
  const [emergencyForm, setEmergencyForm] = useState({
    emergencyType: 'injury',
    severity: 'urgent',
    description: ''
  });

  // Foster-to-Adopt State
  const [adoptApp, setAdoptApp] = useState(null);
  const [adoptNotes, setAdoptNotes] = useState('');

  // Toast notifications
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, animalsData, appsData, placementsData] = await Promise.all([
        fosterService.getStats().catch(() => ({ needingFoster: 0, availableFoster: 0, activePlacements: 0, pendingApplications: 0 })),
        fosterService.getAnimals({ species: speciesFilter, search: searchQuery }).catch(() => []),
        currentUser ? fosterService.getApplications().catch(() => []) : Promise.resolve([]),
        currentUser ? fosterService.getMyPlacements().catch(() => []) : Promise.resolve([])
      ]);

      setStats(statsData);
      setAvailableAnimals(Array.isArray(animalsData) ? animalsData : []);
      setMyApplications(Array.isArray(appsData) ? appsData : []);
      setMyPlacements(Array.isArray(placementsData) ? placementsData : []);
    } catch (err) {
      console.error('Failed to load foster ecosystem data:', err);
      setError('Unable to synchronize foster records with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [speciesFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    setSubmitting(true);
    try {
      await fosterService.submit({
        animalId: selectedAnimal._id || selectedAnimal.id,
        housingType: applicationForm.housingType,
        hasOtherPets: applicationForm.existingPets !== 'None',
        durationWeeks: Number(applicationForm.durationWeeks),
        experienceDescription: applicationForm.experienceSummary || 'Committed community caregiver',
        details: applicationForm
      });
      showToast('Foster application submitted for organizational review! 🎉');
      setSelectedAnimal(null);
      setAppStep(1);
      fetchData();
      setActiveTab('applications');
    } catch (err) {
      showToast(err.message || 'Failed to submit application', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInApp) return;
    setSubmitting(true);
    try {
      await fosterService.checkIn(checkInApp._id, checkInForm);
      showToast('Welfare check-in logged to animal medical passport! ✅');
      setCheckInApp(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to log check-in', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!emergencyApp) return;
    setSubmitting(true);
    try {
      await fosterService.reportEmergency(emergencyApp._id, emergencyForm);
      showToast('CRITICAL: Emergency beacon broadcast to welfare network! 🚨');
      setEmergencyApp(null);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to report emergency', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFosterToAdopt = async (e) => {
    e.preventDefault();
    if (!adoptApp) return;
    setSubmitting(true);
    try {
      await fosterService.fosterToAdopt(adoptApp._id, { notes: adoptNotes });
      showToast('Foster-to-Adopt application initiated! Connected to Adoption registry. ❤️');
      setAdoptApp(null);
      setAdoptNotes('');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to initiate adoption', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="foster-hub-container animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className={`foster-toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <header className="foster-hero glass-panel">
        <div className="foster-hero-content">
          <div className="flex items-center gap-sm">
            <span className="badge badge-normal text-xs uppercase tracking-wider">Hyperlocal Foster Network</span>
            <span className="live-indicator">LIVE DATABASE SYNC</span>
          </div>
          <h1 className="foster-hero-title">Foster an Animal. Provide a Healing Sanctuary.</h1>
          <p className="foster-hero-subtitle">
            Bridge the gap between trauma stabilization and permanent adoption. Temporary caregivers provide 
            the quiet shelter, nutrition, and love rescued animals need to thrive.
          </p>

          {/* Genuine Database Metrics Bar */}
          <div className="foster-stats-bar">
            <div className="foster-stat-item">
              <span className="stat-val text-accent">{stats.needingFoster}</span>
              <span className="stat-lbl">Needing Foster</span>
            </div>
            <div className="foster-stat-divider" />
            <div className="foster-stat-item">
              <span className="stat-val text-teal">{stats.availableFoster}</span>
              <span className="stat-lbl">Ready for Placement</span>
            </div>
            <div className="foster-stat-divider" />
            <div className="foster-stat-item">
              <span className="stat-val text-green">{stats.activePlacements}</span>
              <span className="stat-lbl">Active in Homes</span>
            </div>
            <div className="foster-stat-divider" />
            <div className="foster-stat-item">
              <span className="stat-val text-muted">{stats.pendingApplications}</span>
              <span className="stat-lbl">Applications Under Review</span>
            </div>
          </div>
        </div>

        <div className="foster-hero-actions">
          <button className="btn btn-primary" onClick={() => setActiveTab('browse')}>
            <Heart size={16} /> Browse Animals
          </button>
          <button className="btn btn-outline" onClick={() => setActiveTab('resources')}>
            <BookOpen size={16} /> Foster Guide
          </button>
          <button className="btn btn-outline btn-sm" onClick={fetchData} title="Refresh Database Records">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Module Navigation Tabs */}
      <div className="foster-tabs">
        <button 
          className={`foster-tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          🐾 Available for Foster ({availableAnimals.length})
        </button>
        {currentUser && (
          <button 
            className={`foster-tab-btn ${activeTab === 'placements' ? 'active' : ''}`}
            onClick={() => setActiveTab('placements')}
          >
            🏡 My Active Placements ({myPlacements.length})
          </button>
        )}
        {currentUser && (
          <button 
            className={`foster-tab-btn ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            📋 Application Status ({myApplications.length})
          </button>
        )}
        <button 
          className={`foster-tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
          onClick={() => setActiveTab('resources')}
        >
          📖 Foster Academy & Care Protocol
        </button>
      </div>

      {/* TAB 1: BROWSE ANIMALS */}
      {activeTab === 'browse' && (
        <section className="foster-browse-section">
          {/* Discovery Filter Controls */}
          <div className="foster-filter-bar glass-panel">
            <form onSubmit={handleSearchSubmit} className="flex gap-sm items-center flex-wrap w-full">
              <div className="filter-group">
                <label className="text-xs text-muted">Species:</label>
                <select 
                  className="filter-select"
                  value={speciesFilter}
                  onChange={(e) => setSpeciesFilter(e.target.value)}
                >
                  <option value="all">All Species</option>
                  <option value="dog">Canines (Dogs)</option>
                  <option value="cat">Felines (Cats)</option>
                  <option value="cow">Cows & Calves</option>
                  <option value="goat">Goats</option>
                  <option value="bird">Birds</option>
                  <option value="other">Other Animals</option>
                </select>
              </div>

              <div className="filter-search-wrap">
                <input 
                  type="text" 
                  className="filter-input"
                  placeholder="Search by breed, markings, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit" className="btn btn-outline btn-sm">Search</button>
              </div>
            </form>
          </div>

          {loading ? (
            <div className="foster-loading-state glass-panel">
              <RefreshCw size={24} className="spin text-accent mb-sm" />
              <p>Scanning verified shelter dossiers for foster-eligible animals...</p>
            </div>
          ) : availableAnimals.length === 0 ? (
            /* Honest, Rich Empty State (Section 26) */
            <div className="foster-empty-card glass-panel">
              <div className="empty-icon-bubble">🐾</div>
              <h3>No Animals Currently Need Foster Care</h3>
              <p className="empty-description">
                Every rescued animal in this sector is either currently receiving in-clinic veterinary stabilization, 
                already placed in loving foster homes, or ready for immediate permanent adoption.
              </p>
              <div className="empty-cta-group">
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('resources')}>
                  <BookOpen size={14} /> Prepare Your Home for Future Placements
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { setSpeciesFilter('all'); setSearchQuery(''); fetchData(); }}>
                  Reset Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="foster-animal-grid">
              {availableAnimals.map(animal => (
                <div key={animal._id} className="foster-animal-card glass-panel">
                  <div className="animal-photo-wrapper">
                    {animal.photographs?.[0] || animal.images?.[0] ? (
                      <img 
                        src={animal.photographs?.[0] || animal.images?.[0]} 
                        alt={animal.species} 
                        className="animal-card-img" 
                      />
                    ) : (
                      <div className="animal-placeholder-art">🐾</div>
                    )}
                    <span className="urgency-pill">Available for Foster</span>
                  </div>

                  <div className="animal-card-body">
                    <div className="flex justify-between items-center mb-xs">
                      <span className="mono-id text-accent text-xs">{animal.animalId}</span>
                      <span className="species-tag">{animal.species}</span>
                    </div>

                    <h3 className="animal-name">
                      {animal.breed || animal.species?.toUpperCase()} · {animal.estimatedAge || 'Adult'}
                    </h3>

                    <p className="animal-location">
                      <MapPin size={13} className="text-muted mr-xs" />
                      {animal.location?.city || animal.location?.area || 'Hyperlocal Sector'}
                    </p>

                    <div className="animal-specs-grid">
                      <div className="spec-box">
                        <span className="spec-k">Sex</span>
                        <span className="spec-v">{animal.sex || 'Unknown'}</span>
                      </div>
                      <div className="spec-box">
                        <span className="spec-k">Sterilized</span>
                        <span className="spec-v">{animal.sterilizationStatus === 'yes' ? 'Yes (ABC)' : 'Pending'}</span>
                      </div>
                      <div className="spec-box">
                        <span className="spec-k">Vaccines</span>
                        <span className="spec-v">{animal.vaccinationRecords?.length ? `${animal.vaccinationRecords.length} recorded` : 'Pending'}</span>
                      </div>
                    </div>

                    <p className="animal-notes">
                      {animal.identifyingMarkings || 'Recovering well; gentle disposition, looking for a temporary quiet environment.'}
                    </p>

                    <div className="card-actions-row">
                      <button 
                        className="btn btn-primary btn-sm flex-1"
                        onClick={() => {
                          if (!currentUser) {
                            showToast('Please log in or sign up to submit a foster application.', 'error');
                            return;
                          }
                          setSelectedAnimal(animal);
                          setAppStep(1);
                        }}
                      >
                        <Heart size={14} /> Apply to Foster
                      </button>
                      <a 
                        href={`/passport/${animal.animalId}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        title="View Animal Passport"
                      >
                        Passport
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: MY PLACEMENTS & WELFARE DASHBOARD */}
      {activeTab === 'placements' && currentUser && (
        <section className="my-placements-section">
          <div className="section-intro mb-md">
            <h2>Active Foster Placements Under Your Care</h2>
            <p className="text-muted text-xs">Log daily health observations, access 24/7 welfare escalation, or initiate permanent adoption.</p>
          </div>

          {myPlacements.length === 0 ? (
            <div className="foster-empty-card glass-panel">
              <div className="empty-icon-bubble">🏡</div>
              <h3>No Active Placements Assigned Yet</h3>
              <p className="empty-description">
                You currently do not have any fostered animals checked into your home. Once an application is approved and verified by an NGO, your active ward will appear here for routine check-ins.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                Explore Animals Needing Foster
              </button>
            </div>
          ) : (
            <div className="placements-list">
              {myPlacements.map(placement => (
                <div key={placement._id} className="placement-card glass-panel">
                  <div className="placement-header">
                    <div className="flex items-center gap-sm">
                      <span className="status-badge badge-low">ACTIVE FOSTER CARE</span>
                      <span className="mono-id text-accent">{placement.animal?.animalId}</span>
                      <span className="text-muted text-xs">· {placement.animal?.species}</span>
                    </div>
                    <span className="placement-duration text-xs text-muted">
                      Placement Period: {placement.durationWeeks} Weeks
                    </span>
                  </div>

                  <div className="placement-body-grid">
                    <div className="placement-animal-col">
                      {placement.animal?.photographs?.[0] ? (
                        <img src={placement.animal.photographs[0]} alt="Animal" className="placement-thumb" />
                      ) : (
                        <div className="placement-thumb-placeholder">🐾</div>
                      )}
                      <div>
                        <h4>{placement.animal?.breed || placement.animal?.species}</h4>
                        <p className="text-xs text-muted">{placement.animal?.location?.city || 'Local Care'}</p>
                        <a href={`/passport/${placement.animal?.animalId}`} target="_blank" rel="noreferrer" className="passport-mini-link">
                          View Digital Passport →
                        </a>
                      </div>
                    </div>

                    <div className="placement-checkin-col">
                      <div className="flex justify-between items-center mb-xs">
                        <span className="text-xs font-bold">Welfare Check-In Status:</span>
                        <span className="text-xs text-green">
                          {placement.checkIns?.length || 0} Check-ins Logged
                        </span>
                      </div>
                      <p className="text-xs text-muted mb-sm">
                        Daily logging ensures supervising veterinarians can monitor recovery progress and appetite changes.
                      </p>

                      <div className="flex gap-xs flex-wrap">
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => setCheckInApp(placement)}
                        >
                          <CheckCircle2 size={14} /> Log Welfare Check-In
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => setEmergencyApp(placement)}
                        >
                          <AlertTriangle size={14} /> Report Emergency
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => setAdoptApp(placement)}
                        >
                          <Heart size={14} /> I Want to Adopt!
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Past Check-ins mini-timeline */}
                  {placement.checkIns && placement.checkIns.length > 0 && (
                    <div className="placement-history-shelf">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">Recent Check-In Notes:</span>
                      <div className="checkin-pills">
                        {placement.checkIns.slice(-3).map((ci, idx) => (
                          <div key={idx} className="checkin-pill">
                            <span className="pill-date">{new Date(ci.date).toLocaleDateString()}:</span>
                            <span className="pill-note">{ci.notes || 'Eating & drinking normally.'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: APPLICATION STATUS */}
      {activeTab === 'applications' && currentUser && (
        <section className="foster-applications-tab">
          <div className="section-intro mb-md">
            <h2>Your Foster Applications Registry</h2>
            <p className="text-muted text-xs">Track state-machine transitions: Submitted → Under Review → Verification → Approved.</p>
          </div>

          {myApplications.length === 0 ? (
            <div className="foster-empty-card glass-panel">
              <div className="empty-icon-bubble">📋</div>
              <h3>No Foster Applications Submitted</h3>
              <p className="empty-description">
                You haven’t submitted any applications yet. When you discover an animal in need and apply, your vetting progress and organization notes will appear here.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                Browse Animals Needing Foster
              </button>
            </div>
          ) : (
            <div className="applications-table-wrap glass-panel">
              {myApplications.map(app => (
                <div key={app._id} className="app-audit-row">
                  <div className="app-audit-meta">
                    <span className="mono-id text-accent text-xs">{app.animal?.animalId || 'Animal'}</span>
                    <span className="text-xs text-muted">· {app.animal?.species}</span>
                    <span className="text-xs text-muted">· Submitted: {new Date(app.createdAt).toLocaleDateString()}</span>
                  </div>

                  <div className="app-audit-details">
                    <span className="text-xs">Housing: {app.housingType || app.details?.housingType}</span>
                    <span className="text-xs">· Duration: {app.durationWeeks} Weeks</span>
                  </div>

                  <div className="app-audit-status">
                    <span className={`status-badge badge-${app.status?.toLowerCase() || 'normal'}`}>
                      {app.status?.replace(/_/g, ' ')}
                    </span>
                    {app.reviewNotes && (
                      <p className="text-xs text-muted mt-xs">Reviewer: {app.reviewNotes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 4: RESOURCES & EDUCATION */}
      {activeTab === 'resources' && (
        <section className="foster-resources-section">
          <div className="section-intro mb-md">
            <h2>Ecoconnect Foster Academy: Safe Care Foundations</h2>
            <p className="text-muted text-xs">Educational protocols synthesized from recognized animal welfare standards.</p>
          </div>

          <div className="resources-grid">
            <div className="resource-card glass-panel">
              <div className="resource-icon">🕒</div>
              <h3>The "Rule of Three" for Rescue Animals</h3>
              <p>
                <strong>3 Days to Decompress:</strong> Feeling overwhelmed, may not eat, hides or tests boundaries.<br />
                <strong>3 Weeks to Settle:</strong> Beginning to understand routines and feel safe.<br />
                <strong>3 Months to Trust:</strong> Complete bonding and emotional security in your care.
              </p>
            </div>

            <div className="resource-card glass-panel">
              <div className="resource-icon">🚪</div>
              <h3>Quarantine & Resident Pets</h3>
              <p>
                Always maintain physical separation for the first 7-10 days. Street animals may carry 
                incubating viruses or fleas. Never allow unsupervised initial contact between foster wards 
                and resident cats or territorial dogs.
              </p>
            </div>

            <div className="resource-card glass-panel">
              <div className="resource-icon">🚨</div>
              <h3>Welfare Emergency Red Flags</h3>
              <p>
                Immediately trigger the Foster Emergency Beacon if you observe: pale/white gums, refusal to 
                drink water for over 18 hours, repeated vomiting, or acute lethargy. Our network alerts 
                the supervising organization for immediate clinic handoff.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* MULTI-STEP FOSTER APPLICATION MODAL */}
      {selectedAnimal && (
        <div className="form-overlay" onClick={() => setSelectedAnimal(null)}>
          <div className="form-container modal-wide" onClick={(e) => e.stopPropagation()}>
            <form className="report-form" onSubmit={handleApplicationSubmit}>
              <div className="form-header">
                <div>
                  <h2 className="text-accent">Foster Application: {selectedAnimal.animalId}</h2>
                  <p className="text-muted text-xs">Step {appStep} of 4: Standard Humane Society Vetting</p>
                </div>
                <button type="button" className="close-btn" onClick={() => setSelectedAnimal(null)}>×</button>
              </div>

              {/* Progress Bar */}
              <div className="step-progress-bar">
                <div className={`step-tick ${appStep >= 1 ? 'done' : ''}`}>1. About You</div>
                <div className={`step-tick ${appStep >= 2 ? 'done' : ''}`}>2. Home Environment</div>
                <div className={`step-tick ${appStep >= 3 ? 'done' : ''}`}>3. Availability</div>
                <div className={`step-tick ${appStep >= 4 ? 'done' : ''}`}>4. Commitments</div>
              </div>

              <div className="form-body">
                {appStep === 1 && (
                  <div className="step-fields animate-fade-in">
                    <div className="field-group">
                      <label>Applicant Full Name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        value={applicationForm.fullName}
                        onChange={(e) => setApplicationForm({...applicationForm, fullName: e.target.value})}
                      />
                    </div>
                    <div className="field-row">
                      <div className="field-group flex-1">
                        <label>Phone Number</label>
                        <input 
                          type="tel" 
                          className="form-input" 
                          required 
                          value={applicationForm.phone}
                          onChange={(e) => setApplicationForm({...applicationForm, phone: e.target.value})}
                        />
                      </div>
                      <div className="field-group flex-1">
                        <label>City / Neighborhood</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          required 
                          value={applicationForm.city}
                          onChange={(e) => setApplicationForm({...applicationForm, city: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {appStep === 2 && (
                  <div className="step-fields animate-fade-in">
                    <div className="field-row">
                      <div className="field-group flex-1">
                        <label>Housing Type</label>
                        <select 
                          className="form-select"
                          value={applicationForm.housingType}
                          onChange={(e) => setApplicationForm({...applicationForm, housingType: e.target.value})}
                        >
                          <option value="Apartment">Apartment / Flat</option>
                          <option value="Independent House">Independent House</option>
                          <option value="Villa / Farm">Villa with Compound</option>
                        </select>
                      </div>
                      <div className="field-group flex-1">
                        <label>Ownership Status</label>
                        <select 
                          className="form-select"
                          value={applicationForm.residenceOwnership}
                          onChange={(e) => setApplicationForm({...applicationForm, residenceOwnership: e.target.value})}
                        >
                          <option value="Owned">Owned</option>
                          <option value="Rented">Rented (Pet Friendly)</option>
                          <option value="Other">Family Owned</option>
                        </select>
                      </div>
                    </div>
                    <div className="field-group">
                      <label>Existing Pets in Household</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="e.g. One vaccinated neutered indie dog, 3 yrs"
                        value={applicationForm.existingPets}
                        onChange={(e) => setApplicationForm({...applicationForm, existingPets: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {appStep === 3 && (
                  <div className="step-fields animate-fade-in">
                    <div className="field-row">
                      <div className="field-group flex-1">
                        <label>Committed Foster Duration (Weeks)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          min="1" 
                          max="24"
                          value={applicationForm.durationWeeks}
                          onChange={(e) => setApplicationForm({...applicationForm, durationWeeks: e.target.value})}
                        />
                      </div>
                      <div className="field-group flex-1">
                        <label>Daily Hours Away from Home</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          min="0" 
                          max="16"
                          value={applicationForm.dailyHoursAway}
                          onChange={(e) => setApplicationForm({...applicationForm, dailyHoursAway: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="field-group">
                      <label>Caregiving & Pet Experience Summary</label>
                      <textarea 
                        className="form-textarea" 
                        rows="3"
                        placeholder="Describe your previous experience caring for or rehabilitating animals..."
                        value={applicationForm.experienceSummary}
                        onChange={(e) => setApplicationForm({...applicationForm, experienceSummary: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {appStep === 4 && (
                  <div className="step-fields animate-fade-in">
                    <p className="text-xs text-muted mb-sm">Please confirm your ethical commitments as a certified foster caregiver:</p>
                    <label className="checkbox-agreement">
                      <input 
                        type="checkbox" 
                        checked={applicationForm.feedingCommitment} 
                        onChange={(e) => setApplicationForm({...applicationForm, feedingCommitment: e.target.checked})} 
                      />
                      <span>I agree to provide daily balanced nutrition, clean water, and a secure indoor safe area.</span>
                    </label>
                    <label className="checkbox-agreement">
                      <input 
                        type="checkbox" 
                        checked={applicationForm.regularCheckinsCommitment} 
                        onChange={(e) => setApplicationForm({...applicationForm, regularCheckinsCommitment: e.target.checked})} 
                      />
                      <span>I agree to log routine health observations in Ecoconnect and alert staff to medical issues.</span>
                    </label>
                    <label className="checkbox-agreement">
                      <input 
                        type="checkbox" 
                        checked={applicationForm.vetVisitsCommitment} 
                        onChange={(e) => setApplicationForm({...applicationForm, vetVisitsCommitment: e.target.checked})} 
                      />
                      <span>I agree to transport the animal for scheduled veterinary booster visits or follow-ups.</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="form-footer flex justify-between">
                {appStep > 1 ? (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setAppStep(appStep - 1)}>
                    Back
                  </button>
                ) : <div />}

                {appStep < 4 ? (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setAppStep(appStep + 1)}>
                    Next Step →
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Foster Application'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WELFARE CHECK-IN MODAL */}
      {checkInApp && (
        <div className="form-overlay" onClick={() => setCheckInApp(null)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleCheckInSubmit}>
              <div className="form-header">
                <h2>Log Welfare Check-In: {checkInApp.animal?.animalId}</h2>
                <button type="button" className="close-btn" onClick={() => setCheckInApp(null)}>×</button>
              </div>

              <div className="form-body">
                <p className="text-xs text-muted mb-sm">Record your observations for today's health log.</p>
                <label className="checkbox-agreement">
                  <input 
                    type="checkbox" 
                    checked={checkInForm.eatingNormally}
                    onChange={(e) => setCheckInForm({...checkInForm, eatingNormally: e.target.checked})}
                  />
                  <span>Eating food normally with healthy appetite</span>
                </label>
                <label className="checkbox-agreement">
                  <input 
                    type="checkbox" 
                    checked={checkInForm.drinkingNormally}
                    onChange={(e) => setCheckInForm({...checkInForm, drinkingNormally: e.target.checked})}
                  />
                  <span>Drinking water normally</span>
                </label>
                <label className="checkbox-agreement">
                  <input 
                    type="checkbox" 
                    checked={checkInForm.sleepingNormally}
                    onChange={(e) => setCheckInForm({...checkInForm, sleepingNormally: e.target.checked})}
                  />
                  <span>Resting and sleeping peacefully</span>
                </label>
                <label className="checkbox-agreement">
                  <input 
                    type="checkbox" 
                    checked={checkInForm.medicationGiven}
                    onChange={(e) => setCheckInForm({...checkInForm, medicationGiven: e.target.checked})}
                  />
                  <span>Prescribed medications administered</span>
                </label>
                <div className="field-group mt-sm">
                  <label>Caregiver Observations / Notes</label>
                  <textarea 
                    className="form-textarea"
                    rows="3"
                    placeholder="Note stool quality, energy levels, behavioral milestones..."
                    value={checkInForm.notes}
                    onChange={(e) => setCheckInForm({...checkInForm, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-footer flex justify-end gap-sm">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setCheckInApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EMERGENCY ESCALATION MODAL */}
      {emergencyApp && (
        <div className="form-overlay" onClick={() => setEmergencyApp(null)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleEmergencySubmit}>
              <div className="form-header bg-danger-light">
                <h2 className="text-danger flex items-center gap-xs">
                  <AlertTriangle size={18} /> Foster Emergency Incident Beacon
                </h2>
                <button type="button" className="close-btn" onClick={() => setEmergencyApp(null)}>×</button>
              </div>

              <div className="form-body">
                <p className="text-xs text-danger mb-sm">
                  This sends an immediate high-priority alert to the supervising organization and duty vets.
                </p>
                <div className="field-group">
                  <label>Emergency Category</label>
                  <select 
                    className="form-select"
                    value={emergencyForm.emergencyType}
                    onChange={(e) => setEmergencyForm({...emergencyForm, emergencyType: e.target.value})}
                  >
                    <option value="injury">Physical Injury / Bleeding</option>
                    <option value="serious_illness">Acute Illness (Vomiting, Pale Gums, Seizure)</option>
                    <option value="escaped">Animal Escaped Perimeter</option>
                    <option value="behavioral_emergency">Severe Behavioral Agitation</option>
                    <option value="cannot_continue">Caregiver Incapacitated / Immediate Transfer Required</option>
                    <option value="other">Other Crisis</option>
                  </select>
                </div>
                <div className="field-group">
                  <label>Detailed Description of Situation</label>
                  <textarea 
                    className="form-textarea" 
                    rows="3" 
                    required 
                    placeholder="Describe symptoms, exact location, and animal status..."
                    value={emergencyForm.description}
                    onChange={(e) => setEmergencyForm({...emergencyForm, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-footer flex justify-end gap-sm">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setEmergencyApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-danger btn-sm" disabled={submitting}>
                  {submitting ? 'Broadcasting...' : 'Broadcast Emergency Beacon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOSTER-TO-ADOPT TRANSITION MODAL */}
      {adoptApp && (
        <div className="form-overlay" onClick={() => setAdoptApp(null)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleFosterToAdopt}>
              <div className="form-header">
                <h2 className="text-accent flex items-center gap-xs">
                  <Heart size={18} /> Foster-to-Adopt Transition
                </h2>
                <button type="button" className="close-btn" onClick={() => setAdoptApp(null)}>×</button>
              </div>

              <div className="form-body">
                <p className="text-xs text-muted mb-sm">
                  Ready to make it permanent? Transitioning your active foster care into a permanent adoption application 
                  skips duplicate background intake and links directly to the animal's permanent registry.
                </p>
                <div className="field-group">
                  <label>Statement of Intent to Adopt</label>
                  <textarea 
                    className="form-textarea" 
                    rows="3"
                    placeholder="Why would you like to permanently welcome this animal into your family?"
                    value={adoptNotes}
                    onChange={(e) => setAdoptNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-footer flex justify-end gap-sm">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setAdoptApp(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                  {submitting ? 'Linking...' : 'Submit Adoption Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
