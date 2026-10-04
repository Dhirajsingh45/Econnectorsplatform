import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapPin, Phone, Shield, AlertTriangle, CheckCircle2, Share2, ArrowLeft, Heart } from 'lucide-react';
import { lostFoundService } from '../services/api';
import './PublicLostFoundPoster.css';

export default function PublicLostFoundPoster() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    lostFoundService.getReportById(id)
      .then(data => setReport(data))
      .catch(err => {
        console.error('Failed to load public lost pet record:', err);
        setError('Lost/Found record not found or has been resolved.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="public-poster-container">
        <div className="poster-loading glass-panel">
          <div className="poster-spinner" />
          <p>Loading Verified FaunaNet Community Report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="public-poster-container">
        <div className="poster-card glass-panel text-center p-xl">
          <AlertTriangle size={48} className="text-accent mx-auto mb-md" />
          <h2>Notice</h2>
          <p className="text-muted mt-sm">{error || 'This report is unavailable.'}</p>
          <Link to="/app/lost-found" className="btn btn-primary btn-sm mt-lg">
            Return to Community Network
          </Link>
        </div>
      </div>
    );
  }

  const isLost = report.type === 'LOST';

  return (
    <div className="public-poster-container animate-fade-in">
      {/* Top Banner Navigation */}
      <div className="poster-nav-bar">
        <Link to="/app/lost-found" className="btn btn-outline btn-sm">
          <ArrowLeft size={14} /> Back to Lost & Found
        </Link>
        <button className="btn btn-primary btn-sm" onClick={handleShare}>
          <Share2 size={14} /> {copied ? 'Link Copied!' : 'Share Public Alert'}
        </button>
      </div>

      {/* Printable Community Alert Poster Card */}
      <div className={`poster-sheet glass-panel ${isLost ? 'border-lost' : 'border-found'}`} id="printable-poster">
        <div className="poster-header-banner">
          <span className="poster-category-tag">
            {isLost ? '🚨 MISSING PET COMMUNITY ALERT' : '🐾 FOUND ANIMAL ALERT'}
          </span>
          <span className="poster-case-id">CASE ID: {report.reportId || report._id?.slice(-8).toUpperCase()}</span>
        </div>

        <div className="poster-content-grid">
          {/* Pet Photo Section */}
          <div className="poster-photo-section">
            {report.photos?.[0] ? (
              <img src={report.photos[0]} alt={report.petName || report.species} className="poster-img" />
            ) : (
              <div className="poster-photo-placeholder">
                <span className="text-6xl">🐾</span>
                <p className="text-xs text-muted mt-sm">No photo provided</p>
              </div>
            )}
            <div className="poster-status-chip">
              STATUS: {report.status?.replace(/_/g, ' ')}
            </div>
          </div>

          {/* Details Section */}
          <div className="poster-details-section">
            <h1 className="poster-pet-name">
              {report.petName ? report.petName.toUpperCase() : `UNIDENTIFIED ${report.species?.toUpperCase()}`}
            </h1>

            <div className="poster-meta-badges">
              <span className="p-badge">{report.species?.toUpperCase()}</span>
              {report.attributes?.breed && <span className="p-badge">{report.attributes.breed}</span>}
              {report.attributes?.gender && <span className="p-badge">{report.attributes.gender}</span>}
              {report.attributes?.primaryColor && <span className="p-badge">Color: {report.attributes.primaryColor}</span>}
            </div>

            <div className="poster-info-block">
              <label>Last Seen Area (Privacy Approximate):</label>
              <p className="flex items-center text-sm font-semibold">
                <MapPin size={16} className="text-accent mr-xs" />
                {report.lastSeenLocation?.area || report.lastSeenLocation?.city || 'Neighborhood Sector'}
              </p>
            </div>

            <div className="poster-info-block">
              <label>Last Seen Date & Time:</label>
              <p className="text-sm">
                {new Date(report.lastSeenTime || report.createdAt).toLocaleDateString()} at {new Date(report.lastSeenTime || report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="poster-info-block">
              <label>Distinctive Markings & Key Features:</label>
              <p className="text-sm text-secondary">
                {report.identifyingMarks || report.attributes?.distinctiveFeatures || 'None recorded. Please verify collar and behavior.'}
              </p>
            </div>

            {report.circumstances && (
              <div className="poster-info-block">
                <label>Circumstances:</label>
                <p className="text-sm text-secondary">{report.circumstances}</p>
              </div>
            )}

            {/* Safe Contact Box */}
            <div className="poster-contact-box">
              <div className="flex items-center gap-xs mb-xs">
                <Shield size={16} className="text-teal" />
                <span className="text-xs font-bold uppercase tracking-wider text-teal">Safe Community Contact</span>
              </div>
              <p className="text-xs text-muted mb-sm">
                To protect citizen safety, phone numbers are masked. Contact verified reporter via FaunaNet network or authorized emergency response:
              </p>
              <div className="contact-details-row">
                <span className="contact-name font-bold">{report.contactName}</span>
                <span className="contact-number font-mono text-accent">{report.contactPhone}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Safety Disclaimer Footer */}
        <footer className="poster-legal-footer">
          <p>
            🛡️ <strong>FaunaNet Animal Welfare Network:</strong> Never wire money or courier fees for "found pet returns." 
            Always verify ownership at a daytime public venue or veterinary clinic with vaccination records and photos.
          </p>
        </footer>
      </div>
    </div>
  );
}
