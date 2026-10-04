import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart, Home, Shield, CheckCircle2, ExternalLink, FileText,
  Send, AlertCircle, Loader, Filter, Users, Calendar, Phone,
  ChevronDown, ChevronUp, ClipboardCheck, XCircle, Clock,
  BarChart2, Star, Home as HomeIcon, Sparkles, RefreshCw
} from 'lucide-react';
import { animalService, adoptionService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './AdoptionPage.css';

const STATUS_META = {
  PENDING:              { label: 'Pending Review',       color: '#F39C12', bg: 'rgba(243,156,18,0.12)',  icon: '⏳' },
  UNDER_REVIEW:         { label: 'Under Review',         color: '#3498DB', bg: 'rgba(52,152,219,0.12)',  icon: '🔍' },
  HOME_VISIT_SCHEDULED: { label: 'Home Visit Scheduled', color: '#9B59B6', bg: 'rgba(155,89,182,0.12)', icon: '🏠' },
  APPROVED:             { label: 'Approved',             color: '#2ECC71', bg: 'rgba(46,204,113,0.12)',  icon: '✅' },
  REJECTED:             { label: 'Not Approved',         color: '#E74C3C', bg: 'rgba(231,76,60,0.12)',  icon: '❌' },
  CANCELLED:            { label: 'Cancelled',            color: '#7F8C8D', bg: 'rgba(127,140,141,0.12)', icon: '🚫' },
};

function StatBadge({ label, value, color }) {
  return (
    <div className="adopt-stat-badge" style={{ borderColor: color }}>
      <span className="adopt-stat-val" style={{ color }}>{value}</span>
      <span className="adopt-stat-lbl">{label}</span>
    </div>
  );
}

function ApplicationCard({ app, isStaff, onReview, onCancel, currentUserId }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: '',
    reviewNotes: '',
    homeVisitDate: '',
  });

  const meta = STATUS_META[app.status] || STATUS_META.PENDING;
  const isOwner = app.applicant?._id === currentUserId || app.applicant === currentUserId;

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewForm.status) return;
    setReviewing(true);
    try {
      await onReview(app._id, reviewForm);
      setExpanded(false);
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className={`adopt-app-card glass-panel adopt-app--${app.status?.toLowerCase() || 'pending'}`}>
      <div className="adopt-app-header" onClick={() => setExpanded(v => !v)}>
        <div className="adopt-app-left">
          <span className="adopt-species-pill">
            {app.animal?.species || 'Animal'} #{app.animal?.animalId?.slice(-6) || '——'}
          </span>
          {isStaff && (
            <span className="adopt-applicant-name">
              <Users size={12} /> {app.applicant?.name || 'Applicant'}
            </span>
          )}
          <span className="adopt-app-date">
            <Calendar size={11} /> {new Date(app.createdAt).toLocaleDateString()}
          </span>
          {app.isFosterToAdopt && (
            <span className="adopt-f2a-badge">🔄 Foster-to-Adopt</span>
          )}
        </div>
        <div className="adopt-app-right">
          <span className="adopt-status-chip" style={{ background: meta.bg, color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Summary */}
      <div className="adopt-app-summary">
        <span><HomeIcon size={12} /> {app.housingType}</span>
        <span>{app.hasOtherPets ? '🐾 Has other pets' : '🏠 No other pets'}</span>
        {app.hasYard && <span>🌿 Has yard</span>}
        {app.householdAdults && <span>👥 {app.householdAdults} adults</span>}
      </div>

      {expanded && (
        <div className="adopt-app-detail animate-slide-down">
          {/* Experience */}
          <div className="adopt-detail-section">
            <h5 className="adopt-detail-title"><Star size={12} /> Pet Care Experience</h5>
            <p className="adopt-detail-text">{app.experienceDescription}</p>
          </div>

          {/* Daily Schedule */}
          {app.dailySchedule && (
            <div className="adopt-detail-section">
              <h5 className="adopt-detail-title"><Clock size={12} /> Daily Schedule</h5>
              <p className="adopt-detail-text">{app.dailySchedule}</p>
            </div>
          )}

          {/* References */}
          {app.references && app.references.length > 0 && (
            <div className="adopt-detail-section">
              <h5 className="adopt-detail-title"><Phone size={12} /> References ({app.references.length})</h5>
              {app.references.map((ref, i) => (
                <div key={i} className="adopt-ref-item">
                  <span className="adopt-ref-name">{ref.name}</span>
                  {ref.relationship && <span className="adopt-ref-rel">· {ref.relationship}</span>}
                  {ref.phone && <span className="adopt-ref-phone"><Phone size={10} /> {ref.phone}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Staff Review Notes */}
          {app.reviewNotes && (
            <div className="adopt-review-notes">
              <strong>Coordinator Notes:</strong> {app.reviewNotes}
            </div>
          )}

          {/* Home Visit */}
          {app.homeVisitDate && (
            <div className="adopt-home-visit">
              <Calendar size={13} />
              Home Visit: {new Date(app.homeVisitDate).toLocaleDateString()}
              {app.homeVisitCompleted && <span className="adopt-hv-done"><CheckCircle2 size={12} /> Completed</span>}
            </div>
          )}

          {/* Follow-ups */}
          {app.followUpSchedule && app.followUpSchedule.length > 0 && (
            <div className="adopt-detail-section">
              <h5 className="adopt-detail-title"><ClipboardCheck size={12} /> Post-Adoption Follow-ups</h5>
              {app.followUpSchedule.map((f, i) => (
                <div key={i} className="adopt-followup-item">
                  <span>{f.note}</span>
                  <span className={`adopt-followup-date ${f.completed ? 'done' : ''}`}>
                    {f.completed ? '✅' : '⏳'} {new Date(f.dueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Staff Review Panel */}
          {isStaff && !['APPROVED', 'REJECTED', 'CANCELLED'].includes(app.status) && (
            <div className="adopt-review-panel">
              <h5 className="adopt-detail-title"><ClipboardCheck size={12} /> Review Application</h5>
              <form onSubmit={submitReview} className="adopt-review-form">
                <div className="adopt-review-row">
                  <select
                    value={reviewForm.status}
                    onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}
                    className="form-select flex-1"
                    required
                  >
                    <option value="">— Select Decision —</option>
                    <option value="UNDER_REVIEW">🔍 Move to Under Review</option>
                    <option value="HOME_VISIT_SCHEDULED">🏠 Schedule Home Visit</option>
                    <option value="APPROVED">✅ Approve Application</option>
                    <option value="REJECTED">❌ Reject Application</option>
                  </select>
                  {reviewForm.status === 'HOME_VISIT_SCHEDULED' && (
                    <input
                      type="date"
                      className="form-select"
                      value={reviewForm.homeVisitDate}
                      onChange={e => setReviewForm(f => ({ ...f, homeVisitDate: e.target.value }))}
                    />
                  )}
                </div>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Coordinator notes (reason for decision, specific feedback...)"
                  value={reviewForm.reviewNotes}
                  onChange={e => setReviewForm(f => ({ ...f, reviewNotes: e.target.value }))}
                />
                <button type="submit" className="btn btn-primary btn-sm" disabled={reviewing || !reviewForm.status}>
                  {reviewing ? <><Loader size={12} className="spin" /> Processing...</> : <><ClipboardCheck size={12} /> Submit Review</>}
                </button>
              </form>
            </div>
          )}

          {/* Applicant cancel */}
          {isOwner && ['PENDING', 'UNDER_REVIEW', 'HOME_VISIT_SCHEDULED'].includes(app.status) && (
            <div className="adopt-cancel-row">
              <button className="btn btn-outline btn-sm adopt-cancel-btn" onClick={() => onCancel(app._id)}>
                <XCircle size={13} /> Withdraw Application
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdoptionPage() {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();

  const isStaff = ['ngo', 'shelter', 'admin'].includes(currentUser?.role);

  const [activeTab, setActiveTab] = useState('browse');
  const [animals, setAnimals] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState('all');
  const [appStatusFilter, setAppStatusFilter] = useState('all');

  // Adoption modal
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);
  const [appForm, setAppForm] = useState({
    housingType: 'Apartment',
    hasOtherPets: false,
    otherPetsDescription: '',
    experienceDescription: '',
    dailySchedule: '',
    hasYard: false,
    householdAdults: 1,
    householdChildren: 0,
    references: [{ name: '', phone: '', relationship: '' }],
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [animalList, appList, statsData] = await Promise.all([
        animalService.getAll(),
        adoptionService.getApplications().catch(() => []),
        isStaff ? adoptionService.getStats().catch(() => null) : Promise.resolve(null),
      ]);
      setAnimals(animalList || []);
      setApplications(appList || []);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load adoption data:', err);
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableAnimals = animals.filter(a => {
    const isAvailable = a.adoptionStatus === 'available_for_adoption' ||
      a.status === 'healthy' || a.status === 'rehabilitated' || a.status === 'sterilized';
    if (speciesFilter === 'all') return isAvailable;
    return isAvailable && a.species?.toLowerCase() === speciesFilter.toLowerCase();
  });

  const filteredApps = appStatusFilter === 'all'
    ? applications
    : applications.filter(a => a.status === appStatusFilter);

  const getSpeciesIcon = (species) => {
    const s = species?.toLowerCase() || '';
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐈';
    if (s.includes('bird')) return '🦜';
    if (s.includes('cattle') || s.includes('cow')) return '🐄';
    if (s.includes('goat')) return '🐐';
    return '🐾';
  };

  const handleApply = (animal) => {
    if (!currentUser) { navigate('/auth'); return; }
    setSelectedAnimal(animal);
    setFormFeedback(null);
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!selectedAnimal) return;
    if (!appForm.experienceDescription.trim()) {
      setFormFeedback({ type: 'error', text: 'Please describe your pet care experience.' });
      return;
    }
    setSubmitting(true);
    setFormFeedback(null);
    try {
      await adoptionService.submit({
        animalId: selectedAnimal._id,
        ...appForm,
        references: appForm.references.filter(r => r.name.trim()),
      });
      setFormFeedback({ type: 'success', text: 'Application submitted! Our team will contact you within 2-3 business days.' });
      setTimeout(() => {
        setSelectedAnimal(null);
        fetchData();
        setActiveTab('my-apps');
      }, 2500);
    } catch (err) {
      setFormFeedback({ type: 'error', text: err.message || 'Failed to submit application.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReview = async (id, data) => {
    try {
      await adoptionService.review(id, data);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Review failed.');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Withdraw this adoption application?')) return;
    try {
      await adoptionService.cancel(id);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to cancel application.');
    }
  };

  const addReference = () => {
    setAppForm(f => ({ ...f, references: [...f.references, { name: '', phone: '', relationship: '' }] }));
  };

  const updateRef = (i, field, val) => {
    setAppForm(f => {
      const refs = [...f.references];
      refs[i] = { ...refs[i], [field]: val };
      return { ...f, references: refs };
    });
  };

  return (
    <div className="adoption-page animate-fade-in">
      <div className="adoption-header">
        <div>
          <h1 className="adoption-title">
            <Heart className="text-primary inline-icon" size={28} /> Adoption & Forever Homes
          </h1>
          <p className="adoption-subtitle">
            Every rescued animal deserves a caring permanent home. Meet rehabilitated survivors ready for adoption.
          </p>
        </div>

        <div className="adoption-header-right">
          {isStaff && stats && (
            <div className="adopt-stats-row">
              <StatBadge label="Total" value={stats.total} color="#A0AEC0" />
              <StatBadge label="Pending" value={stats.pending} color="#F39C12" />
              <StatBadge label="Reviewing" value={stats.underReview + stats.homeVisit} color="#3498DB" />
              <StatBadge label="Approved" value={stats.approved} color="#2ECC71" />
            </div>
          )}
          <div className="adoption-tabs">
            <button
              className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >Browse Animals</button>
            <button
              className={`tab-btn ${activeTab === 'my-apps' ? 'active' : ''}`}
              onClick={() => setActiveTab('my-apps')}
            >
              {isStaff ? `All Applications (${applications.length})` : `My Applications (${applications.length})`}
            </button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={fetchData}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ─── Browse Tab ─── */}
      {activeTab === 'browse' && (
        <div className="browse-section">
          <div className="filter-bar">
            <span className="filter-lbl"><Filter size={13} /> Species:</span>
            {['all', 'dog', 'cat', 'bird', 'cattle', 'goat'].map(s => (
              <button
                key={s}
                className={`filter-chip ${speciesFilter === s ? 'selected' : ''}`}
                onClick={() => setSpeciesFilter(s)}
              >
                {s === 'all' ? '🐾 All Animals' : getSpeciesIcon(s) + ' ' + s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-state glass-panel">
              <Loader size={24} className="spin text-primary" />
              <p>Finding adoptable companions...</p>
            </div>
          ) : availableAnimals.length === 0 ? (
            <div className="empty-adoption glass-panel">
              <span className="empty-emoji">🏡</span>
              <h3>No Animals Currently Listed for Adoption</h3>
              <p>All rescued animals are undergoing stabilization or medical recovery. Check back soon, or consider registering as a foster parent!</p>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/foster')}>
                Explore Foster Opportunities
              </button>
            </div>
          ) : (
            <div className="animal-grid">
              {availableAnimals.map(animal => (
                <div key={animal._id} className="animal-card glass-panel">
                  <div className="animal-card-header">
                    <div className="species-avatar">{getSpeciesIcon(animal.species)}</div>
                    <div className="animal-card-title-col">
                      <h4>{animal.species || 'Animal'} #{animal.animalId || animal._id.slice(-6)}</h4>
                      <span className="animal-status-tag">
                        {animal.breed || 'Mixed'} · {animal.estimatedAge || 'Age unknown'}
                      </span>
                    </div>
                  </div>

                  <div className="animal-details-list">
                    <div className="detail-item">
                      <span className="detail-lbl">Sex:</span>
                      <span className="detail-val">{animal.sex ? animal.sex.charAt(0).toUpperCase() + animal.sex.slice(1) : 'Unknown'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-lbl">Sterilized:</span>
                      <span className="detail-val">{animal.sterilizationStatus === 'yes' ? '✅ Yes' : 'Pending'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-lbl">Vaccinations:</span>
                      <span className="detail-val">{animal.vaccinationRecords?.length || 0} recorded</span>
                    </div>
                    {animal.location?.address && (
                      <div className="detail-item">
                        <span className="detail-lbl">Location:</span>
                        <span className="detail-val address">{animal.location.city || animal.location.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="animal-card-actions">
                    <button
                      className="btn btn-outline btn-sm flex-1"
                      onClick={() => navigate(`/passport/${animal._id}`)}
                    >
                      <Shield size={13} /> Passport
                    </button>
                    <button
                      className="btn btn-primary btn-sm flex-1"
                      onClick={() => handleApply(animal)}
                    >
                      <Heart size={13} /> Adopt Me
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Applications Tab ─── */}
      {activeTab === 'my-apps' && (
        <div className="apps-section">
          {/* Status filter for staff */}
          {isStaff && (
            <div className="filter-bar">
              <span className="filter-lbl"><Filter size={13} /> Status:</span>
              {['all', 'PENDING', 'UNDER_REVIEW', 'HOME_VISIT_SCHEDULED', 'APPROVED', 'REJECTED'].map(s => (
                <button
                  key={s}
                  className={`filter-chip ${appStatusFilter === s ? 'selected' : ''}`}
                  onClick={() => setAppStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : (STATUS_META[s]?.icon + ' ' + STATUS_META[s]?.label)}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="loading-state glass-panel">
              <Loader size={24} className="spin text-primary" />
              <p>Loading applications...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="empty-adoption glass-panel">
              <FileText size={36} className="text-muted mb-sm" />
              <h3>{isStaff ? 'No Applications Found' : 'No Applications Submitted'}</h3>
              <p>
                {isStaff
                  ? 'No adoption applications match the current filter.'
                  : "You haven't applied to adopt any animal yet. Browse available animals and start the process!"
                }
              </p>
              {!isStaff && (
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('browse')}>
                  Browse Available Animals
                </button>
              )}
            </div>
          ) : (
            <div className="apps-list">
              {filteredApps.map(app => (
                <ApplicationCard
                  key={app._id}
                  app={app}
                  isStaff={isStaff}
                  onReview={handleReview}
                  onCancel={handleCancel}
                  currentUserId={currentUser?._id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Adoption Application Modal ─── */}
      {selectedAnimal && (
        <div className="modal-overlay" onClick={() => setSelectedAnimal(null)}>
          <div className="modal-content glass-panel adopt-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Heart className="text-primary" size={20} />
                Adopt {selectedAnimal.species} #{selectedAnimal.animalId || selectedAnimal._id.slice(-6)}
              </h3>
              <button className="close-btn" onClick={() => setSelectedAnimal(null)}>×</button>
            </div>

            {formFeedback && (
              <div className={`alert-banner ${formFeedback.type === 'success' ? 'success' : 'error'}`}>
                {formFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{formFeedback.text}</span>
              </div>
            )}

            <form onSubmit={submitApplication} className="adopt-form-scroll">
              <p className="modal-desc">
                Your application will be evaluated by our shelter coordinator. Providing detailed information improves your chances of approval.
              </p>

              {/* Housing */}
              <div className="adopt-form-section">
                <h5 className="adopt-form-section-title">🏡 Housing & Household</h5>
                <div className="form-group">
                  <label>Type of Housing</label>
                  <select value={appForm.housingType}
                    onChange={e => setAppForm(f => ({ ...f, housingType: e.target.value }))}>
                    <option value="Apartment">Apartment / Flat</option>
                    <option value="Independent House">Independent House</option>
                    <option value="Gated Villa with Garden">Gated Villa with Garden</option>
                    <option value="Farm / Rural Property">Farm / Rural Property</option>
                  </select>
                </div>
                <div className="adopt-check-row">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={appForm.hasYard}
                      onChange={e => setAppForm(f => ({ ...f, hasYard: e.target.checked }))} />
                    Property has a yard / outdoor space
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={appForm.hasOtherPets}
                      onChange={e => setAppForm(f => ({ ...f, hasOtherPets: e.target.checked }))} />
                    I currently have other pets
                  </label>
                </div>
                {appForm.hasOtherPets && (
                  <div className="form-group">
                    <label>Describe your other pets</label>
                    <input value={appForm.otherPetsDescription}
                      onChange={e => setAppForm(f => ({ ...f, otherPetsDescription: e.target.value }))}
                      placeholder="e.g. 1 adult male dog, neutered, friendly..." />
                  </div>
                )}
                <div className="adopt-num-row">
                  <div className="form-group">
                    <label>Adults in household</label>
                    <input type="number" min="1" value={appForm.householdAdults}
                      onChange={e => setAppForm(f => ({ ...f, householdAdults: Number(e.target.value) }))} />
                  </div>
                  <div className="form-group">
                    <label>Children in household</label>
                    <input type="number" min="0" value={appForm.householdChildren}
                      onChange={e => setAppForm(f => ({ ...f, householdChildren: Number(e.target.value) }))} />
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div className="adopt-form-section">
                <h5 className="adopt-form-section-title">⭐ Experience & Care Plan</h5>
                <div className="form-group">
                  <label>Pet Care Experience & Household Preparation *</label>
                  <textarea rows={3} value={appForm.experienceDescription}
                    onChange={e => setAppForm(f => ({ ...f, experienceDescription: e.target.value }))}
                    placeholder="Describe your experience with animals, how you plan to care for this animal, your home setup..." required />
                </div>
                <div className="form-group">
                  <label>Your Typical Daily Schedule</label>
                  <textarea rows={2} value={appForm.dailySchedule}
                    onChange={e => setAppForm(f => ({ ...f, dailySchedule: e.target.value }))}
                    placeholder="e.g. I work from home, partner leaves at 9am returns at 6pm..." />
                </div>
              </div>

              {/* References */}
              <div className="adopt-form-section">
                <div className="adopt-section-header">
                  <h5 className="adopt-form-section-title">📞 References (Optional)</h5>
                  <button type="button" className="btn btn-outline btn-sm" onClick={addReference}>+ Add</button>
                </div>
                {appForm.references.map((ref, i) => (
                  <div key={i} className="adopt-ref-form-row">
                    <input placeholder="Name" value={ref.name}
                      onChange={e => updateRef(i, 'name', e.target.value)} />
                    <input placeholder="Phone" value={ref.phone}
                      onChange={e => updateRef(i, 'phone', e.target.value)} />
                    <input placeholder="Relationship" value={ref.relationship}
                      onChange={e => updateRef(i, 'relationship', e.target.value)} />
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setSelectedAnimal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Adoption Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
