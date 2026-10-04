import React, { useState, useEffect } from 'react';
import { 
  Heart, Award, ShieldCheck, Activity, Users, 
  Home, RefreshCw, Sparkles, TrendingUp, Compass, ArrowRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, computeReputation } from '../context/AppContext';
import { publicService } from '../services/api';
import './ImpactPage.css';

export default function ImpactPage() {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const reputation = computeReputation(currentUser);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await publicService.getStats();
      setStats(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load public stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const resolutionRate = stats?.totalReports > 0 
    ? Math.min(100, Math.round((stats.totalRescuesCompleted / stats.totalReports) * 100)) 
    : 0;

  return (
    <div className="impact-page animate-fade-in">
      <div className="impact-header">
        <div>
          <h1 className="impact-title">
            <Heart className="text-primary inline-icon" size={30} /> Community Impact & Transparency
          </h1>
          <p className="impact-subtitle">
            Verifiable, real-time metrics powered by hyperlocal citizen reports, verified responders, and partner shelters.
          </p>
        </div>
        <button 
          className="btn btn-outline btn-sm" 
          onClick={loadStats} 
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> 
          {loading ? 'Refreshing...' : 'Refresh Live Data'}
        </button>
      </div>

      {/* Personal Impact Section */}
      <div className="personal-impact-card glass-panel">
        <div className="personal-impact-header">
          <div className="avatar-chip">
            <Award className="text-gold" size={24} />
          </div>
          <div>
            <h3>Your Contribution Portfolio</h3>
            <p className="personal-role">
              {currentUser?.name} • <span className="text-primary">{reputation.title}</span> (Level {reputation.level})
            </p>
          </div>
        </div>

        <div className="personal-metrics-row">
          <div className="personal-metric">
            <span className="metric-val">{currentUser?.completedTaskCount || 0}</span>
            <span className="metric-lbl">Rescues Completed</span>
          </div>
          <div className="personal-metric">
            <span className="metric-val">{currentUser?.verifiedReportCount || 0}</span>
            <span className="metric-lbl">Reports Verified</span>
          </div>
          <div className="personal-metric">
            <span className="metric-val">{currentUser?.points || 0}</span>
            <span className="metric-lbl">Karma Credits</span>
          </div>
          <div className="personal-metric">
            <span className="metric-val">{currentUser?.badgeCount || 0}</span>
            <span className="metric-lbl">Honor Badges</span>
          </div>
        </div>
      </div>

      {/* Network Live Impact Grid */}
      <div className="section-label-row">
        <h3>Network-Wide Live Metrics</h3>
        {lastRefreshed && (
          <span className="timestamp-note">
            Last synced: {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="network-grid">
        <div className="network-card glass-panel highlight-orange">
          <div className="card-top">
            <span className="card-lbl">Incident Reports Logged</span>
            <Activity className="card-icon text-primary" size={22} />
          </div>
          <div className="card-num">{stats?.totalReports ?? '0'}</div>
          <p className="card-desc">Hyperlocal citizen alerts processed by AI triage</p>
        </div>

        <div className="network-card glass-panel highlight-teal">
          <div className="card-top">
            <span className="card-lbl">Rescues Completed</span>
            <ShieldCheck className="card-icon text-teal" size={22} />
          </div>
          <div className="card-num">{stats?.totalRescuesCompleted ?? '0'}</div>
          <p className="card-desc">Animals successfully stabilized & assisted by responders</p>
        </div>

        <div className="network-card glass-panel highlight-gold">
          <div className="card-top">
            <span className="card-lbl">Forever Homes Found</span>
            <Home className="card-icon text-gold" size={22} />
          </div>
          <div className="card-num">{stats?.totalAdopted ?? '0'}</div>
          <p className="card-desc">Rehabilitated animals adopted through verified shelters</p>
        </div>

        <div className="network-card glass-panel highlight-blue">
          <div className="card-top">
            <span className="card-lbl">Sterilizations Verified</span>
            <Sparkles className="card-icon text-blue" size={22} />
          </div>
          <div className="card-num">{stats?.totalSterilized ?? '0'}</div>
          <p className="card-desc">Animal Birth Control (ABC) campaigns logged</p>
        </div>

        <div className="network-card glass-panel highlight-purple">
          <div className="card-top">
            <span className="card-lbl">Active Partner Shelters</span>
            <Users className="card-icon text-purple" size={22} />
          </div>
          <div className="card-num">{stats?.totalShelters ?? '0'}</div>
          <p className="card-desc">Registered medical & shelter facilities in the network</p>
        </div>

        <div className="network-card glass-panel highlight-green">
          <div className="card-top">
            <span className="card-lbl">Overall Resolution Rate</span>
            <TrendingUp className="card-icon text-green" size={22} />
          </div>
          <div className="card-num">{resolutionRate}%</div>
          <p className="card-desc">Closed rescue operations vs total reported distress cases</p>
        </div>
      </div>

      {/* Transparency & Integrity Callout */}
      <div className="transparency-banner glass-panel">
        <div className="banner-icon-col">
          <Compass size={36} className="text-teal" />
        </div>
        <div className="banner-content">
          <h4>Zero Synthetic Inflation Guarantee</h4>
          <p>
            Ecoconnect connects directly to MongoDB collections and immutable audit logs. No vanity metrics or mock numbers are generated. Every statistic reflects verifiable community actions on the ground.
          </p>
          <div className="banner-actions">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/tasks')}>
              View Active Rescue Board <ArrowRight size={15} />
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/adoption')}>
              Browse Animals for Adoption
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
