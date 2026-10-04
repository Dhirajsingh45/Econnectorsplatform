const Report = require('../models/Report');
const Task = require('../models/Task');
const User = require('../models/User');
const RescueLog = require('../models/RescueLog');
const Animal = require('../models/Animal');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const { notifyUser, notifyMany } = require('../utils/notifyUser');


// Haversine distance formula in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 999;
  }
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

const getErrorMessage = (err) => {
  if (err.name === 'ValidationError') {
    const fields = Object.keys(err.errors);
    return `Validation failed: ${fields.join(', ')}`;
  }
  if (err.code === 11000) return 'Duplicate entry detected.';
  return err.message || 'An unexpected error occurred.';
};

const getIo = (req) => req.app.get('io');

const emitTaskUpdate = (req, task, event = 'task:updated') => {
  const io = getIo(req);
  if (io) io.emit(event, task);
};

const buildAITriage = ({ description = '', animalType = 'dog', urgency = 'P3' }) => {
  const text = `${description} ${animalType}`.toLowerCase();
  let suggestedUrgency = 'P3';
  let severityScore = 0.5;
  const injuryIndicators = [];

  if (/bleed|fracture|broken|hit|trauma|unconscious|crush/.test(text)) {
    suggestedUrgency = 'P1';
    severityScore = 0.95;
    injuryIndicators.push('Trauma / Severe Bleeding');
  } else if (/heat|dehydrat|panting|sun|exhaust/.test(text)) {
    suggestedUrgency = 'P2';
    severityScore = 0.75;
    injuryIndicators.push('Heat Exhaustion / Dehydration');
  } else if (/limp|leg|bone|cannot walk/.test(text)) {
    suggestedUrgency = 'P2';
    severityScore = 0.70;
    injuryIndicators.push('Mobility Impairment / Limb Injury');
  }

  return {
    suggestedSpecies: animalType,
    injuryIndicators,
    severityScore,
    suggestedUrgency,
    recommendedResponderType: suggestedUrgency === 'P1' ? 'Veterinary Ambulance' : 'Volunteer Rescuer',
  };
};

exports.triageReport = async (req, res) => {
  const { description, animalType, urgency } = req.body || {};
  res.json(buildAITriage({ description, animalType, urgency }));
};

exports.checkDuplicates = async (req, res) => {
  try {
    const { lat, lng, animalType } = req.body;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'Valid lat and lng required.' });
    }

    // Find active reports created in last 24 hours
    const cutOff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await Report.find({
      createdAt: { $gte: cutOff },
      status: { $nin: ['RESOLVED', 'CANCELLED', 'REJECTED'] }
    });

    const potentialDuplicates = recentReports.filter(r => {
      if (!r.location?.lat || !r.location?.lng) return false;
      const dist = calculateDistanceKm(lat, lng, r.location.lat, r.location.lng);
      return dist <= 0.5; // Within 500 meters
    }).map(r => ({
      reportId: r._id,
      description: r.description,
      animalType: r.animalType,
      createdAt: r.createdAt,
      distanceKm: calculateDistanceKm(lat, lng, r.location.lat, r.location.lng)
    }));

    res.json({
      possibleDuplicateFound: potentialDuplicates.length > 0,
      count: potentialDuplicates.length,
      potentialDuplicates
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Duplicate check failed.' });
  }
};

