import { useEffect, useMemo, useState } from 'react';
import { Award, ClipboardList, HeartPulse, MessageSquare, Plus, Search, ShieldCheck, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import './Ecosystem.css';

const NODE_TYPES = ['vet', 'shelter', 'rescuer', 'transport', 'volunteer'];
const NODE_STATUSES = ['Available', 'Busy', 'Emergency Only', 'Offline'];

export default function Ecosystem() {
  const {
    nodes,
    rescueLogs,
    credits,
    leaderboard,
    messengerSettings,
    createNode,
    updateMessengerSettings,
    fetchEcosystem,
  } = useAppContext();
  const [tab, setTab] = useState('nodes');
  const [query, setQuery] = useState('');
  const [nodeForm, setNodeForm] = useState({ name: '', type: 'volunteer', status: 'Available', activeRegion: '', city: '', zone: '', contact: '' });

  useEffect(() => {
    fetchEcosystem();
  }, [fetchEcosystem]);

  const filteredLogs = useMemo(() => {
    if (!query.trim()) return rescueLogs;
    const q = query.toLowerCase();
    return rescueLogs.filter((log) => `${log.searchText || ''} ${log.animalDigitalId || ''} ${log.animalType || ''}`.toLowerCase().includes(q));
  }, [query, rescueLogs]);

  const submitNode = async (event) => {
    event.preventDefault();
    await createNode(nodeForm);
    setNodeForm({ name: '', type: 'volunteer', status: 'Available', activeRegion: '', city: '', zone: '', contact: '' });
  };

  const updateMessenger = async (source, enabled) => {
    const current = messengerSettings?.messengerSync || {};
    await updateMessengerSettings({
      messengerSync: {
        ...current,
        [source]: { ...(current[source] || {}), enabled, reviewQueue: true }
      }
    });
  };

  return (
    <div className="ecosystem-page animate-fade-in">
      <header className="ecosystem-header">
        <div>
          <h1>FaunaNet Ecosystem</h1>
          <p>Trusted nodes, verified help, and rescue history across your city.</p>
        </div>
      </header>

      <div className="ecosystem-tabs">
        <button className={tab === 'nodes' ? 'active' : ''} onClick={() => setTab('nodes')}><Users size={17} /> Nodes</button>
        <button className={tab === 'credits' ? 'active' : ''} onClick={() => setTab('credits')}><Award size={17} /> Rescue Credits</button>
        <button className={tab === 'leaderboard' ? 'active' : ''} onClick={() => setTab('leaderboard')}><ShieldCheck size={17} /> Trust Layer</button>
        <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}><ClipboardList size={17} /> Proof Log</button>
        <button className={tab === 'messenger' ? 'active' : ''} onClick={() => setTab('messenger')}><MessageSquare size={17} /> Messenger Sync</button>
      </div>

      {tab === 'nodes' && (
        <div className="ecosystem-grid">
          <section className="ecosystem-section">
            <h2>Nodes Directory</h2>
            <div className="node-grid">
              {nodes.length === 0 ? (
                <div className="empty-ecosystem">No ecosystem nodes registered yet. Add real responders, vets, shelters, or transport providers as they join.</div>
              ) : nodes.map((node) => (
                <article className="node-card" key={node._id || node.id}>
                  <span className={`node-status ${node.status?.toLowerCase().replaceAll(' ', '-')}`}>{node.status}</span>
                  <h3>{node.name}</h3>
                  <p>{node.activeRegion}</p>
                  <div className="node-meta">
                    <span>{node.type}</span>
                    <span>Trust {node.trustLevel}</span>
                    <span>{node.responseHistory} responses</span>
                    <span>{node.rescueCredits} Nodes</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <form className="ecosystem-section node-form" onSubmit={submitNode}>
            <h2><Plus size={18} /> Register Real Node</h2>
            <input placeholder="Name" value={nodeForm.name} onChange={(event) => setNodeForm({ ...nodeForm, name: event.target.value })} required />
            <select value={nodeForm.type} onChange={(event) => setNodeForm({ ...nodeForm, type: event.target.value })}>
              {NODE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <select value={nodeForm.status} onChange={(event) => setNodeForm({ ...nodeForm, status: event.target.value })}>
              {NODE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <input placeholder="Active region" value={nodeForm.activeRegion} onChange={(event) => setNodeForm({ ...nodeForm, activeRegion: event.target.value })} required />
            <input placeholder="City" value={nodeForm.city} onChange={(event) => setNodeForm({ ...nodeForm, city: event.target.value })} />
            <input placeholder="Zone" value={nodeForm.zone} onChange={(event) => setNodeForm({ ...nodeForm, zone: event.target.value })} />
            <input placeholder="Contact channel" value={nodeForm.contact} onChange={(event) => setNodeForm({ ...nodeForm, contact: event.target.value })} />
            <button className="btn btn-primary" type="submit">Save Node</button>
          </form>
        </div>
      )}

      {tab === 'credits' && (
        <section className="ecosystem-section">
          <h2>Rescue Credits Dashboard</h2>
          <div className="credit-band">
            <div><strong>{credits?.nodes || 0}</strong><span>Verified Nodes</span></div>
            <div><strong>{credits?.completed || 0}</strong><span>Completed tasks</span></div>
            <div><strong>{credits?.verified || 0}</strong><span>Verified rescues</span></div>
          </div>
          <p className="ecosystem-note">Credits require proof uploads, timestamps, and operational confirmation. Reports alone do not award Nodes.</p>
        </section>
      )}

      {tab === 'leaderboard' && (
        <section className="ecosystem-section">
          <h2>Regional Trust Layer</h2>
          <div className="leaderboard-list">
            {(leaderboard?.rescuers || []).length === 0 ? (
              <div className="empty-ecosystem">No verified contribution history yet.</div>
            ) : leaderboard.rescuers.map((user) => (
              <div className="leader-row" key={user._id || user.id}>
                <span>{user.name}</span>
                <strong>{user.trustScore || 0} trust</strong>
                <small>{user.completedTaskCount || 0} completed</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'logs' && (
        <section className="ecosystem-section">
          <div className="search-row">
            <h2>Verified Audit Trail</h2>
            <label><Search size={16} /><input placeholder="Search animal, rescuer, zone, organization" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          </div>
          <div className="log-list">
            {filteredLogs.length === 0 ? (
              <div className="empty-ecosystem">No rescue history logs yet. New emergency reports will create audit entries automatically.</div>
            ) : filteredLogs.map((log) => (
              <article className="log-card" key={log._id || log.id}>
                <div>
                  <span>{log.animalDigitalId || 'Animal dossier pending'}</span>
                  <h3>{log.animalType || 'Animal'} rescue</h3>
                  <p>{log.zone || 'Zone pending'}</p>
                </div>
                <strong>{log.verificationStatus}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'messenger' && (
        <section className="ecosystem-section">
          <h2>Messenger Sync Review Queue</h2>
          <p className="ecosystem-note">Imported WhatsApp, Telegram, and Discord reports will enter a human review queue before dispatch.</p>
          {['whatsapp', 'telegram', 'discord'].map((source) => (
            <div className="messenger-row" key={source}>
              <div><HeartPulse size={18} /><span>{source}</span></div>
              <button
                className={`toggle-btn ${messengerSettings?.messengerSync?.[source]?.enabled ? 'on' : ''}`}
                onClick={() => updateMessenger(source, !messengerSettings?.messengerSync?.[source]?.enabled)}
              >
                {messengerSettings?.messengerSync?.[source]?.enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
