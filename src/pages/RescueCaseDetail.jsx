import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Shield, MapPin, Clock, User, Activity, FileText,
  Stethoscope, CheckCircle2, Circle, AlertTriangle, Phone,
  Navigation, MessageSquare, Loader, RefreshCw, ChevronRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { vetService, animalService } from '../services/api';
import './RescueCaseDetail.css';

const STATUS_TIMELINE = [
  { key: 'Reported',     label: 'Reported',          icon: '📢' },
  { key: 'Dispatched',   label: 'Verified & Dispatched', icon: '📡' },
  { key: 'Accepted',     label: 'Volunteer Assigned', icon: '🙋' },
  { key: 'En Route',     label: 'En Route',           icon: '🚗' },
  { key: 'In Progress',  label: 'Arrived on Scene',   icon: '📍' },
  { key: 'Stabilized',   label: 'Animal Stabilized',  icon: '🩹' },
  { key: 'Completed',    label: 'Rescue Complete',     icon: '✅' },
  { key: 'Verified',     label: 'Case Closed & Verified', icon: '🛡️' },
];

const STATUS_ORDER = STATUS_TIMELINE.map(s => s.key);

function getStatusIndex(status) {
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 0 : idx;
}

const URGENCY_LABELS = {
  'P1': 'CRITICAL', 'P1 - Critical': 'CRITICAL', 'Critical': 'CRITICAL',
  'P2': 'HIGH',     'P2 - High': 'HIGH',         'High': 'HIGH',
  'P3': 'MEDIUM',   'P3 - Normal': 'MEDIUM',      'Medium': 'MEDIUM',
  'P4': 'LOW',      'P4 - Low': 'LOW',            'Low': 'LOW',
};

const URGENCY_CLASS = {
  'CRITICAL': 'urgency-critical',
  'HIGH': 'urgency-high',
  'MEDIUM': 'urgency-medium',
  'LOW': 'urgency-low',
};