exports.createReport = async (req, res) => {
  try {
    const { description, images, location, urgency, animalType, isDemo, demoSessionId } = req.body;

    if (!description || description.trim().length < 5) {
      return res.status(400).json({ 
        code: 'MISSING_DESCRIPTION',
        message: 'Please describe the situation (minimum 5 characters).' 
      });
    }

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ 
        code: 'LOCATION_UNAVAILABLE',
        message: 'Location unavailable. Please enable GPS or place a pin on the map.' 
      });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        code: 'DB_UNAVAILABLE',
        message: 'Database unavailable. Please try again in a moment.' 
      });
    }

    // ── Check Duplicate Reports Algorithm ────────────────────────
    const cutOff = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours
    const nearby = await Report.find({
      createdAt: { $gte: cutOff },
      status: { $nin: ['RESOLVED', 'CANCELLED'] }
    });

    let isDuplicate = false;
    let parentReportId = null;
    for (const r of nearby) {
      if (r.location?.lat && r.location?.lng) {
        const dist = calculateDistanceKm(location.lat, location.lng, r.location.lat, r.location.lng);
        if (dist <= 0.3 && r.animalType === (animalType || 'dog')) { // 300m radius
          isDuplicate = true;
          parentReportId = r._id;
          break;
        }
      }
    }

    // ── Generate Persistent Animal Entity ─────────────────────────
    const animalDigitalId = `FAUNA-${Math.floor(100000 + Math.random() * 900000)}`;
    const animal = await Animal.create({
      animalId: animalDigitalId,
      species: animalType || 'dog',
      photographs: images || [],
      location: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || '',
        area: location.area || '',
        city: location.city || ''
      },
      caregiver: req.user._id,
      status: 'reported',
      isDemo: isDemo || false,
      demoSessionId: demoSessionId || null,
    });

    // ── Build AI Triage Output ────────────────────────────────────
    const aiTriageOutput = buildAITriage({ description, animalType, urgency });
    aiTriageOutput.animalDigitalId = animalDigitalId;

    const report = await Report.create({
      reporter: req.user._id,
      description: description.trim(),
      images: images || [],
      location,
      urgency: urgency || 'P3 - Normal',
      priorityLevel: urgency?.includes('P1') || urgency === 'Critical' ? 'P1' : urgency?.includes('P2') || urgency === 'High' ? 'P2' : 'P3',
      animalType: animalType || 'dog',
      status: isDuplicate ? 'DUPLICATE' : 'NEW',
      isDuplicate,
      parentReport: parentReportId,
      animal: animal._id,
      aiTriage: aiTriageOutput,
      humanDecision: {
        priority: urgency?.includes('P1') ? 'P1' : 'P3',
        overriddenBy: req.user._id,
        timestamp: new Date()
      },
      statusHistory: [{
        status: isDuplicate ? 'DUPLICATE' : 'NEW',
        actor: req.user._id,
        note: isDuplicate ? 'Flagged as possible duplicate of existing case.' : 'Report submitted by citizen.'
      }],
      isDemo: isDemo || false,
      demoSessionId: demoSessionId || null,
    });

    const task = await Task.create({
      title: `${(animalType || 'Animal').charAt(0).toUpperCase() + (animalType || 'Animal').slice(1)} ${urgency || 'Alert'}`,
      description: description.trim(),
      animalType: animalType || 'dog',
      type: 'Rescue',
      urgency: urgency || 'P3',
      report: report._id,
      animal: animal._id,
      location,
      status: 'Reported',
      dispatch: {
        responderStatus: 'Awaiting dispatch'
      },
      isDemo: isDemo || false,
      demoSessionId: demoSessionId || null,
    });

    await RescueLog.create({
      task: task._id,
      report: report._id,
      animalDigitalId,
      animalType: animalType || 'dog',
      zone: location?.area || location?.city || location?.state || '',
      beforeImages: images || [],
      verificationStatus: 'pending',
      statusTimeline: [{ status: 'Reported', actor: req.user._id, note: 'Emergency report created.' }],
      searchText: `${animalDigitalId} ${animalType || 'dog'} ${location?.area || ''} ${location?.city || ''}`.trim()
    });

    // ── Increment reporter stats & record audit log ───────────────
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { trustScore: 2, verifiedReportCount: 1, points: 10 }
    });

    await AuditLog.create({
      actor: req.user._id,
      action: 'REPORT_SUBMITTED',
      targetType: 'Report',
      targetId: report._id.toString(),
      metadata: { animalDigitalId, isDuplicate, parentReportId }
    });

    emitTaskUpdate(req, task, 'task:created');

    res.status(201).json({ 
      report, 
      task, 
      animal, 
      triage: aiTriageOutput, 
      isDuplicate,
      message: isDuplicate ? 'Report submitted. Flagged as potential duplicate of active case.' : 'Report submitted successfully.' 
    });
  } catch (error) {
    console.error('createReport error:', error);
    res.status(500).json({ 
      code: 'SERVER_ERROR',
      message: getErrorMessage(error) 
    });
  }
};

