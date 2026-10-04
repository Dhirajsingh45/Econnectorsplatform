const FaunaNode = require('../models/FaunaNode');
const RescueLog = require('../models/RescueLog');
const Task = require('../models/Task');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');

const getErrorMessage = (err) => err.message || 'An unexpected error occurred.';

exports.getNodes = async (req, res) => {
  try {
    const { type, city, status } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (city) filter.city = new RegExp(city, 'i');
    if (status) filter.status = status;

    const nodes = await FaunaNode.find(filter).sort({ status: 1, trustLevel: -1, updatedAt: -1 });
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.createNode = async (req, res) => {
  try {
    const { name, type, status, activeRegion, city, zone, contact } = req.body;
    if (!name || !type || !activeRegion) {
      return res.status(400).json({ message: 'Name, node type and active region are required.' });
    }

    const node = await FaunaNode.create({
      name,
      type,
      status: status || 'Available',
      activeRegion,
      city,
      zone,
      contact,
      owner: req.user._id
    });

    req.app.get('io')?.emit('node:updated', node);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.getRescueLogs = async (req, res) => {
  try {
    const { q } = req.query;
    const filter = q ? { searchText: new RegExp(q, 'i') } : {};
    const logs = await RescueLog.find(filter)
      .populate('responders', 'name role trustScore')
      .populate('task')
      .sort({ createdAt: -1 })
      .limit(80);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.getCredits = async (req, res) => {
  try {
    const userId = req.user._id;
    const [completed, verified, logs] = await Promise.all([
      Task.countDocuments({ assignedTo: userId, status: { $in: ['Completed', 'Verified'] } }),
      Task.countDocuments({ assignedTo: userId, status: 'Verified' }),
      RescueLog.find({ responders: userId }).sort({ updatedAt: -1 }).limit(20)
    ]);

    res.json({
      nodes: verified * 25 + completed * 10,
      completed,
      verified,
      requiresVerification: true,
      recentProof: logs
    });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const { city, zone } = req.query;
    const users = await User.find({}, 'name role trustScore completedTaskCount verifiedReportCount points')
      .sort({ trustScore: -1, completedTaskCount: -1 })
      .limit(30);

    res.json({
      filters: { city: city || '', zone: zone || '' },
      rescuers: users.filter((user) => ['volunteer', 'ngo', 'guardian', 'citizen'].includes(user.role)),
      vets: users.filter((user) => user.role === 'ngo'),
      shelters: []
    });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await UserSettings.findOneAndUpdate(
      { user: req.user._id },
      { $setOnInsert: { user: req.user._id } },
      { upsert: true, new: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const settings = await UserSettings.findOneAndUpdate(
      { user: req.user._id },
      { $set: { messengerSync: req.body.messengerSync || {} } },
      { upsert: true, new: true }
    );
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};
