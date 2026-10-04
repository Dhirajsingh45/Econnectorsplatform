const Task = require('../models/Task');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const RescueLog = require('../models/RescueLog');

// Haversine distance formula in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 999;
  }
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(2));
};

const getIo = (req) => req.app.get('io');

exports.findEligibleResponders = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const taskLat = task.location?.lat;
    const taskLng = task.location?.lng;

    // Find verified volunteers/NGOs/vets with location data
    const responders = await User.find({
      role: { $in: ['volunteer', 'ngo', 'vet', 'shelter'] },
      availability: 'available',
    });

    const ranked = responders.map(r => {
      const distanceKm = (r.location?.lat && r.location?.lng && taskLat && taskLng)
        ? calculateDistanceKm(taskLat, taskLng, r.location.lat, r.location.lng)
        : 5.0;

      return {
        id: r._id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        role: r.role,
        distanceKm,
        serviceRadiusKm: r.serviceRadiusKm || 10,
        vehicleAvailable: r.vehicleAvailable,
        trustScore: r.trustScore,
        withinRadius: distanceKm <= (r.serviceRadiusKm || 10)
      };
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(ranked);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to calculate eligible responders.' });
  }
};

exports.initiateDispatch = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { slaSeconds = 900 } = req.body;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const now = new Date();
    const slaExpiresAt = new Date(now.getTime() + slaSeconds * 1000);

    // Find nearby eligible responders
    const taskLat = task.location?.lat;
    const taskLng = task.location?.lng;

    const eligibleUsers = await User.find({
      role: { $in: ['volunteer', 'ngo', 'vet', 'shelter'] },
      availability: 'available',
    });

    const eligibleIds = eligibleUsers.map(u => u._id);

    task.status = 'Dispatched';
    task.dispatch.dispatchedAt = now;
    task.dispatch.slaDurationSeconds = slaSeconds;
    task.dispatch.slaExpiresAt = slaExpiresAt;
    task.dispatch.eligibleResponders = eligibleIds;
    task.dispatch.responderStatus = 'Dispatched to nearby responders';
    await task.save();

    // Create notifications for eligible responders
    for (const u of eligibleUsers) {
      await Notification.create({
        recipient: u._id,
        title: 'New Emergency Rescue Dispatch',
        message: `New ${task.urgency} rescue dispatch nearby (${task.animalType}).`,
        type: 'dispatch',
        link: `/app/tasks`
      });
    }

    await AuditLog.create({
      actor: req.user._id,
      action: 'DISPATCH_INITIATED',
      targetType: 'Task',
      targetId: taskId,
      newState: { status: 'Dispatched', slaExpiresAt }
    });

    const io = getIo(req);
    if (io) io.emit('task:dispatched', task);

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to initiate dispatch.' });
  }
};

exports.acceptDispatch = async (req, res) => {
  try {
    const { taskId } = req.params;
    const responderId = req.user._id;

    // Transactional check to prevent simultaneous claims
    const task = await Task.findOneAndUpdate(
      { 
        _id: taskId, 
        assignedTo: null, 
        status: { $in: ['Reported', 'Dispatched'] } 
      },
      {
        $set: {
          assignedTo: responderId,
          status: 'Accepted',
          'dispatch.acceptedAt': new Date(),
          'dispatch.responderStatus': 'Responder accepted case',
        }
      },
      { new: true }
    );

    if (!task) {
      return res.status(409).json({ 
        message: 'This rescue case has already been accepted by another responder or is no longer available.' 
      });
    }

    // Calculate responder distance
    const responder = await User.findById(responderId);
    if (responder?.location?.lat && task.location?.lat) {
      const dist = calculateDistanceKm(task.location.lat, task.location.lng, responder.location.lat, responder.location.lng);
      task.dispatch.responderDistanceKm = dist;
      task.dispatch.etaMinutes = Math.max(Math.round(dist * 3), 2); // 3 mins per km estimate
      await task.save();
    }

    await RescueLog.findOneAndUpdate(
      { task: task._id },
      {
        $addToSet: { responders: responderId },
        $push: {
          statusTimeline: {
            status: 'Accepted',
            actor: responderId,
            note: `${req.user.name} accepted dispatch.`
          }
        }
      }
    );

    await AuditLog.create({
      actor: responderId,
      action: 'DISPATCH_ACCEPTED',
      targetType: 'Task',
      targetId: taskId,
    });

    const io = getIo(req);
    if (io) io.emit('task:updated', task);

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to accept dispatch.' });
  }
};

// Check SLA timeouts on server (called by background job or endpoint)
exports.checkSLAExpirations = async () => {
  try {
    const now = new Date();
    const expiredTasks = await Task.find({
      status: 'Dispatched',
      assignedTo: null,
      'dispatch.slaExpiresAt': { $lt: now },
      'dispatch.escalationState': { $ne: 'expired' }
    });

    for (const t of expiredTasks) {
      // Atomic status transition prevents multi-instance duplicate execution
      const updatedTask = await Task.findOneAndUpdate(
        {
          _id: t._id,
          status: 'Dispatched',
          assignedTo: null,
          'dispatch.escalationState': { $ne: 'expired' }
        },
        {
          $set: {
            'dispatch.escalationState': 'expired',
            'dispatch.responderStatus': 'Dispatch SLA expired — Escalating to NGO network'
          }
        },
        { new: true }
      );

      if (updatedTask) {
        await RescueLog.findOneAndUpdate(
          { task: updatedTask._id },
          {
            $push: {
              statusTimeline: {
                status: 'SLA Expired',
                note: 'No responder claimed dispatch before SLA timeout. Escalated automatically.'
              }
            }
          }
        );
      }
    }
  } catch (err) {
    console.error('SLA expiration check error:', err.message);
  }
};
