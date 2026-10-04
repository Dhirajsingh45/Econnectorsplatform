import { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, FileText, CheckCircle, XCircle, Activity, RefreshCw } from 'lucide-react';
import { adminService } from '../services/api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('verifications');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData, logsData, duplicatesData] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getAuditLogs(),
        adminService.getDuplicates()
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setAuditLogs(Array.isArray(logsData) ? logsData : []);
      setDuplicates(Array.isArray(duplicatesData) ? duplicatesData : []);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setError(err.message || 'Failed to load administrator governance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleVerifyUser = async (userId, verificationStatus, role) => {
    try {
      await adminService.verifyUser(userId, { verificationStatus, role });
      alert(`User status updated to ${verificationStatus.toUpperCase()}`);
      fetchAdminData();
    } catch (err) {
      alert(err.message || 'Action failed.');
    }
  };

  const pendingUsers = users.filter(u => u.verificationStatus === 'pending');

  return (
    <div className="admin-dashboard animate-fade-in">
      <header className="admin-header mb-xl flex justify-between items-center">
        <div>
          <h1 className="pixel-font text-accent flex items-center gap-sm">
            <Shield size={28} className="text-primary" /> Administrator Operations Command
          </h1>
          <p className="text-muted text-xs">Governance, User Role Verification, System Audit & Moderation</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={fetchAdminData}>
          <RefreshCw size={16} /> Refresh Command Center
        </button>
      </header>

      {/* Real Server Stats */}
      {stats && (
        <div className="admin-stats-strip mb-xl">
          <div className="admin-stat-card glass-panel">
            <Users size={20} className="text-primary" />
            <div className="info">
              <span className="val">{stats.totalUsers}</span>
              <span className="lab">REGISTERED USERS</span>
            </div>
          </div>
          <div className="admin-stat-card glass-panel highlight">
            <Shield size={20} className="text-accent" />
            <div className="info">
              <span className="val">{stats.pendingVerifications}</span>
              <span className="lab">PENDING VERIFICATIONS</span>
            </div>
          </div>
          <div className="admin-stat-card glass-panel">
            <AlertTriangle size={20} className="text-danger" />
            <div className="info">
              <span className="val">{stats.activeTasks}</span>
              <span className="lab">ACTIVE DISPATCHES</span>
            </div>
          </div>
          <div className="admin-stat-card glass-panel">
            <Activity size={20} className="text-teal" />
            <div className="info">
              <span className="val">{stats.systemHealth}</span>
              <span className="lab">SYSTEM STATUS</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="ecosystem-tabs mb-lg">
        <button 
          className={activeTab === 'verifications' ? 'active' : ''} 
          onClick={() => setActiveTab('verifications')}
        >
          <Shield size={17} /> Role Verifications ({pendingUsers.length})
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''} 
          onClick={() => setActiveTab('users')}
        >
          <Users size={17} /> User Management ({users.length})
        </button>
        <button 
          className={activeTab === 'audit' ? 'active' : ''} 
          onClick={() => setActiveTab('audit')}
        >
          <FileText size={17} /> Audit Trail ({auditLogs.length})
        </button>
        <button 
          className={activeTab === 'duplicates' ? 'active' : ''} 
          onClick={() => setActiveTab('duplicates')}
        >
          <AlertTriangle size={17} /> Duplicate Reports ({duplicates.length})
        </button>
      </div>

      {loading ? (
        <div className="empty-board p-xl text-center">
          <p>Loading administrative database records...</p>
        </div>
      ) : error ? (
        <div className="error-alert mb-lg">{error}</div>
      ) : (
        <>
          {/* Tab 1: Pending Role Verifications */}
          {activeTab === 'verifications' && (
            <div className="admin-section glass-panel">
              <h2>Pending Role Verification Applications</h2>
              <p className="text-xs text-muted mb-md">Review citizen requests for elevated Rescuer, Volunteer, NGO, Vet, or Shelter roles.</p>
              
              {pendingUsers.length === 0 ? (
                <div className="p-xl text-center text-muted">
                  <CheckCircle size={36} className="text-primary mx-auto mb-sm" />
                  <p>All verification applications have been reviewed. No pending applications.</p>
                </div>
              ) : (
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>APPLICANT</th>
                      <th>EMAIL / PHONE</th>
                      <th>CURRENT ROLE</th>
                      <th>APPLICATION NOTES</th>
                      <th>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.map(u => (
                      <tr key={u._id}>
                        <td className="font-bold">{u.name}</td>
                        <td className="text-xs text-muted">{u.email} <br /> {u.phone || 'No phone'}</td>
                        <td><span className="type-tag">{u.role.toUpperCase()}</span></td>
                        <td className="text-xs text-primary">{u.verificationNotes || 'Role upgrade requested'}</td>
                        <td>
                          <div className="flex gap-xs">
                            <button 
                              className="btn btn-teal btn-sm"
                              onClick={() => {
                                const targetRole = prompt('Assign Verified Role (volunteer / ngo / vet / shelter):', 'volunteer');
                                if (targetRole) handleVerifyUser(u._id, 'approved', targetRole);
                              }}
                            >
                              <CheckCircle size={14} /> APPROVE
                            </button>
                            <button 
                              className="btn btn-outline btn-sm text-danger"
                              onClick={() => handleVerifyUser(u._id, 'rejected', 'citizen')}
                            >
                              <XCircle size={14} /> REJECT
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab 2: User Directory */}
          {activeTab === 'users' && (
            <div className="admin-section glass-panel">
              <h2>All System Users</h2>
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>ASSIGNED ROLE</th>
                    <th>VERIFICATION STATUS</th>
                    <th>TRUST SCORE</th>
                    <th>REGISTERED</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td className="font-bold">{u.name}</td>
                      <td className="text-xs text-muted">{u.email}</td>
                      <td><span className="type-tag">{u.role.toUpperCase()}</span></td>
                      <td>
                        <span className={`status-pill ${u.verificationStatus === 'approved' ? 'available' : 'in-use'}`}>
                          {u.verificationStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>{u.trustScore} pts</td>
                      <td className="text-xs text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Audit Trail */}
          {activeTab === 'audit' && (
            <div className="admin-section glass-panel">
              <h2>System Audit Log</h2>
              <p className="text-xs text-muted mb-md">Immutable record of sensitive operations, logins, status updates, and verification decisions.</p>
              <div className="audit-log-list">
                {auditLogs.map(log => (
                  <div key={log._id} className="audit-log-item">
                    <div className="log-action font-bold text-accent">{log.action}</div>
                    <div className="log-details text-xs text-muted">
                      Actor: {log.actor?.name || 'System'} ({log.actor?.email || 'N/A'}) • Target: {log.targetType} #{log.targetId || 'N/A'}
                    </div>
                    <div className="log-time text-xxs text-primary">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Duplicate Reports */}
          {activeTab === 'duplicates' && (
            <div className="admin-section glass-panel">
              <h2>Flagged Duplicate Reports</h2>
              {duplicates.length === 0 ? (
                <p className="p-xl text-center text-muted">No duplicate reports recorded.</p>
              ) : (
                <div className="log-list">
                  {duplicates.map(d => (
                    <article key={d._id} className="log-card">
                      <div>
                        <span className="text-danger font-bold">DUPLICATE REPORT</span>
                        <h3>{d.animalType} rescue - {d.description}</h3>
                        <p className="text-xs text-muted">Location: {d.location?.address || 'GPS Coordinates'}</p>
                      </div>
                      <strong>Parent Case Linked</strong>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
