import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { authService, reportService, taskService, ecosystemService } from '../services/api';
import api from '../services/api';
import socket from '../services/socket';

const AppContext = createContext();
export const useAppContext = () => useContext(AppContext);

// ── Reputation level definitions ──────────────────────────────────────────
export const REPUTATION_LEVELS = [
  {
    level: 1,
    title: 'Citizen',
    icon: '🌿',
    description: 'Welcome to FaunaNet. Every voice matters.',
    abilities: ['Report animals in need', 'Browse the rescue map', 'Join the community'],
    nextTitle: 'Helper',
    requirement: '5 verified reports or 2 completed tasks',
  },
  {
    level: 2,
    title: 'Helper',
    icon: '🤝',
    description: 'You are making a real difference.',
    abilities: ['Accept rescue tasks', 'Assist coordination'],
    nextTitle: 'Rescuer',
    requirement: '5 completed tasks',
  },
  {
    level: 3,
    title: 'Rescuer',
    icon: '🦺',
    description: 'Animals trust you. Communities rely on you.',
    abilities: ['Verify reports', 'Coordinate volunteers'],
    nextTitle: 'Guardian',
    requirement: '15 completed tasks',
  },
  {
    level: 4,
    title: 'Guardian',
    icon: '🛡️',
    description: 'A pillar of your local wildlife ecosystem.',
    abilities: ['Maintain animal profiles', 'Coordinate feeding points'],
    nextTitle: 'Coordinator',
    requirement: '30 completed tasks',
  },
  {
    level: 5,
    title: 'Coordinator',
    icon: '⭐',
    description: 'You help shape how the network operates.',
    abilities: ['Moderate zones', 'Help escalation routing', 'All permissions'],
    nextTitle: null,
    requirement: null,
  },
];

// Compute reputation level from user contribution data
export const computeReputation = (user) => {
  if (!user) return REPUTATION_LEVELS[0];
  const { verifiedReportCount = 0, completedTaskCount = 0 } = user;

  let level = 1;
  if (verifiedReportCount >= 5 || completedTaskCount >= 2) level = 2;
  if (completedTaskCount >= 5) level = 3;
  if (completedTaskCount >= 15) level = 4;
  if (completedTaskCount >= 30) level = 5;

  return REPUTATION_LEVELS[level - 1];
};

// Compute progress to next level (0–100)
export const computeProgress = (user) => {
  if (!user) return 0;
  const { verifiedReportCount = 0, completedTaskCount = 0 } = user;

  // Level 1 → 2: need 5 reports OR 2 tasks
  if (completedTaskCount < 2 && verifiedReportCount < 5) {
    const reportProgress = (verifiedReportCount / 5) * 100;
    const taskProgress = (completedTaskCount / 2) * 100;
    return Math.min(Math.max(reportProgress, taskProgress), 99);
  }
  // Level 2 → 3: need 5 tasks total
  if (completedTaskCount < 5) return Math.min((completedTaskCount / 5) * 100, 99);
  // Level 3 → 4: need 15 tasks
  if (completedTaskCount < 15) return Math.min((completedTaskCount / 15) * 100, 99);
  // Level 4 → 5: need 30 tasks
  if (completedTaskCount < 30) return Math.min((completedTaskCount / 30) * 100, 99);
  return 100;
};

