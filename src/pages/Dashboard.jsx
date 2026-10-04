import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppContext, computeReputation, computeProgress } from '../context/AppContext';
import { Activity, Shield, AlertTriangle, Target, Plus, Users, Trophy, Heart, ArrowRight, Award, Search, Home } from 'lucide-react';
import JudgeDemoModal from '../components/JudgeDemoModal';
import './Dashboard.css';

// Premium animated number counter for dashboard stats
function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value, 10);
    if (isNaN(end) || end === 0) {
      setCount(value || 0);
      return;
    }
    if (start === end) {
      setCount(end);
      return;
    }

    const totalDuration = 800; // ms
    const incrementTime = Math.max(Math.floor(totalDuration / end), 15);
    
    const timer = setInterval(() => {
      start += 1;
      setCount(start);
      if (start === end) {
        clearInterval(timer);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}</span>;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { currentUser, tasks, reports } = useAppContext();
  const navigate = useNavigate();

  const pendingTasks = tasks.filter(t => t.status === 'Reported').length;
  const activeOps = tasks.filter(t => t.status === 'In Progress' || t.status === 'Accepted' || t.status === 'Assigned').length;
  const verifiedTasks = tasks.filter(t => t.status === 'Verified').length;

  const quickStats = [
    { label: t('dashboard.stats.pending'), value: pendingTasks, icon: AlertTriangle, color: 'var(--danger)', bg: 'rgba(231, 76, 60, 0.08)' },
    { label: t('dashboard.stats.active'), value: activeOps, icon: Activity, color: 'var(--teal)', bg: 'rgba(58, 125, 111, 0.08)' },
    { label: t('dashboard.stats.verified'), value: verifiedTasks, icon: Shield, color: 'var(--green)', bg: 'rgba(96, 108, 56, 0.08)' },
  ];

  const reputation = computeReputation(currentUser);
  const progress = computeProgress(currentUser);

  const getActionsNeeded = () => {
    if (!currentUser) return '';
    const { verifiedReportCount = 0, completedTaskCount = 0 } = currentUser;
    
    // Level 1 -> 2: 5 verified reports OR 2 completed tasks
    if (completedTaskCount < 2 && verifiedReportCount < 5) {
      const reportsLeft = 5 - verifiedReportCount;
      const tasksLeft = 2 - completedTaskCount;
      return `${reportsLeft} report${reportsLeft > 1 ? 's' : ''} or ${tasksLeft} task${tasksLeft > 1 ? 's' : ''} left`;
    }
    // Level 2 -> 3: 5 completed tasks
    if (completedTaskCount < 5) {
      const left = 5 - completedTaskCount;
      return `${left} task${left > 1 ? 's' : ''} left`;
    }
    // Level 3 -> 4: 15 completed tasks
    if (completedTaskCount < 15) {
      const left = 15 - completedTaskCount;
      return `${left} task${left > 1 ? 's' : ''} left`;
    }
    // Level 4 -> 5: 30 completed tasks
    if (completedTaskCount < 30) {
      const left = 30 - completedTaskCount;
      return `${left} task${left > 1 ? 's' : ''} left`;
    }
    return t('common.max_level', 'Max level');
  };

  return (
    <div className="dashboard animate-fade-in">
      <header className="dashboard-header mb-xl">
        <div className="user-welcome">
          <h1>{t('dashboard.title', 'Welcome back')}, {currentUser?.name || 'there'}</h1>
          <p className="text-muted">{t('dashboard.subtitle', 'Here is the current state of operations')}</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/app/tasks', { state: { openForm: true } })}
          >
            <Plus size={20} />
            <span>{t('dashboard.report', 'Report Emergency')}</span>
          </button>
        </div>
      </header>

      {/* Interactive Judge Demo Walkthrough for real-time lifecycle verification */}
      <JudgeDemoModal />

      {/* Role-Specific Operational Command Banner */}
      <div className="role-command-banner glass-panel mt-lg mb-lg">
        <div className="role-command-info">
          <span className="role-tag-pill">{currentUser?.role?.toUpperCase() || 'CITIZEN'} COMMAND</span>
          {currentUser?.role === 'volunteer' ? (
            <>
              <h3>Field Responder Operations</h3>
              <p>You have {pendingTasks} unassigned emergency alerts in the network queue. Field verification and immediate stabilization save lives.</p>
            </>
          ) : currentUser?.role === 'vet' ? (
            <>
              <h3>Veterinary Clinical Intake</h3>
              <p>Review clinical records, record vaccination inoculations, and update medical clearance for rescued animals.</p>
            </>
          ) : currentUser?.role === 'ngo' || currentUser?.role === 'shelter' ? (
            <>
              <h3>Shelter & Intake Management</h3>
              <p>Track shelter asset inventory, review citizen adoption applications, and coordinate municipal welfare compliance.</p>
            </>
          ) : currentUser?.role === 'admin' ? (
            <>
              <h3>Central Administration & Compliance</h3>
              <p>Manage verified credentials, inspect immutable system audit logs, and oversee network-wide animal welfare operations.</p>
            </>
          ) : (
            <>
              <h3>Hyperlocal Citizen Welfare Desk</h3>
              <p>Report animals in distress, search for lost family pets, or offer loving temporary care as a foster volunteer.</p>
            </>
          )}
        </div>
        <div className="role-command-actions">
          {currentUser?.role === 'volunteer' ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/tasks')}>
              Dispatch Queue ({pendingTasks})
            </button>
          ) : currentUser?.role === 'vet' ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/health')}>
              Medical Intake
            </button>
          ) : currentUser?.role === 'ngo' || currentUser?.role === 'shelter' ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/adoption')}>
              Adoption Applications
            </button>
          ) : currentUser?.role === 'admin' ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/admin')}>
              Admin Console
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/lost-found')}>
              Lost & Found Pet AI Match
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/app/impact')}>
            Live Impact Stats
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {quickStats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--stat-color': stat.color, '--stat-bg': stat.bg }}>
            <div className="stat-icon-wrapper">
              <stat.icon size={28} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                <AnimatedCounter value={stat.value} />
              </span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}

        {/* Reputation Card replacing Rank slot */}
        <div className="stat-card reputation-card">
          <div className="reputation-header">
            <div className="reputation-badge">
              <span className="reputation-icon">{reputation.icon}</span>
              <span className="reputation-title">{reputation.title}</span>
            </div>
            <span className="reputation-trust">Trust: {currentUser?.trustScore || 0}</span>
          </div>
          <div className="reputation-progress-wrapper">
            <div className="reputation-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="reputation-footer">
            <span className="reputation-next">Next: {reputation.nextTitle || 'Max'}</span>
            <span className="reputation-needed">{getActionsNeeded()}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-grid mt-xl">
        {/* Recent Activity Feed (Real reports) */}
        <section className="dashboard-section recent-intel">
          <div className="section-header">
            <h2>{t('dashboard.latest_intel', 'Latest Intel')}</h2>
            <button className="view-all-btn" onClick={() => navigate('/app/tasks')}>
              {t('common.view_all', 'View All')} <ArrowRight size={16} />
            </button>
          </div>
          
          <div className="intel-list">
            {reports.length === 0 ? (
              <div className="empty-state-warm animate-fade-in">
                <div className="empty-paw-icon-wrapper">
                  <Heart size={36} fill="var(--primary)" stroke="none" />
                </div>
                <h3>No active emergencies</h3>
                <p>Everything is quiet in your area right now. Be vigilant, and help keep our local wildlife safe! 🌿</p>
              </div>
            ) : (
              reports.slice(0, 4).map(report => (
                <div 
                  key={report._id || report.id} 
                  className="intel-item clickable" 
                  onClick={() => navigate('/app/tasks')}
                >
                  <div className="intel-avatar">
                    {report.animalType?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="intel-info">
                    <div className="intel-title-row">
                      <span className="intel-type">{report.animalType || 'Animal'}</span>
                      <span className="intel-time">
                        {report.createdAt ? new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>
                    <p className="intel-desc">
                      {report.description.slice(0, 65) + (report.description.length > 65 ? '...' : '')}
                    </p>
                  </div>
                  <div className={`intel-status ${report.urgency?.toLowerCase()}`}>
                    {report.urgency}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {verifiedTasks > 0 && (
            <div className="impact-banner">
              <Trophy size={20} />
              <span>{t('common.impact_message', 'You and your community have verified local wildlife rescues. Keep it up!')}</span>
            </div>
          )}
        </section>

        {/* Coexistence Hub */}
        <section className="dashboard-section hub-section">
          <h2>Community Welfare Ecosystem</h2>
          <div className="hub-grid">
            <button className="hub-card" onClick={() => navigate('/app/map')}>
              <div className="hub-icon"><Target size={24} /></div>
              <div className="hub-text">
                <strong>Hyperlocal Map</strong>
                <span>Live GPS rescue coordinates</span>
              </div>
            </button>
            <button className="hub-card" onClick={() => navigate('/app/adoption')}>
              <div className="hub-icon"><Heart size={24} /></div>
              <div className="hub-text">
                <strong>Adoption Center</strong>
                <span>Rehabilitated companions</span>
              </div>
            </button>
            <button className="hub-card" onClick={() => navigate('/app/lost-found')}>
              <div className="hub-icon"><Search size={24} /></div>
              <div className="hub-text">
                <strong>Lost & Found AI</strong>
                <span>Photo recognition matching</span>
              </div>
            </button>
            <button className="hub-card" onClick={() => navigate('/app/foster')}>
              <div className="hub-icon"><Home size={24} /></div>
              <div className="hub-text">
                <strong>Foster Network</strong>
                <span>Temporary shelter placement</span>
              </div>
            </button>
            <button className="hub-card" onClick={() => navigate('/app/training')}>
              <div className="hub-icon"><Award size={24} /></div>
              <div className="hub-text">
                <strong>Responder Academy</strong>
                <span>Field stabilization certification</span>
              </div>
            </button>
            <button className="hub-card" onClick={() => navigate('/app/health')}>
              <div className="hub-icon"><Activity size={24} /></div>
              <div className="hub-text">
                <strong>Clinical Logs</strong>
                <span>Medical intake & digital passports</span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
