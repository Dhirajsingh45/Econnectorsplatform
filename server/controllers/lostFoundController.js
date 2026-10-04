const LostFoundReport = require('../models/LostFoundReport');
const Report = require('../models/Report');
const Task = require('../models/Task');
const Animal = require('../models/Animal');
const RescueLog = require('../models/RescueLog');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const mongoose = require('mongoose');
const { notifyUser, notifyMany } = require('../utils/notifyUser');


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

const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return 'Protected';
  const clean = phone.trim();
  return clean.slice(0, 3) + '••••••' + clean.slice(-2);
};

// POST /api/lost-found - Create Lost, Found, or Sighting report
exports.createReport = async (req, res) => {
  try {
    const { 
      type, 
      species, 
      petName, 
      photos, 
      attributes, 
      lastSeenLocation, 
      contactName, 
      contactPhone, 
      isPhonePublic,
      identifyingMarks, 
      circumstances,
      targetReportId 
    } = req.body;

    if (!type || !species || !lastSeenLocation || !contactName || !contactPhone) {
      return res.status(400).json({ message: 'Type (LOST/FOUND/SIGHTING), species, location, and contact information are required.' });
    }

    // If this is a sighting attached to a specific existing lost report
    if (type === 'SIGHTING' && targetReportId) {
      const parentReport = await LostFoundReport.findOne({
        $or: [{ _id: mongoose.isValidObjectId(targetReportId) ? targetReportId : null }, { reportId: targetReportId }]
      });

      if (parentReport) {
        parentReport.sightings.push({
          location: lastSeenLocation,
          sightedAt: new Date(),
          notes: circumstances || identifyingMarks || 'Community sighting reported',
          photo: photos?.[0] || '',
          direction: attributes?.sightingDirection || '',
          reportedBy: req.user._id
        });
        await parentReport.save();

        await AuditLog.create({
          actor: req.user._id,
          action: 'LOST_PET_SIGHTING_ADDED',
          targetType: 'LostFoundReport',
          targetId: parentReport._id.toString(),
        });

        // Notify the original reporter that someone spotted their pet
        if (parentReport.createdBy && parentReport.createdBy.toString() !== req.user._id.toString()) {
          await notifyUser(req, {
            recipient: parentReport.createdBy,
            title: '👀 Sighting Reported for Your Pet!',
            message: `Someone just reported a sighting near ${lastSeenLocation.area || lastSeenLocation.city || 'your area'} that may match your ${parentReport.species || 'pet'} listing (${parentReport.reportId}).`,
            type: 'lost_found',
            link: `/lost-found/${parentReport._id}`,
          });
        }

        return res.status(201).json({ 
          message: 'Sighting successfully attached to existing report.', 
          report: parentReport 
        });
      }
    }

    const report = await LostFoundReport.create({
      type,
      species: species.toLowerCase(),
      petName: petName || '',
      photos: photos || [],
      attributes: attributes || {},
      lastSeenLocation: {
        lat: Number(lastSeenLocation.lat),
        lng: Number(lastSeenLocation.lng),
        address: lastSeenLocation.address || '',
        area: lastSeenLocation.area || '',
        city: lastSeenLocation.city || '',
        approximateOnly: true
      },
      lastSeenTime: req.body.lastSeenTime ? new Date(req.body.lastSeenTime) : new Date(),
      contactName,
      contactPhone,
      isPhonePublic: Boolean(isPhonePublic),
      identifyingMarks: identifyingMarks || attributes?.distinctiveFeatures || '',
      circumstances: circumstances || '',
      createdBy: req.user._id
    });

    await AuditLog.create({
      actor: req.user._id,
      action: `LOST_FOUND_${type}_CREATED`,
      targetType: 'LostFoundReport',
      targetId: report._id.toString(),
      metadata: { reportId: report.reportId, species, city: lastSeenLocation.city }
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Create LostFound error:', error);
    res.status(500).json({ message: error.message || 'Failed to create Lost/Found listing.' });
  }
};

// GET /api/lost-found - List all reports with search and filter
exports.getReports = async (req, res) => {
  try {
    const { type, species, status, search, city } = req.query;
    const filter = {};
    if (type && type !== 'ALL') filter.type = type.toUpperCase();
    if (species && species !== 'all') filter.species = species.toLowerCase();
    if (status && status !== 'ALL') filter.status = status.toUpperCase();
    if (city) filter['lastSeenLocation.city'] = new RegExp(city, 'i');
    if (search) {
      filter.$or = [
        { petName: new RegExp(search, 'i') },
        { identifyingMarks: new RegExp(search, 'i') },
        { reportId: new RegExp(search, 'i') },
        { 'attributes.breed': new RegExp(search, 'i') }
      ];
    }

    const reports = await LostFoundReport.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    // Apply safe contact privacy masking for public viewers
    const isAuthedUser = !!req.user;
    const sanitized = reports.map(r => {
      const obj = r.toObject();
      const isOwner = req.user && r.createdBy?._id?.toString() === req.user._id.toString();
      const isPrivileged = req.user && ['admin', 'ngo', 'volunteer'].includes(req.user.role);
      
      if (!isOwner && !isPrivileged && !r.isPhonePublic) {
        obj.contactPhone = maskPhone(r.contactPhone);
      }
      return obj;
    });

    res.json(sanitized);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch Lost/Found listings.' });
  }
};

// GET /api/lost-found/:id - Public-safe single report page
exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await LostFoundReport.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { reportId: id }
      ]
    }).populate('createdBy', 'name email role')
      .populate('matchedReport')
      .populate('rescueTask');

    if (!report) return res.status(404).json({ message: 'Lost/Found report not found.' });

    const obj = report.toObject();
    const isOwner = req.user && report.createdBy?._id?.toString() === req.user._id.toString();
    const isPrivileged = req.user && ['admin', 'ngo', 'volunteer'].includes(req.user.role);

    if (!isOwner && !isPrivileged && !report.isPhonePublic) {
      obj.contactPhone = maskPhone(report.contactPhone);
    }

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch report.' });
  }
};

