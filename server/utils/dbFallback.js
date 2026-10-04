const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');

const getFilePath = (filename) => path.join(DATA_DIR, filename);

const readJSON = (filename) => {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return [];
  }
};

const writeJSON = (filename, data) => {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
};

// ── User Operations ───────────────────────────────────────────────
exports.findUserByEmail = async (email) => {
  const users = readJSON('users.json');
  const user = users.find(u => u.email === email);
  if (!user) return null;
  
  return {
    ...user,
    comparePassword: async (candidatePassword) => {
      return await bcrypt.compare(candidatePassword, user.password);
    }
  };
};

exports.findUserById = async (id) => {
  const users = readJSON('users.json');
  const user = users.find(u => u._id === id || u.id === id);
  return user || null;
};

exports.createUser = async (userData) => {
  const users = readJSON('users.json');
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const newUser = {
    _id: `user_${Math.random().toString(36).substr(2, 9)}`,
    ...userData,
    password: hashedPassword,
    level: 1,
    points: 0,
    trustScore: 0,
    verifiedReportCount: 0,
    completedTaskCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  users.push(newUser);
  writeJSON('users.json', users);
  
  return {
    ...newUser,
    comparePassword: async (candidatePassword) => {
      return await bcrypt.compare(candidatePassword, newUser.password);
    }
  };
};

exports.updateUser = async (id, updates) => {
  const users = readJSON('users.json');
  const idx = users.findIndex(u => u._id === id || u.id === id);
  if (idx === -1) return null;
  
  const original = users[idx];
  
  // Handle increment logic ($inc)
  if (updates.$inc) {
    const $inc = updates.$inc;
    for (const key of Object.keys($inc)) {
      original[key] = (original[key] || 0) + $inc[key];
    }
    delete updates.$inc;
  }
  
  users[idx] = {
    ...original,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  writeJSON('users.json', users);
  return users[idx];
};

// ── Report Operations ─────────────────────────────────────────────
exports.createReport = async (reportData) => {
  const reports = readJSON('reports.json');
  const newReport = {
    _id: `report_${Math.random().toString(36).substr(2, 9)}`,
    ...reportData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  reports.push(newReport);
  writeJSON('reports.json', reports);
  return newReport;
};

exports.getReports = async () => {
  const reports = readJSON('reports.json');
  return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

// ── Task Operations ──────────────────────────────────────────────
exports.createTask = async (taskData) => {
  const tasks = readJSON('tasks.json');
  const newTask = {
    _id: `task_${Math.random().toString(36).substr(2, 9)}`,
    ...taskData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tasks.push(newTask);
  writeJSON('tasks.json', tasks);
  return newTask;
};

exports.getTasks = async () => {
  const tasks = readJSON('tasks.json');
  return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

exports.updateTask = async (id, updates) => {
  const tasks = readJSON('tasks.json');
  const idx = tasks.findIndex(t => t._id === id || t.id === id);
  if (idx === -1) return null;
  
  tasks[idx] = {
    ...tasks[idx],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  writeJSON('tasks.json', tasks);
  return tasks[idx];
};
