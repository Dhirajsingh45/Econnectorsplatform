const User = require('../models/User');
const Report = require('../models/Report');
const Task = require('../models/Task');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');
const Organization = require('../models/Organization');

exports.getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      pendingVerifications,
      totalReports,
      activeTasks,
      totalAnimals,
      duplicateReportsCount,
      auditLogCount
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ verificationStatus: 'pending' }),
      Report.countDocuments(),
      Task.countDocuments({ status: { $in: ['Reported', 'Dispatched', 'Accepted', 'En Route', 'In Progress'] } }),
      Animal.countDocuments(),
      Report.countDocuments({ isDuplicate: true }),
      AuditLog.countDocuments()
    ]);

    res.json({
      totalUsers,
      pendingVerifications,
      totalReports,
      activeTasks,
      totalAnimals,
      duplicateReportsCount,
      auditLogCount,
      systemHealth: 'OPERATIONAL',
      dbConnected: true
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to calculate admin stats.' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { role, verificationStatus } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    const users = await User.find(filter).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch users.' });
  }
};

exports.updateUserVerification = async (req, res) => {
  try {
    const { verificationStatus, role, notes } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const prevRole = user.role;
    const prevStatus = user.verificationStatus;

    if (verificationStatus) user.verificationStatus = verificationStatus;
    if (role && ['citizen', 'volunteer', 'ngo', 'vet', 'shelter', 'admin'].includes(role)) {
      user.role = role;
    }
    if (notes) user.verificationNotes = notes;

    await user.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'ADMIN_USER_VERIFICATION_UPDATED',
      targetType: 'User',
      targetId: user._id.toString(),
      previousState: { role: prevRole, verificationStatus: prevStatus },
      newState: { role: user.role, verificationStatus: user.verificationStatus }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to update user verification.' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('actor', 'name email role')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch audit logs.' });
  }
};

exports.getDuplicateReports = async (req, res) => {
  try {
    const duplicates = await Report.find({ isDuplicate: true })
      .populate('reporter', 'name email')
      .populate('parentReport')
      .sort({ createdAt: -1 });

    res.json(duplicates);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch duplicate reports.' });
  }
};

// Demo Mode Reset: Remove only records belonging to a specific demo session
exports.resetDemoSession = async (req, res) => {
  try {
    const { demoSessionId } = req.body;

    if (!demoSessionId || typeof demoSessionId !== 'string' || !demoSessionId.startsWith('FN-DEMO-')) {
      return res.status(400).json({ message: 'Valid demoSessionId (FN-DEMO-*) is required.' });
    }

    const RescueLog = require('../models/RescueLog');
    const MedicalRecord = require('../models/MedicalRecord');
    const FosterApplication = require('../models/FosterApplication');
    const AdoptionApplication = require('../models/AdoptionApplication');
    const Notification = require('../models/Notification');

    const [reports, tasks, animals, rescueLogs, medical, foster, adoption] = await Promise.all([
      Report.deleteMany({ demoSessionId }),
      Task.deleteMany({ demoSessionId }),
      Animal.deleteMany({ demoSessionId }),
      RescueLog.deleteMany({ demoSessionId }),
      MedicalRecord.deleteMany({ demoSessionId }),
      FosterApplication.deleteMany({ demoSessionId }),
      AdoptionApplication.deleteMany({ demoSessionId })
    ]);

    await AuditLog.create({
      actor: req.user._id,
      action: 'DEMO_SESSION_RESET',
      targetType: 'System',
      targetId: demoSessionId,
      metadata: {
        reportsDeleted: reports.deletedCount,
        tasksDeleted: tasks.deletedCount,
        animalsDeleted: animals.deletedCount,
        medicalDeleted: medical.deletedCount,
        fosterDeleted: foster.deletedCount,
        adoptionDeleted: adoption.deletedCount
      }
    });

    res.json({
      success: true,
      message: `Demo session ${demoSessionId} completely cleared without affecting genuine records.`,
      removed: {
        reports: reports.deletedCount,
        tasks: tasks.deletedCount,
        animals: animals.deletedCount,
        medicalRecords: medical.deletedCount,
        fosterApplications: foster.deletedCount,
        adoptionApplications: adoption.deletedCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Demo reset failed.' });
  }
};

