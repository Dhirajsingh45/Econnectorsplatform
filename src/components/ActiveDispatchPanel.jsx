import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, MessageSquare, Navigation, Radio, ShieldCheck, Zap } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { dispatchService } from '../services/api';

const ACTIVE_STATUSES = ['Reported', 'Dispatched', 'Accepted', 'En Route', 'In Progress', 'Stabilized'];

const getSlaExpirationTime = (task) => {
  if (task.dispatch?.slaExpiresAt) {
    return new Date(task.dispatch.slaExpiresAt).getTime();
  }
  const started = task.dispatch?.dispatchedAt || task.createdAt;
  const startedMs = started ? new Date(started).getTime() : Date.now();
  const slaDurationMs = (task.dispatch?.slaDurationSeconds || 900) * 1000;
  return startedMs + slaDurationMs;
};

export default function ActiveDispatchPanel() {
  const { tasks, updateTaskDispatch, escalateTask, addTaskMessage } = useAppContext();
  const [now, setNow] = useState(Date.now());
  const [quickMessage, setQuickMessage] = useState('Responder check-in requested');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeTask = useMemo(() => {
    return tasks
      .filter((task) => ACTIVE_STATUSES.includes(task.status))
      .sort((a, b) => {
        const urgencyRank = { P1: 0, Critical: 0, P2: 1, High: 1, P3: 2, Medium: 2, P4: 3, Low: 3 };
        return (urgencyRank[a.urgency] ?? 4) - (urgencyRank[b.urgency] ?? 4);
      })[0];
  }, [tasks]);

  if (!activeTask) return null;

  const taskId = activeTask._id || activeTask.id;
  const expirationMs = getSlaExpirationTime(activeTask);
  const remainingSeconds = Math.max(Math.floor((expirationMs - now) / 1000), 0);
  const expired = remainingSeconds === 0 && activeTask.status === 'Dispatched';
  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const seconds = String(remainingSeconds % 60).padStart(2, '0');

  const handlePrimary = async () => {
    if (activeTask.status === 'Reported') {
      try {
        await dispatchService.initiate(taskId);
      } catch {
        await updateTaskDispatch(taskId, { status: 'Dispatched' });
      }
    } else if (activeTask.status === 'Dispatched') {
      try {
        await dispatchService.accept(taskId);
      } catch {
        await updateTaskDispatch(taskId, { status: 'Accepted' });
      }
    } else {
      const nextStatus =
        activeTask.status === 'Accepted' ? 'En Route' :
        activeTask.status === 'En Route' ? 'In Progress' :
        activeTask.status === 'In Progress' ? 'Stabilized' : activeTask.status;

      await updateTaskDispatch(taskId, { status: nextStatus });
    }
  };

  const handleEscalate = async () => {
    await escalateTask(taskId);
  };

  const sendQuickMessage = async () => {
    if (!quickMessage.trim()) return;
    await addTaskMessage(taskId, { text: quickMessage.trim() });
    setQuickMessage('');
  };

  return (
    <aside className="active-dispatch-panel" aria-label="Active dispatch">
      <div className="dispatch-header">
        <div>
          <span className="dispatch-kicker"><Radio size={14} /> Active Dispatch</span>
          <h3>{activeTask.title || `${activeTask.animalType || 'Animal'} rescue`}</h3>
        </div>
        <span className={`dispatch-urgency ${activeTask.urgency?.toLowerCase()}`}>{activeTask.urgency}</span>
      </div>

      <div className="dispatch-clock">
        <Clock size={18} />
        <div>
          <strong>{expired ? 'SLA Expired — Escalating' : `${minutes}:${seconds}`}</strong>
          <span>server SLA window</span>
        </div>
      </div>

      <div className="dispatch-grid">
        <div>
          <span>Responder</span>
          <strong>{activeTask.dispatch?.responderStatus || 'Awaiting dispatch'}</strong>
        </div>
        <div>
          <span>Distance</span>
          <strong>{activeTask.dispatch?.responderDistanceKm ? `${activeTask.dispatch.responderDistanceKm.toFixed(1)} km` : 'Unassigned'}</strong>
        </div>
        <div>
          <span>State</span>
          <strong>{activeTask.status}</strong>
        </div>
        <div>
          <span>Escalation</span>
          <strong>{activeTask.dispatch?.escalationState || 'none'}</strong>
        </div>
      </div>

      <div className="dispatch-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
        <button className="btn btn-primary w-full" onClick={handlePrimary}>
          <Zap size={18} /> {activeTask.status === 'Reported' ? 'Initiate SLA Dispatch' : activeTask.status === 'Dispatched' ? 'Accept Dispatch' : 'Advance Rescue'}
        </button>
        {expired && (
          <button className="btn btn-danger w-full" onClick={handleEscalate}>
            <AlertTriangle size={18} /> Escalate
          </button>
        )}
      </div>

      <div className="dispatch-bridge" style={{ marginTop: '0.75rem' }}>
        <div className="bridge-title"><MessageSquare size={15} /> Communication Bridge</div>
        <div className="bridge-messages">
          {(activeTask.dispatch?.quickMessages || []).slice(-3).map((msg, index) => (
            <span key={`${msg.at}-${index}`}>{msg.text}</span>
          ))}
          {(!activeTask.dispatch?.quickMessages || activeTask.dispatch.quickMessages.length === 0) && (
            <span>No check-ins yet.</span>
          )}
        </div>
        <div className="bridge-input">
          <input value={quickMessage} onChange={(event) => setQuickMessage(event.target.value)} />
          <button type="button" onClick={sendQuickMessage}><Navigation size={16} /></button>
        </div>
      </div>

      {activeTask.status === 'Stabilized' && (
        <div className="dispatch-stable" style={{ marginTop: '0.5rem' }}>
          <ShieldCheck size={16} /> Animal stabilized. Awaiting completion proof.
        </div>
      )}
    </aside>
  );
}