// POST /api/lost-found/:id/convert-to-rescue - Found injured animal converted to active rescue case
exports.convertToRescueCase = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await LostFoundReport.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { reportId: id }]
    });

    if (!report) return res.status(404).json({ message: 'Lost/Found report not found.' });

    if (report.rescueTask) {
      return res.status(409).json({ message: 'A rescue case has already been initiated for this animal.' });
    }

    const urgency = report.attributes?.isInjured ? 'P1 - Critical' : 'P2 - High';
    const animalDigitalId = `FAUNA-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create Animal dossier
    const animal = await Animal.create({
      animalId: animalDigitalId,
      species: report.species,
      breed: report.attributes?.breed || '',
      photographs: report.photos || [],
      location: report.lastSeenLocation,
      caregiver: req.user._id,
      status: 'reported',
      isDemo: false
    });

    // Create Citizen Report
    const rescueReport = await Report.create({
      reporter: req.user._id,
      description: `[Transferred from Found Report ${report.reportId}] ${report.attributes?.injuryDetails || report.circumstances || 'Animal found in distress requiring rescue dispatch.'}`,
      images: report.photos || [],
      location: report.lastSeenLocation,
      urgency,
      priorityLevel: 'P1',
      animalType: report.species,
      status: 'NEW',
      animal: animal._id,
      aiTriage: {
        severityScore: 85,
        priority: 'P1',
        aiExplanation: 'AI-assisted triage suggestion: Animal reported as injured/distressed by community finder. Human rescue verification required.',
        requiresImmediateResponse: true
      }
    });

    // Create Rescue Task
    const rescueTask = await Task.create({
      title: `Rescue: ${report.species.toUpperCase()} (${report.reportId})`,
      description: `Found animal emergency converted from Community Found Report ${report.reportId}. ${report.attributes?.injuryDetails || ''}`,
      animalType: report.species,
      type: 'Rescue',
      urgency: 'P1',
      report: rescueReport._id,
      animal: animal._id,
      location: report.lastSeenLocation,
      status: 'Reported',
      dispatch: {
        responderStatus: 'Awaiting dispatch'
      }
    });

    await RescueLog.create({
      task: rescueTask._id,
      report: rescueReport._id,
      animalDigitalId,
      animalType: report.species,
      zone: report.lastSeenLocation.city || report.lastSeenLocation.area || 'Metro',
      beforeImages: report.photos || [],
      statusTimeline: [{
        status: 'Reported',
        actor: req.user._id,
        note: `Generated from community found listing ${report.reportId}`
      }]
    });

    report.status = 'TRANSFERRED_TO_RESCUE';
    report.rescueTask = rescueTask._id;
    report.rescueReport = rescueReport._id;
    report.linkedAnimal = animal._id;
    await report.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'LOST_FOUND_CONVERTED_TO_RESCUE',
      targetType: 'LostFoundReport',
      targetId: report._id.toString(),
      metadata: { taskId: rescueTask._id.toString() }
    });

    res.status(201).json({
      message: 'Rescue case successfully created from found report.',
      rescueTask,
      rescueReport,
      animal
    });
  } catch (error) {
    console.error('Convert to rescue error:', error);
    res.status(500).json({ message: error.message || 'Failed to convert report to rescue case.' });
  }
};

// POST /api/lost-found/:id/reunion - Record verified pet reunion
exports.recordReunion = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, handoverLocation } = req.body;

    const report = await LostFoundReport.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { reportId: id }]
    });
    if (!report) return res.status(404).json({ message: 'Listing not found.' });

    const isOwner = report.createdBy.toString() === req.user._id.toString();
    const isPrivileged = ['ngo', 'volunteer', 'admin'].includes(req.user.role);

    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: 'Only the listing creator or authorized welfare personnel can record reunion.' });
    }

    report.status = 'REUNITED';
    report.reunion = {
      reunitedAt: new Date(),
      notes: notes || 'Pet successfully reunited with family.',
      verifiedBy: req.user._id,
      handoverLocation: handoverLocation || report.lastSeenLocation?.area || 'Report area'
    };
    await report.save();

    await AuditLog.create({
      actor: req.user._id,
      action: 'LOST_PET_REUNITED',
      targetType: 'LostFoundReport',
      targetId: report._id.toString(),
      metadata: { reportId: report.reportId }
    });

    // Notify the report creator if someone else recorded the reunion
    if (report.createdBy.toString() !== req.user._id.toString()) {
      await notifyUser(req, {
        recipient: report.createdBy,
        title: '🎉 Your Pet Has Been Reunited!',
        message: `Great news! Your ${report.species || 'pet'} listing (${report.reportId}) has been marked as REUNITED. ${notes || ''}`,
        type: 'lost_found',
        link: '/app/lost-found',
      });
    }

    res.json({ message: 'Pet reunion recorded successfully!', report });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to record reunion.' });
  }
};

// GET /api/lost-found/:id/matches - Find candidate matches with honest heuristic indicators
exports.findMatches = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await LostFoundReport.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { reportId: id }]
    });
    if (!target) return res.status(404).json({ message: 'Listing not found.' });

    const oppositeType = target.type === 'LOST' ? 'FOUND' : 'LOST';
    const candidates = await LostFoundReport.find({
      type: oppositeType,
      species: target.species,
      status: { $in: ['ACTIVE', 'POSSIBLE_MATCH'] }
    });

    const matches = candidates.map(c => {
      const distKm = calculateDistanceKm(
        target.lastSeenLocation.lat,
        target.lastSeenLocation.lng,
        c.lastSeenLocation.lat,
        c.lastSeenLocation.lng
      );

      const matchReasons = [];
      let matchScore = 40; // Base score for same species

      if (distKm <= 2) {
        matchScore += 30;
        matchReasons.push(`Hyperlocal proximity: within ${distKm} km`);
      } else if (distKm <= 8) {
        matchScore += 15;
        matchReasons.push(`Regional proximity: within ${distKm} km`);
      }

      if (target.attributes?.primaryColor && c.attributes?.primaryColor) {
        if (target.attributes.primaryColor.toLowerCase() === c.attributes.primaryColor.toLowerCase()) {
          matchScore += 15;
          matchReasons.push(`Color match: ${target.attributes.primaryColor}`);
        }
      }

      if (target.attributes?.gender && c.attributes?.gender && target.attributes.gender === c.attributes.gender) {
        matchScore += 5;
        matchReasons.push(`Gender match: ${target.attributes.gender}`);
      }

      if (target.identifyingMarks && c.identifyingMarks) {
        matchScore += 10;
        matchReasons.push('Identifying characteristics recorded on both listings');
      }

      return {
        ...c.toObject(),
        distanceKm: distKm,
        matchScore: Math.min(matchScore, 95),
        matchExplanation: `Possible match based on report metadata: ${matchReasons.join(', ')}. (Photo similarity unavailable — AI provider not configured)`
      };
    }).filter(m => m.distanceKm <= 15).sort((a, b) => b.matchScore - a.matchScore);

    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Match calculation failed.' });
  }
};

