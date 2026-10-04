import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  Award, 
  Calendar, 
  Share2, 
  Printer, 
  AlertCircle, 
  ArrowLeft, 
  CheckCircle2, 
  FileCheck,
  ExternalLink
} from 'lucide-react';
import { trainingService } from '../services/api';
import './PublicCertificateVerify.css';

export default function PublicCertificateVerify() {
  const { certId } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchCertificate() {
      try {
        setLoading(true);
        setError(null);
        const res = await trainingService.verifyCertificate(certId);
        if (res && res.verified) {
          setCert(res);
        } else {
          setError(res?.message || 'Certificate could not be verified on the FaunaNet ledger.');
        }
      } catch (err) {
        console.error('Certificate verification error:', err);
        setError(err.message || 'Unable to verify training certificate.');
      } finally {
        setLoading(false);
      }
    }

    if (certId) {
      fetchCertificate();
    }
  }, [certId]);

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

  if (loading) {
    return (
      <div className="cert-verify-container">
        <div className="cert-verify-loading">
          <ShieldCheck size={48} className="animate-pulse" style={{ color: '#FF8C42', margin: '0 auto 1rem' }} />
          <h2>Verifying Certificate Credential...</h2>
          <p>Querying decentralized FaunaNet Academy ledger for #{certId}</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="cert-verify-container">
        <header className="cert-verify-nav">
          <Link to="/" className="cert-verify-logo">
            <div className="badge-symbol">FN</div>
            <span>FaunaNet Academy</span>
          </Link>
          <Link to="/app" className="btn-cert-action">
            <ArrowLeft size={16} /> Return to Portal
          </Link>
        </header>
        <div className="cert-verify-error-box">
          <AlertCircle size={48} style={{ color: '#E74C3C', margin: '0 auto 1rem' }} />
          <h2>Certificate Not Found</h2>
          <p>{error || 'No verified training certificate matches this record on the ledger.'}</p>
          <Link to="/app/training" className="btn-cert-action btn-cert-primary" style={{ display: 'inline-flex', marginTop: '1.5rem' }}>
            Browse Training Modules
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cert-verify-container">
      {/* Navigation Header */}
      <header className="cert-verify-nav">
        <Link to="/" className="cert-verify-logo">
          <div className="badge-symbol">FN</div>
          <span>FaunaNet Academy Ledger</span>
        </Link>
        <div className="cert-verify-nav-actions">
          <button 
            type="button" 
            onClick={handleShare} 
            className="btn-cert-action"
            title="Share verified link"
          >
            {copied ? <CheckCircle2 size={16} style={{ color: '#2ECC71' }} /> : <Share2 size={16} />}
            {copied ? 'Link Copied!' : 'Share Credential'}
          </button>
          <button 
            type="button" 
            onClick={handlePrint} 
            className="btn-cert-action"
            title="Print or export as PDF"
          >
            <Printer size={16} /> Print Certificate
          </button>
          <Link to="/app/training" className="btn-cert-action">
            <ArrowLeft size={16} /> Academy
          </Link>
        </div>
      </header>

      {/* Hero Badge */}
      <div className="cert-verify-hero">
        <div className="cert-status-tag">
          <CheckCircle2 size={15} style={{ color: '#2ECC71' }} /> Officially Verified FaunaNet Credential
        </div>
        <h1>Community Responder Certification</h1>
        <p>Decentralized record of safety instruction and knowledge evaluation</p>
      </div>

      {/* Main Certificate Sheet */}
      <main className="cert-sheet-container">
        <div className="cert-sheet-border">
          <div className="cert-sheet-inner">
            {/* Header Seal */}
            <div className="cert-seal-block">
              <div className="cert-seal-icon">
                <ShieldCheck size={36} style={{ color: '#FF8C42' }} />
              </div>
              <div className="cert-seal-text">
                FAUNANET ACADEMY · HYPERLOCAL WELFARE NETWORK
              </div>
            </div>

            <div className="cert-credential-heading">Record of Completion</div>
            <p className="cert-attribution">This credential officially records that</p>

            <h2 className="cert-recipient-name">{cert.recipientName || 'Community Responder'}</h2>

            <p className="cert-completion-text">
              has successfully completed all required safety curricula, humane capture and handling protocols, and demonstrated comprehensive mastery in the knowledge assessment for
            </p>

            <h3 className="cert-title-course">{cert.moduleTitle}</h3>

            {/* Badge Pill */}
            {cert.badgeAwarded && (
              <div className="cert-badge-pill">
                <Award size={18} style={{ color: '#FF8C42' }} />
                <span>{cert.badgeAwarded}</span>
              </div>
            )}

            {/* Details Grid */}
            <div className="cert-details-grid">
              <div className="cert-meta-item">
                <label>ASSESSMENT SCORE</label>
                <div className="cert-meta-val" style={{ color: '#2ECC71' }}>{cert.score}% (Pass)</div>
              </div>
              <div className="cert-meta-item">
                <label>CERTIFICATE ID</label>
                <div className="cert-meta-val mono">{cert.certificateId}</div>
              </div>
              <div className="cert-meta-item">
                <label>DATE ISSUED</label>
                <div className="cert-meta-val">
                  <Calendar size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }} />
                  {new Date(cert.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Verification QR Box */}
            <div className="cert-verification-qr-box">
              <QRCodeSVG 
                value={currentUrl} 
                size={120} 
                level="H" 
                includeMargin={true} 
              />
              <div className="qr-explanation">
                <div className="qr-title">
                  <FileCheck size={16} style={{ color: '#2ECC71', display: 'inline', marginRight: '6px' }} />
                  Cryptographically Trackable Record
                </div>
                <div className="qr-sub">
                  Scan this QR code with any mobile camera to verify recipient authenticity and issue timestamp directly against the FaunaNet database.
                </div>
              </div>
            </div>

            {/* Ethical & Legal Disclaimer */}
            <footer className="cert-legal-disclaimer">
              <strong>Mandatory Compliance Notice: </strong>
              {cert.disclaimer || 'This records completion of a FaunaNet community learning module. It is not a professional veterinary, government, emergency-response or regulated qualification.'}
            </footer>
          </div>
        </div>
      </main>

      <div className="cert-verify-footer">
        <Link to="/app/tasks" className="btn-cert-action btn-cert-primary">
          <ExternalLink size={15} /> Apply Skills on Hyperlocal Rescue Tasks
        </Link>
      </div>
    </div>
  );
}