function formatRelative(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function RescueCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tasks, updateTask, verifyTask, currentUser, updateTaskDispatch } = useAppContext();

  const [medicalRecords, setMedicalRecords] = useState([]);
  const [animal, setAnimal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const task = tasks.find(t => (t._id || t.id) === id);

  useEffect(() => {
    if (task?.animal) {
      const animalId = typeof task.animal === 'object' ? task.animal._id : task.animal;
      if (animalId) {
        setLoading(true);
        Promise.all([
          animalService.getById(animalId).catch(() => null),
          vetService.getByAnimal(animalId).catch(() => []),
        ]).then(([animalData, records]) => {
          setAnimal(animalData);
          setMedicalRecords(Array.isArray(records) ? records : []);
        }).finally(() => setLoading(false));
      }
    }
  }, [task]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAction = async (newStatus) => {
    if (!task) return;
    const taskId = task._id || task.id;
    setActionLoading(true);
    try {
      if (newStatus === 'Verified') {
        await verifyTask(taskId);
        showToast('Case verified and closed! ✅');
      } else {
        await updateTask(taskId, newStatus);
        showToast(`Status updated to "${newStatus}"`);
      }
    } catch (err) {
      showToast(err.message || 'Action failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!task) {
    return (
      <div className="case-detail-container animate-fade-in">
        <div className="case-not-found">
          <Shield size={48} />
          <h2>Case Not Found</h2>
          <p>This rescue case may have been removed or the ID is incorrect.</p>
          <button className="btn btn-primary" onClick={() => navigate('/app/tasks')}>
            <ArrowLeft size={18} /> Back to Rescue Board
          </button>
        </div>
      </div>
    );
  }

  const urgencyLabel = URGENCY_LABELS[task.urgency] || 'MEDIUM';
  const urgencyClass = URGENCY_CLASS[urgencyLabel] || 'urgency-medium';
  const currentStatusIdx = getStatusIndex(task.status);
  const caseId = task._id?.toString().slice(-6).toUpperCase() || 'UNKNOWN';

  const getNextAction = () => {
    switch (task.status) {
      case 'Reported':   return { label: '⚡ Dispatch Case', next: 'Dispatched' };
      case 'Dispatched': return { label: '✋ Accept Rescue', next: 'Accepted' };
      case 'Accepted':   return { label: '🚗 Mark En Route', next: 'En Route' };
      case 'En Route':   return { label: '📍 Mark Arrived', next: 'In Progress' };
      case 'In Progress':return { label: '🩹 Mark Stabilized', next: 'Stabilized' };
      case 'Stabilized': return { label: '✅ Complete Rescue', next: 'Completed' };
      case 'Completed':
        if (currentUser?.role === 'ngo' || currentUser?.role === 'admin') {
          return { label: '🛡️ Verify & Close Case', next: 'Verified' };
        }
        return null;
      default: return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <div className="case-detail-container animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className={`case-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="case-detail-header">
        <button className="back-btn" onClick={() => navigate('/app/tasks')}>
          <ArrowLeft size={18} /> Rescue Board
        </button>

        <div className="case-id-row">
          <div className="case-id-badge">
            <Shield size={16} />
            FN-RES-{caseId}
          </div>
          <span className={`urgency-badge ${urgencyClass}`}>{urgencyLabel} PRIORITY</span>
          <span className="status-pill">{task.status}</span>
        </div>

        <h1 className="case-title">
          {task.title || `${(task.animalType || 'Animal').toUpperCase()} RESCUE CASE`}
        </h1>

        <div className="case-meta-row">
          <span><Clock size={14} /> Reported {formatRelative(task.createdAt)}</span>
          {task.location?.city && <span><MapPin size={14} /> {task.location.city}</span>}
          {task.location?.area && <span><MapPin size={14} /> {task.location.area}</span>}
        </div>
      </div>

      {/* Primary Action */}
      {nextAction && (
        <div className="case-primary-action">
          <button
            className="btn btn-primary btn-xl action-main-btn"
            onClick={() => handleAction(nextAction.next)}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader size={18} className="spin" /> : null}
            {nextAction.label}
          </button>
        </div>
      )}

      <div className="case-detail-grid">
        {/* Left Column */}
        <div className="case-left-col">
          {/* Animal Info */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><Activity size={18} /> Animal</h3>
            {task.report?.images?.[0] ? (
              <img src={task.report.images[0]} alt="Animal" className="case-animal-img" />
            ) : animal?.photographs?.[0] ? (
              <img src={animal.photographs[0]} alt="Animal" className="case-animal-img" />
            ) : (
              <div className="case-animal-img-placeholder">🐾</div>
            )}
            <div className="case-info-grid">
              <div className="case-info-item">
                <label>Species</label>
                <span>{task.animalType || animal?.species || '—'}</span>
              </div>
              <div className="case-info-item">
                <label>Animal ID</label>
                <span className="mono">{animal?.animalId || '—'}</span>
              </div>
              <div className="case-info-item">
                <label>Condition</label>
                <span>{animal?.status?.replace(/_/g, ' ') || 'Reported'}</span>
              </div>
              <div className="case-info-item">
                <label>Markings</label>
                <span>{animal?.identifyingMarkings || '—'}</span>
              </div>
            </div>
            {animal?.animalId && (
              <Link to={`/passport/${animal.animalId}`} className="passport-link-btn" target="_blank">
                View Digital Passport <ChevronRight size={14} />
              </Link>
            )}
          </section>

          {/* Report Description */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><FileText size={18} /> Incident Report</h3>
            <p className="case-description">{task.description}</p>
            <div className="case-info-item mt-sm">
              <label>Location</label>
              <span>
                <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {task.location?.address || task.location?.area || `${task.location?.lat?.toFixed(5)}, ${task.location?.lng?.toFixed(5)}`}
              </span>
            </div>
          </section>

          {/* Medical Records */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><Stethoscope size={18} /> Medical Records</h3>
            {loading ? (
              <div className="loading-inline"><Loader size={16} className="spin" /> Loading...</div>
            ) : medicalRecords.length === 0 ? (
              <div className="empty-inline">
                <p>No medical records yet.</p>
                {(currentUser?.role === 'vet' || currentUser?.role === 'ngo' || currentUser?.role === 'admin') && (
                  <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/health')}>
                    Add Medical Record
                  </button>
                )}
              </div>
            ) : (
              <div className="medical-list">
                {medicalRecords.map(rec => (
                  <div key={rec._id} className="medical-record-card">
                    <div className="medical-record-header">
                      <span className="medical-date">{new Date(rec.createdAt).toLocaleDateString()}</span>
                      <span className="medical-status">{rec.dischargeStatus?.replace(/_/g, ' ') || 'in care'}</span>
                    </div>
                    <p><strong>Diagnosis:</strong> {rec.diagnosis}</p>
                    <p><strong>Treatment:</strong> {rec.treatment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="case-right-col">
          {/* Case Timeline */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><Clock size={18} /> Case Timeline</h3>
            <div className="case-timeline">
              {STATUS_TIMELINE.map((step, idx) => {
                const done = idx < currentStatusIdx;
                const current = idx === currentStatusIdx;
                const future = idx > currentStatusIdx;
                return (
                  <div key={step.key} className={`timeline-step ${done ? 'done' : ''} ${current ? 'current' : ''} ${future ? 'future' : ''}`}>
                    <div className="timeline-dot">
                      {done ? <CheckCircle2 size={16} /> : current ? <div className="timeline-pulse" /> : <Circle size={16} />}
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-emoji">{step.icon}</span>
                      <span className="timeline-label">{step.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Dispatch Info */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><Navigation size={18} /> Dispatch</h3>
            <div className="case-info-grid">
              <div className="case-info-item">
                <label>Responder Status</label>
                <span>{task.dispatch?.responderStatus || 'Awaiting dispatch'}</span>
              </div>
              <div className="case-info-item">
                <label>Distance</label>
                <span>{task.dispatch?.responderDistanceKm ? `${task.dispatch.responderDistanceKm.toFixed(1)} km` : '—'}</span>
              </div>
              <div className="case-info-item">
                <label>ETA</label>
                <span>{task.dispatch?.etaMinutes ? `~${task.dispatch.etaMinutes} min` : '—'}</span>
              </div>
              <div className="case-info-item">
                <label>Escalation</label>
                <span>{task.dispatch?.escalationState || 'none'}</span>
              </div>
            </div>
            {task.location?.lat && task.location?.lng && (
              <a
                href={`https://maps.google.com/?q=${task.location.lat},${task.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm mt-sm"
              >
                <Navigation size={14} /> Navigate on Maps
              </a>
            )}
          </section>

          {/* Assignment */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><User size={18} /> Assignment</h3>
            <div className="case-info-item">
              <label>Assigned Volunteer</label>
              <span>{task.assignedTo ? (typeof task.assignedTo === 'object' ? task.assignedTo.name : 'Assigned') : 'Unassigned'}</span>
            </div>
            <div className="case-info-item">
              <label>Type</label>
              <span>{task.type || 'Rescue'}</span>
            </div>
          </section>

          {/* Persistent Rescue Operational Checklist */}
          <section className="case-section glass-panel">
            <h3 className="section-heading"><CheckCircle2 size={18} /> Operational Rescue Checklist</h3>
            <div className="checklist-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              {[
                { key: 'reviewCase', label: 'Review case details & triage notes' },
                { key: 'assessSceneSafety', label: 'Assess traffic & perimeter scene safety' },
                { key: 'locateAnimal', label: 'Locate and approach animal cautiously' },
                { key: 'beginRescue', label: 'Begin rescue / gentle containment' },
                { key: 'stabilizeAnimal', label: 'Stabilize animal & apply first-aid' },
                { key: 'arrangeTransport', label: 'Secure animal in transport crate' },
                { key: 'completeHandoff', label: 'Complete handoff to veterinary/shelter unit' }
              ].map(item => {
                const isChecked = Boolean(task.checklist?.[item.key]);
                const canCheck = currentUser && (currentUser.role !== 'citizen' || task.assignedTo?._id === currentUser.id);
                return (
                  <label 
                    key={item.key} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      padding: '8px 12px', 
                      background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                      borderRadius: '8px',
                      cursor: canCheck ? 'pointer' : 'default',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!canCheck || actionLoading}
                      onChange={async (e) => {
                        const newChecklist = { ...(task.checklist || {}), [item.key]: e.target.checked };
                        try {
                          await import('../services/api').then(m => m.taskService.updateChecklist(task._id || task.id, newChecklist));
                          task.checklist = newChecklist;
                          showToast(`Checklist updated: "${item.label}"`);
                        } catch (err) {
                          showToast('Failed to update checklist item', 'error');
                        }
                      }}
                      style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
                    />
                    <span style={{ fontSize: '0.88rem', color: isChecked ? '#10b981' : 'var(--text-secondary)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Quick Messages */}
          {task.dispatch?.quickMessages && task.dispatch.quickMessages.length > 0 && (
            <section className="case-section glass-panel">
              <h3 className="section-heading"><MessageSquare size={18} /> Communication Log</h3>
              <div className="comms-list">
                {task.dispatch.quickMessages.slice(-5).map((msg, i) => (
                  <div key={i} className="comms-item">
                    <span className="comms-text">{msg.text}</span>
                    <span className="comms-time">{formatRelative(msg.at)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cross-Module Handoffs */}
          <section className="case-section glass-panel" style={{ border: '1px solid rgba(249, 115, 22, 0.3)' }}>
            <h3 className="section-heading" style={{ color: '#f97316' }}><Shield size={18} /> Platform Workflow Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
              <Link to={`/app/health`} className="btn btn-outline btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>
                <Stethoscope size={14} /> Open Veterinary Clinic Dossier
              </Link>
              <Link to={`/app/foster`} className="btn btn-outline btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>
                🐾 Check Foster Availability
              </Link>
              <Link to={`/app/lost-found`} className="btn btn-outline btn-sm" style={{ textAlign: 'center', justifyContent: 'center' }}>
                🔍 Cross-reference Lost & Found Reports
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