exports.getReports = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        code: 'DB_UNAVAILABLE',
        message: 'Database unavailable.' 
      });
    }
    const reports = await Report.find()
      .populate('reporter', 'name email phone')
      .populate('animal')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.getStats = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({ pending: 0, active: 0, verified: 0 });
    }
    const [pending, active, verified] = await Promise.all([
      Task.countDocuments({ status: 'Reported' }),
      Task.countDocuments({ status: { $in: ['In Progress', 'Accepted', 'Assigned', 'Dispatched'] } }),
      Task.countDocuments({ status: 'Verified' }),
    ]);
    res.json({ pending, active, verified });
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json([]);
    }
    const tasks = await Task.find()
      .populate('report')
      .populate('animal')
      .populate('assignedTo', 'name email phone role')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { status, message, responderDistanceKm, etaMinutes } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const prevStatus = task.status;

    if (['Accepted', 'En Route', 'In Progress'].includes(status) && !task.assignedTo) {
      task.assignedTo = req.user._id;
    }

    const now = new Date();
    if (status === 'Dispatched') {
      task.dispatch.dispatchedAt = task.dispatch.dispatchedAt || now;
      task.dispatch.responderStatus = 'Dispatch sent';
    }
    if (status === 'Accepted') {
      task.dispatch.acceptedAt = task.dispatch.acceptedAt || now;
      task.dispatch.responderStatus = 'Responder accepted';
    }
    if (status === 'En Route') {
      task.dispatch.enRouteAt = task.dispatch.enRouteAt || now;
      task.dispatch.responderStatus = 'Responder en route';
    }
    if (status === 'Stabilized') {
      task.dispatch.stabilizedAt = task.dispatch.stabilizedAt || now;
      task.dispatch.responderStatus = 'Animal stabilized';
    }

    if (typeof responderDistanceKm === 'number') task.dispatch.responderDistanceKm = responderDistanceKm;
    if (typeof etaMinutes === 'number') task.dispatch.etaMinutes = etaMinutes;

    if (req.body.checklist && typeof req.body.checklist === 'object') {
      task.checklist = {
        ...(task.checklist?.toObject ? task.checklist.toObject() : task.checklist || {}),
        ...req.body.checklist,
        updatedAt: now
      };
    }

    if (status === 'Completed') {
      task.dispatch.completedAt = now;
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { trustScore: 5, completedTaskCount: 1, points: 25 }
      });
      // Notify the reporter that their rescue was completed
      if (task.reportedBy && task.reportedBy.toString() !== req.user._id.toString()) {
        await notifyUser(req, {
          recipient: task.reportedBy,
          title: '✅ Your Rescue Report Was Completed',
          message: `The rescue task you reported (${task.taskId || task._id.toString().slice(-6)}) has been marked as Completed by a field responder.`,
          type: 'verification',
          link: `/app/rescue/${task._id}`,
        });
      }
    }

    if (status) {
      task.status = status;
    }
    await task.save();

    await RescueLog.findOneAndUpdate(
      { task: task._id },
      {
        $push: {
          statusTimeline: {
            status,
            actor: req.user._id,
            note: message || `Task moved to ${status}.`
          }
        }
      },
      { upsert: false }
    );

    await AuditLog.create({
      actor: req.user._id,
      action: 'TASK_STATUS_UPDATED',
      targetType: 'Task',
      targetId: task._id.toString(),
      previousState: { status: prevStatus },
      newState: { status }
    });

    emitTaskUpdate(req, task);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.escalateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.dispatch.escalatedAt = new Date();
    task.dispatch.escalationState = 'volunteers_notified';
    task.dispatch.responderStatus = 'Escalated to nearby volunteers';
    await task.save();

    await RescueLog.findOneAndUpdate(
      { task: task._id },
      {
        $push: {
          statusTimeline: {
            status: 'Escalated',
            actor: req.user._id,
            note: 'Nearby volunteers notified for rescue escalation.'
          }
        }
      }
    );

    await AuditLog.create({
      actor: req.user._id,
      action: 'TASK_ESCALATED',
      targetType: 'Task',
      targetId: task._id.toString(),
    });

    emitTaskUpdate(req, task, 'task:escalated');
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.addTaskMessage = async (req, res) => {
  try {
    const { text, responderDistanceKm, etaMinutes } = req.body;
    if (!text || text.trim().length < 2) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.dispatch.quickMessages.push({ text: text.trim(), author: req.user._id });
    if (typeof responderDistanceKm === 'number') task.dispatch.responderDistanceKm = responderDistanceKm;
    if (typeof etaMinutes === 'number') task.dispatch.etaMinutes = etaMinutes;
    await task.save();

    emitTaskUpdate(req, task, 'task:message');
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.verifyTask = async (req, res) => {
  try {
    if (!['ngo', 'admin', 'vet'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only Verified NGOs, Vets, or Admins can verify resolutions.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.status = 'Verified';
    task.verifiedBy = req.user._id;
    await task.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'TASK_VERIFIED',
      targetType: 'Task',
      targetId: task._id.toString(),
    });

    // Notify the assigned responder that their work was verified
    if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
      await notifyUser(req, {
        recipient: task.assignedTo,
        title: '🏆 Rescue Verified!',
        message: `Your rescue response for task ${task.taskId || task._id.toString().slice(-6)} has been officially verified. Your trust score has been updated.`,
        type: 'verification',
        link: `/app/rescue/${task._id}`,
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

exports.updateTaskChecklist = async (req, res) => {
  try {
    const { checklist } = req.body;
    if (!checklist || typeof checklist !== 'object') {
      return res.status(400).json({ message: 'Valid checklist object is required.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.checklist = {
      ...(task.checklist?.toObject ? task.checklist.toObject() : task.checklist || {}),
      ...checklist,
      updatedAt: new Date()
    };

    await task.save();
    emitTaskUpdate(req, task, 'task:checklist');
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: getErrorMessage(error) });
  }
};

