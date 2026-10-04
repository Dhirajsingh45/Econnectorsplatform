import { useState, useEffect, useRef } from 'react';
import { RefreshCw, AlertCircle, Activity, Target, MapPin, Users, Plus, Layers } from 'lucide-react';
import { publicService, abcService } from '../services/api';
import { useAppContext } from '../context/AppContext';
import './MunicipalDashboard.css';

export default function MunicipalDashboard() {
  const { currentUser } = useAppContext();

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);

  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [targetArea, setTargetArea] = useState('');
  const [targetCount, setTargetCount] = useState(50);
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await publicService.getMunicipal();
      setStats(data);
    } catch (err) {
      setStatsError('Unable to load municipal statistics from the database.');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const data = await abcService.getCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      setCampaignsError('Unable to load ABC campaigns.');
    } finally {
      setCampaignsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!campaignName.trim() || !targetArea.trim()) {
      alert('Campaign name and target area are required.');
      return;
    }
    setSubmitting(true);
    try {
      await abcService.createCampaign({ campaignName, targetArea, targetCount });
      setShowNewCampaign(false);
      setCampaignName('');
      setTargetArea('');
      setTargetCount(50);
      fetchCampaigns();
    } catch (err) {
      alert(err.message || 'Failed to create campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const canManageCampaigns = ['ngo', 'vet', 'shelter', 'admin'].includes(currentUser?.role);

  return (
    <div className="municipal-dashboard animate-fade-in">
      <header className="mb-lg flex justify-between items-center">
        <div>
          <h1 className="pixel-font text-accent">Municipal Animal Welfare Dashboard</h1>
          <p className="text-muted text-xs">
            Real-time overview for authorized government and municipal personnel.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => { fetchStats(); fetchCampaigns(); }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {/* Key Metrics */}
      <section className="mb-xl">
        <h2 className="section-title mb-md">📊 Population & Welfare Metrics</h2>

        {statsLoading ? (
          <div className="stat-grid">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="stat-card glass-panel loading-skeleton" />
            ))}
          </div>
        ) : statsError ? (
          <div className="error-alert">{statsError}</div>
        ) : !stats ? (
          <div className="empty-board p-xl text-center">
            <AlertCircle size={40} className="text-muted mx-auto mb-md" />
            <p className="text-muted">No welfare data available yet. Begin registering animals and rescue operations.</p>
          </div>
        ) : (
          <div className="stat-grid">
            <div className="stat-card glass-panel">
              <div className="stat-icon"><Activity size={28} /></div>
              <div className="stat-value">{stats.totalAnimalsTracked ?? 0}</div>
              <div className="stat-label">Total Animals Tracked</div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon"><Target size={28} /></div>
              <div className="stat-value">{stats.sterilizedCount ?? 0}</div>
              <div className="stat-label">
                Sterilized
                <div className="stat-sub">
                  {stats.sterilizationCoveragePercent ?? 0}% Coverage
                </div>
              </div>
              <div className="coverage-bar">
                <div className="coverage-fill" style={{ width: `${stats.sterilizationCoveragePercent ?? 0}%` }} />
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon"><Users size={28} /></div>
              <div className="stat-value">{stats.vaccinatedCount ?? 0}</div>
              <div className="stat-label">
                Vaccinated
                <div className="stat-sub">
                  {stats.vaccinationCoveragePercent ?? 0}% Coverage
                </div>
              </div>
              <div className="coverage-bar">
                <div className="coverage-fill vaccine-fill" style={{ width: `${stats.vaccinationCoveragePercent ?? 0}%` }} />
              </div>
            </div>
            <div className="stat-card glass-panel">
              <div className="stat-icon"><Layers size={28} /></div>
              <div className="stat-value">{stats.totalShelterCapacity ?? 0}</div>
              <div className="stat-label">
                Total Shelter Capacity
                <div className="stat-sub">{stats.activeABCCampaignsCount ?? 0} Active ABC Campaigns</div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ABC Campaigns */}
      <section className="mb-xl">
        <div className="section-header flex justify-between items-center mb-md">
          <h2 className="section-title">🔬 ABC / CNVR Sterilization Campaigns</h2>
          {canManageCampaigns && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewCampaign(true)}>
              <Plus size={16} /> NEW CAMPAIGN
            </button>
          )}
        </div>

        {campaignsLoading ? (
          <div className="loading-skeleton p-xl text-center text-muted">Loading ABC campaigns...</div>
        ) : campaignsError ? (
          <div className="error-alert">{campaignsError}</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-board p-xl text-center">
            <AlertCircle size={40} className="text-muted mx-auto mb-md" />
            <h3>No ABC Campaigns Recorded</h3>
            <p className="text-muted text-sm mt-xs">
              {canManageCampaigns
                ? 'Create a new ABC/CNVR campaign to begin tracking sterilization operations.'
                : 'Contact your local NGO or veterinary clinic to initiate a sterilization campaign.'}
            </p>
          </div>
        ) : (
          <div className="campaigns-list">
            {campaigns.map(c => {
              const total = c.animalsProcessed?.length || 0;
              const released = c.animalsProcessed?.filter(a => a.status === 'released').length || 0;
              const sterilized = c.animalsProcessed?.filter(a => a.status === 'sterilized').length || 0;
              const progress = c.targetCount > 0 ? Math.min(Math.round((released / c.targetCount) * 100), 100) : 0;

              return (
                <div key={c._id} className="campaign-card glass-panel p-lg mb-sm">
                  <div className="campaign-header flex justify-between items-start">
                    <div>
                      <h3>{c.campaignName}</h3>
                      <p className="text-xs text-muted mt-xs">
                        <MapPin size={12} className="inline" /> {c.targetArea} · Batch #{c.batchNumber}
                      </p>
                    </div>
                    <span className={`status-badge ${c.status === 'ACTIVE' ? 'badge-critical' : 'badge-low'}`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="campaign-stats mt-md flex gap-lg">
                    <span className="text-sm"><strong>{total}</strong> Captured</span>
                    <span className="text-sm"><strong>{sterilized}</strong> Sterilized</span>
                    <span className="text-sm"><strong>{released}</strong> Released</span>
                    <span className="text-sm text-muted">Target: {c.targetCount}</span>
                  </div>

                  <div className="coverage-bar mt-sm">
                    <div className="coverage-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted mt-xs">{progress}% of target completed</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <div className="form-overlay" onClick={() => setShowNewCampaign(false)}>
          <div className="form-container" onClick={(e) => e.stopPropagation()}>
            <form className="report-form" onSubmit={handleCreateCampaign}>
              <div className="form-header">
                <h2>Create New ABC / CNVR Campaign</h2>
                <button type="button" className="close-btn" onClick={() => setShowNewCampaign(false)}>×</button>
              </div>
              <div className="form-body">
                <div className="field-group">
                  <label>Campaign Name *</label>
                  <input
                    className="form-select"
                    placeholder="e.g. Lajpat Nagar Stray Dog Campaign Aug 2026"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Target Area *</label>
                  <input
                    className="form-select"
                    placeholder="e.g. Sector 9, Rohini, New Delhi"
                    value={targetArea}
                    onChange={(e) => setTargetArea(e.target.value)}
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Target Animal Count</label>
                  <input
                    className="form-select"
                    type="number"
                    min="1"
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="form-footer">
                <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
