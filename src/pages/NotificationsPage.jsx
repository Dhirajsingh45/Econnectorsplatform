import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, CheckCheck, Trash2, ShieldAlert, Car, Award, 
  Stethoscope, Info, ExternalLink, Heart, Home, Search, BookOpen
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { notificationService } from '../services/api';
import './NotificationsPage.css';

const TYPE_META = {
  dispatch:    { label: 'Dispatch',    color: '#FF8C42', Icon: Car },
  assignment:  { label: 'Assignment',  color: '#FF8C42', Icon: Car },
  escalation:  { label: 'Escalation',  color: '#E74C3C', Icon: ShieldAlert },
  medical:     { label: 'Medical',     color: '#3498DB', Icon: Stethoscope },
  verification:{ label: 'Verified',    color: '#F1C40F', Icon: Award },
  foster:      { label: 'Foster',      color: '#9B59B6', Icon: Home },
  adoption:    { label: 'Adoption',    color: '#E91E8C', Icon: Heart },
  lost_found:  { label: 'Lost & Found',color: '#2ECC71', Icon: Search },
  training:    { label: 'Training',    color: '#1ABC9C', Icon: BookOpen },
  system:      { label: 'System',      color: '#7F8C8D', Icon: Info },
};

export default function NotificationsPage() {
  const { notifications, unreadNotifCount, fetchNotifications } = useAppContext();
  const [filter, setFilter] = useState('all'); // all, unread, dispatch, medical
  const [loadingAction, setLoadingAction] = useState(false);
  const navigate = useNavigate();

  const handleMarkAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setLoadingAction(true);
      await notificationService.markAllRead();
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.deleteOne(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getTypeMeta = (type) => TYPE_META[type] || TYPE_META.system;

  const FILTER_GROUPS = {
    all:      () => true,
    unread:   n => !n.read,
    dispatch: n => ['dispatch', 'assignment', 'escalation'].includes(n.type),
    medical:  n => n.type === 'medical',
    welfare:  n => ['foster', 'adoption', 'lost_found'].includes(n.type),
    training: n => n.type === 'training',
  };

  const filtered = notifications.filter(FILTER_GROUPS[filter] || FILTER_GROUPS.all);

  return (
    <div className="notifications-page animate-fade-in">
      <div className="notif-header">
        <div>
          <h1 className="notif-title">
            <Bell className="inline-icon" size={28} /> Operational Alerts & Notifications
          </h1>
          <p className="notif-subtitle">
            Real-time dispatch updates, escalation triggers, verification logs, and medical alerts.
          </p>
        </div>
        <div className="notif-actions">
          {unreadNotifCount > 0 && (
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleMarkAllRead}
              disabled={loadingAction}
            >
              <CheckCheck size={16} /> Mark All Read ({unreadNotifCount})
            </button>
          )}
        </div>
      </div>

      <div className="notif-tabs">
        {[
          { key: 'all',      label: `All (${notifications.length})` },
          { key: 'unread',   label: `Unread (${unreadNotifCount})` },
          { key: 'dispatch', label: '🚨 Dispatch' },
          { key: 'medical',  label: '🏥 Medical' },
          { key: 'welfare',  label: '🐾 Welfare' },
          { key: 'training', label: '📚 Training' },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`notif-tab ${filter === key ? 'active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="notif-list-container">
        {filtered.length === 0 ? (
          <div className="notif-empty glass-panel">
            <div className="empty-icon-circle">
              <Bell size={36} />
            </div>
            <h3>No notifications here</h3>
            <p>You are completely caught up! New dispatch alerts and medical updates will appear here in real-time.</p>
          </div>
        ) : (
          <div className="notif-list">
            {filtered.map((item) => (
              <div 
                key={item._id} 
                className={`notif-card glass-panel ${item.read ? 'read' : 'unread'}`}
                onClick={() => {
                  if (!item.read) handleMarkAsRead(item._id);
                  if (item.link) navigate(item.link);
                }}
              >
                <div className="notif-icon-col">
                  {(() => { const m = getTypeMeta(item.type); const I = m.Icon; return <I size={20} style={{ color: m.color }} />; })()}
                </div>
                <div className="notif-content-col">
                  <div className="notif-meta">
                    <span className="notif-type-tag" style={{ color: getTypeMeta(item.type).color }}>{getTypeMeta(item.type).label}</span>
                    <span className="notif-time">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <h4 className="notif-card-title">{item.title}</h4>
                  <p className="notif-card-msg">{item.message}</p>
                  {item.link && (
                    <span className="notif-link-badge">
                      Action Required <ExternalLink size={12} />
                    </span>
                  )}
                </div>
                <div className="notif-actions-col">
                  {!item.read && (
                    <button 
                      className="action-icon-btn"
                      title="Mark as read"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(item._id);
                      }}
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button 
                    className="action-icon-btn danger"
                    title="Delete notification"
                    onClick={(e) => handleDelete(item._id, e)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
