import { useState, useEffect } from 'react';
import {
  Heart, Thermometer, Activity, Shield, AlertCircle, Plus,
  Stethoscope, RefreshCw, FileText, ChevronDown, ChevronUp,
  Pill, FlaskConical, CalendarClock, CheckCircle2, AlertTriangle,
  Clock, XCircle, Loader, BarChart2, ClipboardList
} from 'lucide-react';
import { vetService, animalService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './HealthDashboard.css';

const STATUS_META = {
  in_care: { label: 'In Care', color: '#3498DB', icon: '🏥' },
  ready_for_shelter: { label: 'Ready for Shelter', color: '#F39C12', icon: '🏠' },
  released_to_wild: { label: 'Released', color: '#2ECC71', icon: '🌿' },
  ready_for_adoption: { label: 'Ready for Adoption', color: '#9B59B6', icon: '💜' },
  deceased: { label: 'Deceased', color: '#7F8C8D', icon: '🕊️' },
};

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div className="hd-stat-box" style={{ '--stat-accent': color }}>
      <div className="hd-stat-icon"><Icon size={20} /></div>
      <div className="hd-stat-content">
        <span className="hd-stat-value">{value}</span>
        <span className="hd-stat-label">{label}</span>
      </div>
    </div>
  );
}

function MedicalRecordCard({ record, isVetOrNgo, onStatusUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(record.dischargeStatus || 'in_care');
  const meta = STATUS_META[record.dischargeStatus] || STATUS_META.in_care;

  const hasFollowUp = record.followUpDate && !record.followUpCompleted;
  const followUpOverdue = hasFollowUp && new Date(record.followUpDate) < new Date();

  const handleStatusChange = async () => {
    if (newStatus === record.dischargeStatus) return;
    setUpdating(true);
    try {
      await vetService.updateRecord(record._id, { dischargeStatus: newStatus });
      onStatusUpdate();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className={`med-card glass-panel med-card--${record.dischargeStatus || 'in_care'}`}>
      <div className="med-card-header" onClick={() => setExpanded(v => !v)}>
        <div className="med-card-id">
          <span className="med-species-pill">{record.animal?.species || 'Animal'}</span>
          <span className="med-animal-id">#{record.animal?.animalId || 'N/A'}</span>
          {hasFollowUp && (
            <span className={`follow-up-badge ${followUpOverdue ? 'overdue' : ''}`}>
              <CalendarClock size={11} />
              {followUpOverdue ? 'Follow-up OVERDUE' : 'Follow-up Pending'}
            </span>
          )}
        </div>
        <div className="med-card-status-row">
          <span className="med-status-tag" style={{ background: meta.color + '22', color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          <span className="med-date">{new Date(record.createdAt).toLocaleDateString()}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      <div className="med-card-summary">
        <div className="med-summary-item">
          <span className="med-lbl">Diagnosis</span>
          <span className="med-val">{record.diagnosis}</span>
        </div>
        <div className="med-summary-item">
          <span className="med-lbl">Attending Vet</span>
          <span className="med-val">{record.vet?.name || 'Veterinarian'}</span>
        </div>
      </div>

      {expanded && (
        <div className="med-card-detail animate-slide-down">
          {/* Vitals */}
          {record.vitals && Object.values(record.vitals).some(Boolean) && (
            <div className="med-section">
              <h5 className="med-section-title"><Thermometer size={14} /> Vitals at Examination</h5>
              <div className="vitals-mini-grid">
                {record.vitals.weightKg && <span className="vital-chip">⚖️ {record.vitals.weightKg} kg</span>}
                {record.vitals.temperatureCelsius && <span className="vital-chip">🌡️ {record.vitals.temperatureCelsius}°C</span>}
                {record.vitals.heartRateBpm && <span className="vital-chip">❤️ {record.vitals.heartRateBpm} bpm</span>}
                {record.vitals.bodyConditionScore && <span className="vital-chip">📊 BCS {record.vitals.bodyConditionScore}/9</span>}
                {record.vitals.mucousMembraneColor && <span className="vital-chip">🔵 MM: {record.vitals.mucousMembraneColor}</span>}
              </div>
            </div>
          )}

          {/* Examination */}
          <div className="med-section">
            <h5 className="med-section-title"><ClipboardList size={14} /> Examination Findings</h5>
            <p className="med-text">{record.examination}</p>
          </div>

          {/* Treatment */}
          <div className="med-section">
            <h5 className="med-section-title"><Activity size={14} /> Treatment Protocol</h5>
            <p className="med-text">{record.treatment}</p>
          </div>

          {/* Medications */}
          {record.medications && record.medications.length > 0 && (
            <div className="med-section">
              <h5 className="med-section-title"><Pill size={14} /> Medications ({record.medications.length})</h5>
              <div className="med-meds-list">
                {record.medications.map((med, i) => (
                  <div key={i} className="med-med-item">
                    <span className="med-med-name">{med.name}</span>
                    <span className="med-med-dose">{med.dosage} · {med.frequency}</span>
                    {med.durationDays && <span className="med-med-dur">{med.durationDays} days</span>}
                    {med.route && <span className="med-med-route">{med.route}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vaccinations */}
          {record.vaccinationsAdministered && record.vaccinationsAdministered.length > 0 && (
            <div className="med-section">
              <h5 className="med-section-title"><Shield size={14} /> Vaccinations Administered</h5>
              <div className="med-tags">
                {record.vaccinationsAdministered.map((v, i) => (
                  <span key={i} className="med-vaccine-tag">✅ {v}</span>
                ))}
              </div>
            </div>
          )}

          {/* Procedures & Surgeries */}
          {(record.procedures?.length > 0 || record.surgeries?.length > 0) && (
            <div className="med-section">
              <h5 className="med-section-title"><Stethoscope size={14} /> Procedures & Surgeries</h5>
              <div className="med-tags">
                {[...(record.procedures || []), ...(record.surgeries || [])].map((p, i) => (
                  <span key={i} className="med-proc-tag">🔧 {p}</span>
                ))}
              </div>
            </div>
          )}

          {/* Lab Results */}
          {record.labResults && record.labResults.length > 0 && (
            <div className="med-section">
              <h5 className="med-section-title"><FlaskConical size={14} /> Lab Results</h5>
              {record.labResults.map((lab, i) => (
                <div key={i} className="med-lab-item">
                  <span className="med-lab-test">{lab.testName}</span>
                  <span className="med-lab-result">{lab.result}</span>
                  {lab.referenceRange && <span className="med-lab-ref">Ref: {lab.referenceRange}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Follow-up */}
          {record.followUpDate && (
            <div className={`med-followup-banner ${followUpOverdue ? 'overdue' : ''}`}>
              <CalendarClock size={15} />
              <span>Follow-up: {new Date(record.followUpDate).toLocaleDateString()}</span>
              {record.followUpCompleted
                ? <span className="followup-done"><CheckCircle2 size={13} /> Completed</span>
                : <span className="followup-pending"><Clock size={13} /> {followUpOverdue ? 'OVERDUE' : 'Pending'}</span>
              }
            </div>
          )}

          {/* Notes */}
          {record.notes && (
            <div className="med-section">
              <h5 className="med-section-title"><FileText size={14} /> Clinical Notes</h5>
              <p className="med-text med-notes">{record.notes}</p>
            </div>
          )}

          {/* Status Update (vet/ngo/admin) */}
          {isVetOrNgo && (
            <div className="med-status-update">
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
                className="med-status-select"
              >
                {Object.entries(STATUS_META).map(([val, m]) => (
                  <option key={val} value={val}>{m.icon} {m.label}</option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleStatusChange}
                disabled={updating || newStatus === record.dischargeStatus}
              >
                {updating ? <Loader size={13} className="spin" /> : <CheckCircle2 size={13} />}
                Update Status
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HealthDashboard() {
  const { currentUser } = useAppContext();
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [animalsInCare, setAnimalsInCare] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Create record modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    animalId: '',
    examination: '',
    diagnosis: '',
    treatment: '',
    dischargeStatus: 'in_care',
    clinicName: '',
    notes: '',
    vitals: { weightKg: '', temperatureCelsius: '', heartRateBpm: '', bodyConditionScore: '' },
    medications: [],
    vaccinationsAdministered: [],
    procedures: [],
  });

  // Medication sub-form
  const [medInput, setMedInput] = useState({ name: '', dosage: '', frequency: '', durationDays: '', route: 'oral' });
  const [vaccInput, setVaccInput] = useState('');
  const [procInput, setProcInput] = useState('');

  const isVetOrNgo = currentUser && ['vet', 'ngo', 'admin'].includes(currentUser.role);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [recordsData, animalsData, statsData] = await Promise.all([
        vetService.getAll(),
        animalService.getAll({ status: 'under_treatment' }),
        vetService.getStats().catch(() => null),
      ]);
      setMedicalRecords(Array.isArray(recordsData) ? recordsData : []);
      setAnimalsInCare(Array.isArray(animalsData) ? animalsData : []);
      if (statsData) setStats(statsData);
    } catch (err) {
      console.error('Failed to load veterinary records:', err);
      setError('Unable to fetch veterinary health records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRecords = activeFilter === 'all'
    ? medicalRecords
    : medicalRecords.filter(r => r.dischargeStatus === activeFilter);

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!form.animalId || !form.examination || !form.diagnosis || !form.treatment) {
      alert('Please fill out all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await vetService.createRecord({
        animalId: form.animalId,
        examination: form.examination,
        diagnosis: form.diagnosis,
        treatment: form.treatment,
        dischargeStatus: form.dischargeStatus,
        clinicName: form.clinicName,
        notes: form.notes,
        vitals: {
          weightKg: form.vitals.weightKg ? Number(form.vitals.weightKg) : undefined,
          temperatureCelsius: form.vitals.temperatureCelsius ? Number(form.vitals.temperatureCelsius) : undefined,
          heartRateBpm: form.vitals.heartRateBpm ? Number(form.vitals.heartRateBpm) : undefined,
          bodyConditionScore: form.vitals.bodyConditionScore ? Number(form.vitals.bodyConditionScore) : undefined,
        },
        medications: form.medications,
        vaccinationsAdministered: form.vaccinationsAdministered,
        procedures: form.procedures,
      });
      setShowModal(false);
      setForm({
        animalId: '', examination: '', diagnosis: '', treatment: '',
        dischargeStatus: 'in_care', clinicName: '', notes: '',
        vitals: { weightKg: '', temperatureCelsius: '', heartRateBpm: '', bodyConditionScore: '' },
        medications: [], vaccinationsAdministered: [], procedures: [],
      });
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create medical record.');
    } finally {
      setSubmitting(false);
    }
  };

  const addMedication = () => {
    if (!medInput.name) return;
    setForm(f => ({ ...f, medications: [...f.medications, { ...medInput }] }));
    setMedInput({ name: '', dosage: '', frequency: '', durationDays: '', route: 'oral' });
  };

  const addVaccination = () => {
    if (!vaccInput.trim()) return;
    setForm(f => ({ ...f, vaccinationsAdministered: [...f.vaccinationsAdministered, vaccInput.trim()] }));
    setVaccInput('');
  };

  const addProcedure = () => {
    if (!procInput.trim()) return;
    setForm(f => ({ ...f, procedures: [...f.procedures, procInput.trim()] }));
    setProcInput('');
  };

  return (
    <div className="health-dashboard animate-fade-in">
      <header className="hd-header">
        <div>
          <h1 className="hd-title"><Stethoscope size={26} /> Veterinary & Medical Dashboard</h1>
          <p className="hd-subtitle">Clinical records, animal treatment status, follow-up scheduling, and discharge management.</p>
        </div>
        <div className="hd-header-actions">
          <button className="btn btn-outline btn-sm" onClick={fetchData}>
            <RefreshCw size={15} /> Refresh
          </button>
          {isVetOrNgo && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={15} /> New Medical Record
            </button>
          )}
        </div>
      </header>

      {/* Stats Row */}
      {stats && (
        <div className="hd-stats-row">
          <StatBox label="Total Records" value={stats.total} color="#3498DB" icon={FileText} />
          <StatBox label="In Active Care" value={stats.inCare} color="#E74C3C" icon={Heart} />
          <StatBox label="Ready for Adoption" value={stats.readyForAdoption} color="#9B59B6" icon={Shield} />
          <StatBox label="Released" value={stats.released} color="#2ECC71" icon={Activity} />
          <StatBox label="Follow-ups Due" value={stats.withFollowUp} color="#F39C12" icon={CalendarClock} />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="hd-filter-bar">
        {[
          { key: 'all', label: 'All Records' },
          { key: 'in_care', label: '🏥 In Care' },
          { key: 'ready_for_shelter', label: '🏠 Ready for Shelter' },
          { key: 'ready_for_adoption', label: '💜 Ready for Adoption' },
          { key: 'released_to_wild', label: '🌿 Released' },
        ].map(f => (
          <button
            key={f.key}
            className={`hd-filter-btn ${activeFilter === f.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Records */}
      {loading ? (
        <div className="hd-empty">
          <Loader size={32} className="spin hd-empty-icon" />
          <p>Loading medical records...</p>
        </div>
      ) : error ? (
        <div className="hd-error">
          <AlertTriangle size={20} /> {error}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="hd-empty">
          <Stethoscope size={48} className="hd-empty-icon" />
          <h3>No Records Found</h3>
          <p>
            {activeFilter === 'all'
              ? 'No medical records in the system yet. Verified vets and NGOs can create records above.'
              : `No records with status "${STATUS_META[activeFilter]?.label || activeFilter}".`
            }
          </p>
          {isVetOrNgo && activeFilter === 'all' && (
            <button className="btn btn-primary btn-sm mt-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Create First Record
            </button>
          )}
        </div>
      ) : (
        <div className="hd-records-list">
          {filteredRecords.map(record => (
            <MedicalRecordCard
              key={record._id}
              record={record}
              isVetOrNgo={isVetOrNgo}
              onStatusUpdate={fetchData}
            />
          ))}
        </div>
      )}

      {/* ─── Create Medical Record Modal ─── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content hd-modal glass-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Stethoscope size={20} /> New Veterinary Medical Record</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form className="hd-form" onSubmit={handleCreateRecord}>
              <div className="hd-form-scroll">

                {/* Animal Selection */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title">Animal</h4>
                  <select
                    value={form.animalId}
                    onChange={e => setForm(f => ({ ...f, animalId: e.target.value }))}
                    required className="form-select"
                  >
                    <option value="">— Select Animal in System —</option>
                    {animalsInCare.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.animalId} — {a.species} ({a.location?.city || a.location?.area || 'N/A'})
                      </option>
                    ))}
                  </select>
                  {animalsInCare.length === 0 && (
                    <p className="hd-form-hint">
                      No animals with "under_treatment" status. You can still type an Animal ID directly below.
                    </p>
                  )}
                  <input
                    className="form-select mt-xs"
                    placeholder="Or type Animal ID / DB ObjectId directly..."
                    value={form.animalId.startsWith('FN-') || (!animalsInCare.find(a => a._id === form.animalId) && form.animalId) ? form.animalId : ''}
                    onChange={e => setForm(f => ({ ...f, animalId: e.target.value }))}
                  />
                </div>

                {/* Vitals */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title"><Thermometer size={14} /> Vitals (Optional)</h4>
                  <div className="hd-vitals-grid">
                    <div className="field-group">
                      <label>Weight (kg)</label>
                      <input type="number" step="0.1" className="form-select" placeholder="e.g. 12.5"
                        value={form.vitals.weightKg}
                        onChange={e => setForm(f => ({ ...f, vitals: { ...f.vitals, weightKg: e.target.value } }))} />
                    </div>
                    <div className="field-group">
                      <label>Temperature (°C)</label>
                      <input type="number" step="0.1" className="form-select" placeholder="e.g. 38.5"
                        value={form.vitals.temperatureCelsius}
                        onChange={e => setForm(f => ({ ...f, vitals: { ...f.vitals, temperatureCelsius: e.target.value } }))} />
                    </div>
                    <div className="field-group">
                      <label>Heart Rate (bpm)</label>
                      <input type="number" className="form-select" placeholder="e.g. 120"
                        value={form.vitals.heartRateBpm}
                        onChange={e => setForm(f => ({ ...f, vitals: { ...f.vitals, heartRateBpm: e.target.value } }))} />
                    </div>
                    <div className="field-group">
                      <label>BCS Score (1-9)</label>
                      <input type="number" min="1" max="9" className="form-select" placeholder="e.g. 4"
                        value={form.vitals.bodyConditionScore}
                        onChange={e => setForm(f => ({ ...f, vitals: { ...f.vitals, bodyConditionScore: e.target.value } }))} />
                    </div>
                  </div>
                </div>

                {/* Clinical */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title"><ClipboardList size={14} /> Clinical Assessment</h4>
                  <div className="field-group">
                    <label>Examination Findings *</label>
                    <textarea rows={2} className="form-textarea" required
                      placeholder="Physical examination, temperature, visible injuries, behavior..."
                      value={form.examination}
                      onChange={e => setForm(f => ({ ...f, examination: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <label>Diagnosis *</label>
                    <input className="form-select" required placeholder="e.g. Right Femur Fracture, Severe Malnutrition"
                      value={form.diagnosis}
                      onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <label>Treatment Protocol *</label>
                    <textarea rows={2} className="form-textarea" required
                      placeholder="Surgery, IV fluids, wound dressing, pain management..."
                      value={form.treatment}
                      onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))} />
                  </div>
                </div>

                {/* Medications */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title"><Pill size={14} /> Medications</h4>
                  <div className="hd-add-row">
                    <input className="form-select flex-1" placeholder="Drug name" value={medInput.name}
                      onChange={e => setMedInput(m => ({ ...m, name: e.target.value }))} />
                    <input className="form-select" style={{ width: '100px' }} placeholder="Dosage" value={medInput.dosage}
                      onChange={e => setMedInput(m => ({ ...m, dosage: e.target.value }))} />
                    <input className="form-select" style={{ width: '100px' }} placeholder="Frequency" value={medInput.frequency}
                      onChange={e => setMedInput(m => ({ ...m, frequency: e.target.value }))} />
                    <input className="form-select" style={{ width: '80px' }} placeholder="Days" type="number" value={medInput.durationDays}
                      onChange={e => setMedInput(m => ({ ...m, durationDays: e.target.value }))} />
                    <select className="form-select" style={{ width: '100px' }} value={medInput.route}
                      onChange={e => setMedInput(m => ({ ...m, route: e.target.value }))}>
                      <option value="oral">Oral</option>
                      <option value="IV">IV</option>
                      <option value="injection">Injection</option>
                      <option value="topical">Topical</option>
                      <option value="subcutaneous">Subcutaneous</option>
                    </select>
                    <button type="button" className="btn btn-outline btn-sm" onClick={addMedication}>+ Add</button>
                  </div>
                  {form.medications.map((m, i) => (
                    <div key={i} className="hd-added-item">
                      <Pill size={12} /> {m.name} · {m.dosage} · {m.frequency} · {m.durationDays}d · {m.route}
                      <button type="button" className="hd-remove-btn"
                        onClick={() => setForm(f => ({ ...f, medications: f.medications.filter((_, j) => j !== i) }))}>
                        <XCircle size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Vaccinations */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title"><Shield size={14} /> Vaccinations Administered</h4>
                  <div className="hd-add-row">
                    <input className="form-select flex-1" placeholder="e.g. Anti-Rabies, Parvovirus, Distemper"
                      value={vaccInput} onChange={e => setVaccInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addVaccination())} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={addVaccination}>+ Add</button>
                  </div>
                  <div className="hd-tags-row">
                    {form.vaccinationsAdministered.map((v, i) => (
                      <span key={i} className="hd-tag">✅ {v}
                        <button type="button" className="hd-tag-remove"
                          onClick={() => setForm(f => ({ ...f, vaccinationsAdministered: f.vaccinationsAdministered.filter((_, j) => j !== i) }))}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Procedures */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title"><Stethoscope size={14} /> Procedures & Surgeries</h4>
                  <div className="hd-add-row">
                    <input className="form-select flex-1" placeholder="e.g. Wound debridement, Splenectomy, X-Ray"
                      value={procInput} onChange={e => setProcInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProcedure())} />
                    <button type="button" className="btn btn-outline btn-sm" onClick={addProcedure}>+ Add</button>
                  </div>
                  <div className="hd-tags-row">
                    {form.procedures.map((p, i) => (
                      <span key={i} className="hd-tag">🔧 {p}
                        <button type="button" className="hd-tag-remove"
                          onClick={() => setForm(f => ({ ...f, procedures: f.procedures.filter((_, j) => j !== i) }))}>×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status & Notes */}
                <div className="hd-form-section">
                  <h4 className="hd-form-section-title">Discharge Status & Notes</h4>
                  <div className="hd-form-row">
                    <div className="field-group flex-1">
                      <label>Care / Discharge Status</label>
                      <select className="form-select" value={form.dischargeStatus}
                        onChange={e => setForm(f => ({ ...f, dischargeStatus: e.target.value }))}>
                        {Object.entries(STATUS_META).map(([val, m]) => (
                          <option key={val} value={val}>{m.icon} {m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field-group flex-1">
                      <label>Clinic / Facility Name</label>
                      <input className="form-select" placeholder="e.g. City Animal Hospital"
                        value={form.clinicName}
                        onChange={e => setForm(f => ({ ...f, clinicName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="field-group">
                    <label>Additional Clinical Notes</label>
                    <textarea rows={2} className="form-textarea"
                      placeholder="Any additional observations, prognosis, recommendations..."
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>
                </div>

              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <><Loader size={14} className="spin" /> Saving...</> : <><CheckCircle2 size={14} /> Save Medical Record</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