// ── Provider ──────────────────────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const { i18n } = useTranslation();

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('faunanet_user');
    return saved ? JSON.parse(saved).user : null;
  });

  const [theme, setTheme] = useState(
    localStorage.getItem('faunanet_theme') || 'nature'
  );
  const [language, setLanguageState] = useState(
    localStorage.getItem('faunanet_lang') || 'en'
  );

  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [rescueLogs, setRescueLogs] = useState([]);
  const [credits, setCredits] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [networkState, setNetworkState] = useState(navigator.onLine ? 'Online — Syncing' : 'Offline — Cached Locally');
  const [messengerSettings, setMessengerSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const toggleEmergencyMode = () => setEmergencyMode((prev) => !prev);

  const setLanguage = (code) => {
    i18n.changeLanguage(code);
    setLanguageState(code);
    localStorage.setItem('faunanet_lang', code);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('faunanet_theme', theme);
  }, [theme]);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, []);

  // ── Fetch tasks from backend ────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      const data = await taskService.getAll();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchTasks error:', err.message);
    }
  }, []);

  // ── Fetch reports from backend ──────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const data = await reportService.getAll();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('fetchReports error:', err.message);
    }
  }, []);

  const fetchEcosystem = useCallback(async () => {
    try {
      const [nodeData, logData, creditData, leaderboardData, settingsData] = await Promise.all([
        ecosystemService.getNodes(),
        ecosystemService.getLogs(),
        ecosystemService.getCredits(),
        ecosystemService.getLeaderboard(),
        ecosystemService.getSettings(),
      ]);
      setNodes(Array.isArray(nodeData) ? nodeData : []);
      setRescueLogs(Array.isArray(logData) ? logData : []);
      setCredits(creditData || null);
      setLeaderboard(leaderboardData || null);
      setMessengerSettings(settingsData || null);
    } catch (err) {
      console.error('fetchEcosystem error:', err.message);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const data = res.data;
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadNotifCount(data.unreadCount || 0);
    } catch (err) {
      // Silently fail — notifications are non-critical
    }
  }, []);

  // Convenience: refresh all data at once (used by JudgeDemoModal after demo runs)
  const refreshData = useCallback(async () => {
    await Promise.all([fetchTasks(), fetchReports(), fetchEcosystem(), fetchNotifications()]);
  }, [fetchTasks, fetchReports, fetchEcosystem, fetchNotifications]);

  // Initial data load when user is set
  useEffect(() => {
    if (currentUser) {
      fetchTasks();
      fetchReports();
      fetchEcosystem();
      fetchNotifications();
    } else {
      setTasks([]);
      setReports([]);
      setNodes([]);
      setRescueLogs([]);
      setCredits(null);
      setLeaderboard(null);
      setMessengerSettings(null);
      setNotifications([]);
      setUnreadNotifCount(0);
    }
  }, [currentUser]);

  useEffect(() => {
    const goOnline = () => setNetworkState('Online — Syncing');
    const goOffline = () => setNetworkState('Offline — Cached Locally');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      socket.disconnect();
      return undefined;
    }

    socket.connect();
    socket.on('connect', () => setNetworkState('Online — Syncing'));
    socket.on('disconnect', () => setNetworkState(navigator.onLine ? 'Reconnecting' : 'Offline — Cached Locally'));

    const upsertTask = (task) => {
      setTasks((prev) => {
        const taskId = task._id || task.id;
        const exists = prev.some((item) => (item._id || item.id) === taskId);
        return exists
          ? prev.map((item) => ((item._id || item.id) === taskId ? task : item))
          : [task, ...prev];
      });
    };

    socket.on('task:created', upsertTask);
    socket.on('task:updated', upsertTask);
    socket.on('task:escalated', upsertTask);
    socket.on('task:message', upsertTask);
    socket.on('node:updated', (node) => {
      setNodes((prev) => {
        const nodeId = node._id || node.id;
        const exists = prev.some((item) => (item._id || item.id) === nodeId);
        return exists
          ? prev.map((item) => ((item._id || item.id) === nodeId ? node : item))
          : [node, ...prev];
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('task:created', upsertTask);
      socket.off('task:updated', upsertTask);
      socket.off('task:escalated', upsertTask);
      socket.off('task:message', upsertTask);
      socket.off('node:updated');
      socket.disconnect();
    };
  }, [currentUser]);

  // ── Auth actions ────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem('faunanet_user', JSON.stringify(data));
      setCurrentUser(data.user);
    } catch (err) {
      const msg = err.message || 'Login failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authService.register(userData);
      localStorage.setItem('faunanet_user', JSON.stringify(data));
      setCurrentUser(data.user);
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('faunanet_user');
    setCurrentUser(null);
  };

  // ── Update currentUser in memory after stats change ────────────
  const refreshCurrentUser = (updates) => {
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      const saved = localStorage.getItem('faunanet_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem('faunanet_user', JSON.stringify({ ...parsed, user: updated }));
      }
      return updated;
    });
  };

  // ── Report actions ──────────────────────────────────────────────
  const addReport = async (reportData) => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportService.create(reportData);
      // Optimistically add the task and report to state
      if (result.task) setTasks((prev) => [result.task, ...prev]);
      if (result.report) setReports((prev) => [result.report, ...prev]);
      // Refresh from server to get populated data
      await Promise.all([fetchTasks(), fetchReports()]);
      // Bump local trust score for immediate UI feedback
      refreshCurrentUser({
        trustScore: (currentUser?.trustScore || 0) + 2,
        verifiedReportCount: (currentUser?.verifiedReportCount || 0) + 1,
        points: (currentUser?.points || 0) + 10,
      });
      return result;
    } catch (err) {
      const msg = err.message || 'Report submission failed.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Task actions ────────────────────────────────────────────────
  const updateTask = async (taskId, status) => {
    try {
      const updatedTask = await taskService.update(taskId, status);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId || t.id === taskId ? updatedTask : t))
      );
      if (status === 'Completed') {
        refreshCurrentUser({
          trustScore: (currentUser?.trustScore || 0) + 5,
          completedTaskCount: (currentUser?.completedTaskCount || 0) + 1,
          points: (currentUser?.points || 0) + 25,
        });
      }
    } catch (err) {
      console.error('updateTask error:', err.message);
      throw err;
    }
  };

  const updateTaskDispatch = async (taskId, payload) => {
    const updatedTask = await taskService.updateWithPayload(taskId, payload);
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId || t.id === taskId ? updatedTask : t))
    );
    return updatedTask;
  };

  const escalateTask = async (taskId) => {
    const updatedTask = await taskService.escalate(taskId);
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId || t.id === taskId ? updatedTask : t))
    );
    return updatedTask;
  };

  const addTaskMessage = async (taskId, payload) => {
    const updatedTask = await taskService.addMessage(taskId, payload);
    setTasks((prev) =>
      prev.map((t) => (t._id === taskId || t.id === taskId ? updatedTask : t))
    );
    return updatedTask;
  };

  const triageReport = async (payload) => reportService.triage(payload);

  const createNode = async (nodeData) => {
    const node = await ecosystemService.createNode(nodeData);
    setNodes((prev) => [node, ...prev]);
    return node;
  };

  const updateMessengerSettings = async (settings) => {
    const next = await ecosystemService.updateSettings(settings);
    setMessengerSettings(next);
    return next;
  };

  const verifyTask = async (taskId) => {
    try {
      const verifiedTask = await taskService.verify(taskId);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId || t.id === taskId ? verifiedTask : t))
      );
      return true;
    } catch (err) {
      setError(err.message || 'Verification failed.');
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        refreshCurrentUser,
        login, logout, register,
        theme, setTheme,
        language, setLanguage,
        tasks, reports,
        nodes, rescueLogs, credits, leaderboard, networkState, messengerSettings,
        notifications, unreadNotifCount, fetchNotifications,
        addReport, updateTask, updateTaskDispatch, escalateTask, addTaskMessage, verifyTask,
        triageReport, createNode, updateMessengerSettings,
        fetchTasks, fetchReports, fetchEcosystem, refreshData,
        loading, error, setError,
        emergencyMode, toggleEmergencyMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
