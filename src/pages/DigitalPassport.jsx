import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Activity, 
  Syringe, 
  Heart, 
  Share2, 
  Printer, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  FileText,
  Lock
} from 'lucide-react';
import { animalService } from '../services/api';
import './DigitalPassport.css';

export default function DigitalPassport() {
  const { id } = useParams();
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPassport() {
      try {
        setLoading(true);
        setError(null);
        const res = await animalService.getPassport(id);
        if (res && res.passport) {
          setPassport(res.passport);
        } else {
          setError('Digital Passport could not be located on the FaunaNet ledger.');
        }
      } catch (err) {
        console.error('Passport lookup error:', err);
        setError(err.message || 'Unable to load Digital Passport.');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchPassport();
    }
  }, [id]);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getSpeciesEmoji = (species) => {
    const s = (species || '').toLowerCase();
    if (s.includes('dog')) return '🐕';
    if (s.includes('cat')) return '🐈';
    if (s.includes('cow') || s.includes('bull')) return '🐄';
    if (s.includes('bird')) return '🕊️';
    if (s.includes('monkey')) return '🐒';
    if (s.includes('goat')) return '🐐';
    return '🐾';
  };

  if (loading) {
    return (
      <div className="passport-container">
        <div className="passport-hero-badge" style={{ marginTop: '5rem' }}>
          <ShieldCheck size={48} className="animate-pulse" style={{ color: '#FF8C42', margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#fff' }}>Verifying Digital Passport...</h2>
          <p style={{ color: '#A0AEC0' }}>Querying decentralized FaunaNet ledger record for #{id}</p>
        </div>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="passport-container">
        <div className="passport-nav">
          <Link to="/" className="passport-logo">
            <div className="badge-symbol">FN</div>
            <span>FaunaNet</span>
          </Link>
          <Link to="/app" className="btn-passport-action">
            <ArrowLeft size={16} /> Return to Portal
          </Link>
        </div>
        <div className="passport-hero-badge" style={{ marginTop: '3rem' }}>
          <AlertCircle size={48} style={{ color: '#E74C3C', margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#fff' }}>Passport Not Found</h2>
          <p style={{ color: '#A0AEC0', maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
            {error || 'No verified animal record exists for this identifier on the ledger.'}
          </p>
          <Link to="/app" className="btn-passport-action" style={{ background: '#FF8C42', color: '#111' }}>
            Browse Active Rescues
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="passport-container">
      {/* Navigation Header */}
      <header className="passport-nav">
        <Link to="/" className="passport-logo">
          <div className="badge-symbol">FN</div>
          <span>FaunaNet Hyperlocal Network</span>
        </Link>
        <div className="passport-nav-actions">
          <button 
            type="button" 
            onClick={handleShare} 
            className="btn-passport-action"
            title="Share verified link"
          >
            {copied ? <CheckCircle2 size={16} style={{ color: '#2ECC71' }} /> : <Share2 size={16} />}
            {copied ? 'Link Copied!' : 'Share'}
          </button>
          <button 
            type="button" 
            onClick={handlePrint} 
            className="btn-passport-action"
            title="Print or export as PDF tag"
          >
            <Printer size={16} /> Print Tag
          </button>
          <Link to="/app" className="btn-passport-action">
            <ArrowLeft size={16} /> Portal
          </Link>
        </div>
      </header>

      {/* Hero Badge */}
      <div className="passport-hero-badge">
        <div className="passport-system-tag">
          <ShieldCheck size={14} /> Official Verified Animal Passport
        </div>
        <h1 className="passport-title">
          {getSpeciesEmoji(passport.species)} {passport.species?.toUpperCase()} · {passport.animalId}
        </h1>
        <p className="passport-subtitle">
          Hyperlocal Digital Welfare Identity · Authenticated Record
        </p>
      </div>

      {/* Main Grid */}
      <div className="passport-card-grid">
        {/* Left Column: ID Badge & Live QR */}
        <aside className="passport-id-card">
          <div className="passport-image-container">
            {passport.photographs && passport.photographs.length > 0 ? (
              <img 
                src={passport.photographs[0]} 
                alt={passport.animalId} 
                className="passport-photo" 
              />
            ) : (
              <div className="passport-photo-placeholder">
                <span>{getSpeciesEmoji(passport.species)}</span>
              </div>
            )}
            <div className="passport-species-pill">
              {getSpeciesEmoji(passport.species)} {passport.species}
            </div>
            <div className={`passport-status-pill status-${passport.status?.toLowerCase() || 'rescued'}`}>
              {passport.status?.replace('_', ' ')}
            </div>
          </div>

          <div className="passport-id-details">
            <div className="passport-fauna-id-box">
              <div>
                <div className="id-label">Decentralized Animal ID</div>
                <div className="id-value">{passport.animalId}</div>
              </div>
              <ShieldCheck size={24} style={{ color: '#2ECC71' }} />
            </div>

            {/* QR Code */}
            <div className="passport-qr-wrapper">
              <QRCodeSVG 
                value={currentUrl} 
                size={160} 
                level="H" 
                includeMargin={true} 
              />
              <div className="qr-scan-instruction">
                Scan with any mobile camera to verify identity & health history
              </div>
            </div>

            <div className="passport-org-footer">
              Managed by <strong>{passport.organization?.name || 'FaunaNet Hyperlocal Node'}</strong>
              <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
                Last Verified: {new Date(passport.lastUpdated || Date.now()).toLocaleDateString()}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column: Vitals, Vaccinations, Medical, Timeline */}
        <main className="passport-content-panel">
          {/* Vitals Grid */}
          <section className="passport-section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <Heart size={18} style={{ color: '#FF8C42' }} /> Core Identity & Vitals
              </h2>
              <span className="vital-label" style={{ color: '#2ECC71' }}>● Active Record</span>
            </div>
            <div className="vitals-grid">
              <div className="vital-box">
                <div className="vital-label">Species & Breed</div>
                <div className="vital-value">{passport.species} ({passport.breed || 'Indie'})</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Sex / Age</div>
                <div className="vital-value">{passport.sex} · {passport.estimatedAge || 'Unknown'}</div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Sterilization</div>
                <div className="vital-value">
                  {passport.sterilizationStatus === 'yes' ? '✅ Sterilized' : 'Intact / Unknown'}
                </div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Hyperlocal Territory</div>
                <div className="vital-value">
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px', color: '#FF8C42' }} />
                  {passport.location?.city || passport.location?.area || 'Verified Sector'}
                </div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Adoption Status</div>
                <div className="vital-value">
                  {passport.adoptionStatus?.replace('_', ' ') || 'In Care'}
                </div>
              </div>
              <div className="vital-box">
                <div className="vital-label">Microchip / RFID</div>
                <div className="vital-value" style={{ fontFamily: 'monospace' }}>
                  {passport.microchipId || 'RFID Tagged'}
                </div>
              </div>
            </div>
            {passport.identifyingMarkings && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', fontSize: '0.85rem' }}>
                <span style={{ color: '#A0AEC0', fontWeight: 600 }}>Markings & Features: </span>
                <span style={{ color: '#F7FAFC' }}>{passport.identifyingMarkings}</span>
              </div>
            )}
          </section>

          {/* Vaccination Ledger */}
          <section className="passport-section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <Syringe size={18} style={{ color: '#2ECC71' }} /> Vaccination Ledger
              </h2>
              <span className="vital-label">
                {passport.vaccinationRecords?.length || 0} Registered Inoculations
              </span>
            </div>
            {passport.vaccinationRecords && passport.vaccinationRecords.length > 0 ? (
              passport.vaccinationRecords.map((v, i) => (
                <div key={i} className="vaccine-item">
                  <div>
                    <div className="vaccine-name">🛡️ {v.vaccineName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#CBD5E0', marginTop: '2px' }}>
                      Administered by: {v.administeredBy || 'Authorized Vet Officer'}
                    </div>
                  </div>
                  <div className="vaccine-meta">
                    <div>Given: {new Date(v.dateAdministered).toLocaleDateString()}</div>
                    {v.nextDueDate && (
                      <div style={{ color: '#FF8C42' }}>
                        Due: {new Date(v.nextDueDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#A0AEC0', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                Standard anti-rabies and triage inoculation administered upon intake. Detailed records being processed.
              </div>
            )}
          </section>

          {/* Clinical Records */}
          {passport.medicalHistory && passport.medicalHistory.length > 0 && (
            <section className="passport-section-card">
              <div className="section-card-header">
                <h2 className="section-card-title">
                  <Activity size={18} style={{ color: '#3498DB' }} /> Veterinary Interventions
                </h2>
                <span className="vital-label">Clinical Care History</span>
              </div>
              {passport.medicalHistory.map((m, idx) => (
                <div key={idx} className="med-record-box">
                  <div className="med-diagnosis">Diagnosis: {m.diagnosis}</div>
                  <div className="med-treatment">
                    <strong>Treatment / Protocol:</strong> {m.treatment}
                  </div>
                  {m.examination && (
                    <div style={{ fontSize: '0.8rem', color: '#A0AEC0', marginBottom: '0.4rem' }}>
                      Observation: {m.examination}
                    </div>
                  )}
                  <div className="med-footer">
                    <span>Officer: {m.vetName}</span>
                    <span>Status: {m.dischargeStatus?.replace('_', ' ')} · {new Date(m.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Rescue & Welfare Audit Timeline */}
          <section className="passport-section-card">
            <div className="section-card-header">
              <h2 className="section-card-title">
                <FileText size={18} style={{ color: '#FFD166' }} /> Welfare & Rescue Timeline
              </h2>
              <span className="vital-label">Chronological Audit</span>
            </div>
            <div className="passport-timeline">
              {passport.timeline && passport.timeline.length > 0 ? (
                passport.timeline.map((event, idx) => (
                  <div key={idx} className="timeline-entry">
                    <h3 className="timeline-title">{event.event}</h3>
                    <p className="timeline-notes">{event.notes}</p>
                    <span className="timeline-time">
                      <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {new Date(event.date).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="timeline-entry">
                  <h3 className="timeline-title">Verified Intake</h3>
                  <p className="timeline-notes">Animal entered FaunaNet care ecosystem.</p>
                  <span className="timeline-time">{new Date().toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </section>

          {/* Privacy & Safety Disclaimer */}
          <div className="pii-protection-notice">
            <Lock size={18} style={{ flexShrink: 0, color: '#3498DB' }} />
            <div>
              <strong>Privacy Protection Protocol Active:</strong> In accordance with animal rescue privacy protocols, direct personal contact details of reporting citizens and rescue volunteers are secured and not exposed on public passports.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
