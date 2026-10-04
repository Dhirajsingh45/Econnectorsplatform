import React, { useState } from 'react';
import { 
  User, Shield, Phone, MapPin, Award, CheckCircle2, 
  Clock, AlertCircle, Save, Car, Compass, Sparkles, Send
} from 'lucide-react';
import { useAppContext, computeReputation, computeProgress } from '../context/AppContext';
import { authService } from '../services/api';
import './ProfilePage.css';

const ANIMAL_OPTIONS = ['Dogs', 'Cats', 'Cattle', 'Birds', 'Reptiles', 'Wildlife'];

export default function ProfilePage() {
  const { currentUser, refreshCurrentUser, theme, setTheme } = useAppContext();

  const [formData, setFormData] = useState({
    phone: currentUser?.phone || '',
    availability: currentUser?.availability || 'available',
    serviceRadiusKm: currentUser?.serviceRadiusKm || 10,
    vehicleAvailable: !!currentUser?.vehicleAvailable,
    supportedAnimalTypes: currentUser?.supportedAnimalTypes || ['Dogs', 'Cats'],
    experience: currentUser?.experience || '',
  });

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyData, setVerifyData] = useState({
    requestedRole: currentUser?.role === 'citizen' ? 'volunteer' : currentUser?.role || 'volunteer',
    organizationName: '',
    registrationNumber: '',
    experience: '',
  });

  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const reputation = computeReputation(currentUser);
  const progress = computeProgress(currentUser);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      const updatedUser = await authService.updateProfile(formData);
      refreshCurrentUser(updatedUser);
      setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setStatusMsg(null);
    try {
      const result = await authService.requestVerification(verifyData);
      if (result.user) refreshCurrentUser(result.user);
      setStatusMsg({ type: 'success', text: 'Verification request submitted! Administrators will review your credentials.' });
      setVerifyModalOpen(false);
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit verification.' });
    } finally {
      setVerifying(false);
      setTimeout(() => setStatusMsg(null), 5000);
    }
  };

  const toggleAnimal = (animal) => {
    setFormData((prev) => {
      const exists = prev.supportedAnimalTypes.includes(animal);
      return {
        ...prev,
        supportedAnimalTypes: exists
          ? prev.supportedAnimalTypes.filter((a) => a !== animal)
          : [...prev.supportedAnimalTypes, animal],
      };
    });
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-container">
        
        {/* Status Alerts */}
        {statusMsg && (
          <div className={`alert-banner ${statusMsg.type === 'success' ? 'success' : 'error'}`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* User Hero Header */}
        <div className="profile-hero glass-panel">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar-circle">
              <User size={48} />
            </div>
            <span className={`status-indicator ${formData.availability}`} />
          </div>

          <div className="profile-hero-info">
            <div className="profile-name-row">
              <h2>{currentUser?.name || 'Ecoconnect Responder'}</h2>
              <span className={`role-badge role-${currentUser?.role || 'citizen'}`}>
                {currentUser?.role || 'citizen'}
              </span>
              <span className={`verification-badge ${currentUser?.verificationStatus || 'unverified'}`}>
                <Shield size={13} /> {currentUser?.verificationStatus || 'unverified'}
              </span>
            </div>
            <p className="profile-email">{currentUser?.email}</p>
            {currentUser?.organization && (
              <p className="profile-org">Org: {currentUser.organization}</p>
            )}
          </div>

          <div className="profile-hero-actions">
            {currentUser?.verificationStatus !== 'verified' && (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setVerifyModalOpen(true)}
              >
                <Shield size={16} /> Request Official Verification
              </button>
            )}
          </div>
        </div>

        {/* Reputation & Progression Card */}
        <div className="reputation-card glass-panel">
          <div className="reputation-header">
            <div className="reputation-title">
              <span className="reputation-icon">{reputation.icon}</span>
              <div>
                <h4>Level {reputation.level}: {reputation.title}</h4>
                <p>{reputation.description}</p>
              </div>
            </div>
            <div className="reputation-badge-count">
              <Award className="text-gold" size={20} />
              <span>{currentUser?.badgeCount || 0} Badges Earned</span>
            </div>
          </div>

          <div className="progress-container">
            <div className="progress-label-row">
              <span>Tier Progression</span>
              <span>{Math.round(progress)}% to {reputation.nextTitle || 'Apex Level'}</span>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            {reputation.requirement && (
              <span className="next-requirement">Next milestone: {reputation.requirement}</span>
            )}
          </div>

          <div className="profile-stats-grid">
            <div className="stat-box">
              <span className="stat-num">{currentUser?.completedTaskCount || 0}</span>
              <span className="stat-label">Tasks Completed</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentUser?.verifiedReportCount || 0}</span>
              <span className="stat-label">Verified Reports</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentUser?.points || 0}</span>
              <span className="stat-label">Community Points</span>
            </div>
            <div className="stat-box">
              <span className="stat-num">{currentUser?.trainingCertified ? 'Certified' : 'In Progress'}</span>
              <span className="stat-label">Field Certification</span>
            </div>
          </div>
        </div>

        {/* Operational & Account Settings */}
        <form onSubmit={handleSaveProfile} className="settings-form glass-panel">
          <h3 className="section-title">
            <Compass size={20} /> Operational & Responder Settings
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-with-icon">
                <Phone size={16} />
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Current Availability</label>
              <select 
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
              >
                <option value="available">🟢 Available for Dispatch</option>
                <option value="busy">🟡 On Active Task / Busy</option>
                <option value="offline">⚪ Offline</option>
              </select>
            </div>

            <div className="form-group">
              <label>Service Radius: {formData.serviceRadiusKm} km</label>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={formData.serviceRadiusKm}
                onChange={(e) => setFormData({ ...formData, serviceRadiusKm: e.target.value })}
                className="range-slider"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox"
                  checked={formData.vehicleAvailable}
                  onChange={(e) => setFormData({ ...formData, vehicleAvailable: e.target.checked })}
                />
                <Car size={18} /> Vehicle Available for Animal Transport
              </label>
            </div>
          </div>

          <div className="form-group mt-md">
            <label>Supported Animal Types for Rescue / Foster</label>
            <div className="pill-selector">
              {ANIMAL_OPTIONS.map((animal) => {
                const selected = formData.supportedAnimalTypes.includes(animal);
                return (
                  <button
                    key={animal}
                    type="button"
                    className={`pill-btn ${selected ? 'selected' : ''}`}
                    onClick={() => toggleAnimal(animal)}
                  >
                    {animal}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group mt-md">
            <label>Rescue Experience & Specialization Notes</label>
            <textarea 
              rows={3}
              value={formData.experience}
              onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
              placeholder="e.g., First aid certified, experience handling aggressive dogs, bird rehabilitation..."
            />
          </div>

          <div className="form-actions mt-lg">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={saving}
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        {/* Verification Request Modal */}
        {verifyModalOpen && (
          <div className="modal-overlay" onClick={() => setVerifyModalOpen(false)}>
            <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3><Shield className="text-primary" size={22} /> Request Official Role Verification</h3>
                <button className="close-btn" onClick={() => setVerifyModalOpen(false)}>×</button>
              </div>
              <form onSubmit={handleVerifySubmit} className="modal-body">
                <p className="modal-desc">
                  Verified responders, NGOs, and veterinary personnel receive dispatch alerts, verified tags, and administrative clearance.
                </p>

                <div className="form-group">
                  <label>Target Role</label>
                  <select 
                    value={verifyData.requestedRole}
                    onChange={(e) => setVerifyData({ ...verifyData, requestedRole: e.target.value })}
                  >
                    <option value="volunteer">Volunteer Responder</option>
                    <option value="ngo">Registered Animal NGO</option>
                    <option value="vet">Licensed Veterinarian / Clinic</option>
                    <option value="shelter">Registered Shelter / Foster Home</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Organization / Clinic Name (if applicable)</label>
                  <input 
                    type="text" 
                    value={verifyData.organizationName}
                    onChange={(e) => setVerifyData({ ...verifyData, organizationName: e.target.value })}
                    placeholder="e.g. Stray Care Foundation"
                  />
                </div>

                <div className="form-group">
                  <label>Government / License Registration Number</label>
                  <input 
                    type="text" 
                    value={verifyData.registrationNumber}
                    onChange={(e) => setVerifyData({ ...verifyData, registrationNumber: e.target.value })}
                    placeholder="e.g. VET-2024-XXXX or NGO-REG-XXXX"
                  />
                </div>

                <div className="form-group">
                  <label>Summary of Experience & Qualifications</label>
                  <textarea 
                    rows={3}
                    value={verifyData.experience}
                    onChange={(e) => setVerifyData({ ...verifyData, experience: e.target.value })}
                    placeholder="Detail your experience in animal handling, medical treatment, or rescue logistics..."
                    required
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={() => setVerifyModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={verifying}>
                    <Send size={16} /> {verifying ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
