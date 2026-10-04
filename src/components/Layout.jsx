import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Home, Map, CheckSquare, MessageSquare, Phone, Activity, X, Menu,
  Award, Package, Settings, LogOut, Shield, Network, Radio, 
  ShieldAlert, Search, Heart, Building2, Bell, TrendingUp, HelpCircle 
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { LANGUAGES, THEMES } from '../config/languages';
import Chat from './Community/Chat';
import ActiveDispatchPanel from './ActiveDispatchPanel';
import SOSReportModal from './SOSReportModal';
import './Layout.css';

export default function Layout() {
  const { t } = useTranslation();
  const { 
    tasks, logout, currentUser, emergencyMode, toggleEmergencyMode, 
    theme, setTheme, language, setLanguage, networkState, 
    messengerSettings, updateMessengerSettings, unreadNotifCount 
  } = useAppContext();
  const [showChat, setShowChat] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Close mobile nav on Escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    if (mobileNavOpen) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const unassignedCount = tasks.filter(task => task.status === 'Reported').length;

  const navContent = (
    <>
      <div className="brand" aria-label="FaunaNet home">
        <div className="brand-logo">
          <Shield size={24} fill="var(--primary)" stroke="var(--primary)" />
        </div>
        <span className="brand-text">FaunaNet</span>
      </div>

      <nav className="nav-links" aria-label="Main navigation">
        <NavLink to="/app" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end aria-label="Dashboard">
          <Home size={22} aria-hidden="true" />
          <span>{t('nav.dashboard')}</span>
        </NavLink>

        <NavLink to="/app/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Rescue Board">
          <div className="nav-icon-wrapper">
            <CheckSquare size={22} aria-hidden="true" />
            {unassignedCount > 0 && <span className="badge-count" aria-label={`${unassignedCount} unassigned`}>{unassignedCount}</span>}
          </div>
          <span>Rescue Board</span>
        </NavLink>

        <NavLink to="/app/map" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Hyperlocal Map">
          <Map size={22} aria-hidden="true" />
          <span>{t('nav.map')}</span>
        </NavLink>

        <NavLink to="/app/adoption" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Adoption Center">
          <Heart size={22} aria-hidden="true" />
          <span>Adoption</span>
        </NavLink>

        <NavLink to="/app/foster" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Foster Hub">
          <Home size={22} aria-hidden="true" />
          <span>Foster Hub</span>
        </NavLink>

        <NavLink to="/app/lost-found" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Lost and Found">
          <Search size={22} aria-hidden="true" />
          <span>Lost &amp; Found</span>
        </NavLink>

        <NavLink to="/app/health" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Health Dashboard">
          <Activity size={22} aria-hidden="true" />
          <span>{t('nav.health')}</span>
        </NavLink>

        <NavLink to="/app/training" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Training Center">
          <Award size={22} aria-hidden="true" />
          <span>{t('nav.training')}</span>
        </NavLink>

        <NavLink to="/app/ecosystem" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Ecosystem">
          <Network size={22} aria-hidden="true" />
          <span>Ecosystem</span>
        </NavLink>

        <NavLink to="/app/impact" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Impact Stats">
          <TrendingUp size={22} aria-hidden="true" />
          <span>Impact</span>
        </NavLink>

        {['ngo', 'shelter', 'admin'].includes(currentUser?.role) && (
          <NavLink to="/app/assets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Asset Inventory">
            <Package size={22} aria-hidden="true" />
            <span>{t('nav.assets')}</span>
          </NavLink>
        )}

        {['ngo', 'vet', 'shelter', 'admin'].includes(currentUser?.role) && (
          <NavLink to="/app/municipal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Municipal Dashboard">
            <Building2 size={22} aria-hidden="true" />
            <span>Municipal</span>
          </NavLink>
        )}

        {currentUser?.role === 'admin' && (
          <NavLink to="/app/admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Admin Console">
            <ShieldAlert size={22} className="text-accent" aria-hidden="true" />
            <span>Admin</span>
          </NavLink>
        )}

        <NavLink to="/app/help" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} aria-label="Help Center">
          <HelpCircle size={22} aria-hidden="true" />
          <span>Help Center</span>
        </NavLink>
      </nav>

      <div className="nav-footer">
        <NavLink to="/app/notifications" className="icon-btn notif-btn" title="Notifications" aria-label={`Notifications${unreadNotifCount > 0 ? `, ${unreadNotifCount} unread` : ''}`}>
          <Bell size={20} aria-hidden="true" />
          {unreadNotifCount > 0 && <span className="badge-count notif-count" aria-hidden="true">{unreadNotifCount}</span>}
          <span className="icon-btn-label">Notifications</span>
        </NavLink>

        <button className="icon-btn" onClick={() => setShowChat(!showChat)} title={t('common.community')} aria-label="Open community chat">
          <MessageSquare size={20} aria-hidden="true" />
          <span className="icon-btn-label">Community</span>
        </button>
        
        <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title={t('nav.settings')} aria-label="Open settings">
          <Settings size={20} aria-hidden="true" />
          <span className="icon-btn-label">Settings</span>
        </button>

        <NavLink to="/app/profile" className="profile-section-link" title="My Profile" aria-label={`Profile: ${currentUser?.name}`}>
          <div className="profile-section">
            <div className="user-avatar" aria-hidden="true">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser?.name}</span>
              <span className="user-role">{t(`roles.${currentUser?.role}`, currentUser?.role)}</span>
            </div>
            <button 
              className="logout-btn" 
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation();
                if (confirm(t('nav.logout') + '?')) logout(); 
              }}
              aria-label="Log out"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </NavLink>
      </div>
    </>
  );

  return (
    <div className={`layout ${emergencyMode ? 'emergency-active' : ''}`}>
      {/* Mobile Header Bar */}
      <header className="mobile-header" role="banner">
        <div className="brand" aria-label="FaunaNet">
          <div className="brand-logo">
            <Shield size={20} fill="var(--primary)" stroke="var(--primary)" aria-hidden="true" />
          </div>
          <span className="brand-text">FaunaNet</span>
        </div>
        <button
          className="hamburger-btn"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="mobile-nav-drawer"
        >
          <Menu size={26} aria-hidden="true" />
        </button>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Nav Drawer */}
      <aside
        id="mobile-nav-drawer"
        className={`mobile-nav-drawer ${mobileNavOpen ? 'open' : ''}`}
        aria-label="Navigation drawer"
        aria-modal={mobileNavOpen}
        role="dialog"
      >
        <div className="mobile-nav-drawer-header">
          <span className="brand-text">FaunaNet</span>
          <button
            className="hamburger-btn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>
        <div className="mobile-nav-drawer-body">
          {navContent}
        </div>
      </aside>

      {emergencyMode && (
        <div className="emergency-ticker" role="alert" aria-live="assertive">
          <div className="ticker-content">
            {t('common.emergency_notice')} • {t('common.emergency_notice')} • {t('common.emergency_notice')}
          </div>
        </div>
      )}

      {/* Desktop Sidebar Nav */}
      <nav className="navbar" aria-label="Desktop sidebar navigation">
        {navContent}
      </nav>

      <main className="main-content">
        <div className={`network-state ${networkState?.startsWith('Offline') ? 'offline' : networkState === 'Reconnecting' ? 'reconnecting' : ''}`}>
          <Radio size={14} />
          <span>{networkState}</span>
        </div>
        <div className="content-layout">
          <div className="page-view">
            <Outlet />
          </div>
          <ActiveDispatchPanel />
        </div>
        
        <button 
          className={`sos-fab ${emergencyMode ? 'active' : ''}`}
          onClick={() => setShowSOS(true)}
        >
          <Phone size={24} />
          <span>SOS</span>
        </button>
      </main>

      {showSettings && (
        <div className="settings-drawer glass-panel animate-slide-in">
          <div className="drawer-header">
            <h3>{t('nav.settings')}</h3>
            <button onClick={() => setShowSettings(false)}><X size={20} /></button>
          </div>
          <div className="drawer-content">
            <div className="setting-item">
              <label>{t('settings.theme')}</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                {THEMES.map(option => (
                  <option key={option.code} value={option.code}>{t(option.labelKey)}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>{t('settings.language')}</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map(option => (
                  <option key={option.code} value={option.code}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="setting-item">
              <label>Emergency Mode</label>
              <button 
                className={`toggle-btn ${emergencyMode ? 'on' : ''}`}
                onClick={toggleEmergencyMode}
              >
                {emergencyMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="setting-item messenger-setting">
              <label>Messenger Sync</label>
              {['whatsapp', 'telegram', 'discord'].map((source) => (
                <button
                  key={source}
                  className={`toggle-btn ${messengerSettings?.messengerSync?.[source]?.enabled ? 'on' : ''}`}
                  onClick={() => updateMessengerSettings({
                    messengerSync: {
                      ...(messengerSettings?.messengerSync || {}),
                      [source]: {
                        ...(messengerSettings?.messengerSync?.[source] || {}),
                        enabled: !messengerSettings?.messengerSync?.[source]?.enabled,
                        reviewQueue: true
                      }
                    }
                  })}
                >
                  {source}: {messengerSettings?.messengerSync?.[source]?.enabled ? 'ON' : 'OFF'}
                </button>
              ))}
              <p>Incoming rescue messages enter a human review queue before dispatch.</p>
            </div>
          </div>
        </div>
      )}

      {showSOS && <SOSReportModal onClose={() => setShowSOS(false)} />}

      {showChat && (
        <Chat onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}
