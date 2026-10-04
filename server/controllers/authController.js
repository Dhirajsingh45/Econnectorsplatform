const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'faunanet_secret_key_2026', { expiresIn: '30d' });
};

const formatUser = (user) => ({
  id: user._id || user.id,
  name: user.name,
  email: user.email,
  phone: user.phone || '',
  role: user.role || 'citizen',
  avatar: user.avatar || '',
  location: user.location || null,
  availability: user.availability || 'offline',
  serviceRadiusKm: user.serviceRadiusKm || 10,
  supportedAnimalTypes: user.supportedAnimalTypes || [],
  vehicleAvailable: user.vehicleAvailable || false,
  equipment: user.equipment || [],
  experience: user.experience || '',
  verificationStatus: user.verificationStatus || 'unverified',
  points: user.points || 0,
  level: user.level || 1,
  trustScore: user.trustScore || 0,
  verifiedReportCount: user.verifiedReportCount || 0,
  completedTaskCount: user.completedTaskCount || 0,
  trainingCompleted: user.trainingCompleted || [],
});

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, requestedRole, phone, location } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        code: 'DB_UNAVAILABLE',
        message: 'Database unavailable. Please try again shortly.' 
      });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // SECURITY ENFORCEMENT: Public signup defaults to citizen. 
    // Elevated roles require admin verification.
    const requested = (requestedRole || role || 'citizen').toLowerCase();
    const isPrivileged = ['volunteer', 'ngo', 'vet', 'shelter', 'admin'].includes(requested);
    const assignedRole = 'citizen';
    const verificationStatus = isPrivileged ? 'pending' : 'unverified';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      password,
      role: assignedRole,
      verificationStatus,
      verificationNotes: isPrivileged ? `Requested role: ${requested}` : '',
      location: location || null,
      level: 1,
      points: 0,
      trustScore: 0,
      verifiedReportCount: 0,
      completedTaskCount: 0,
    });

    await AuditLog.create({
      actor: user._id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: user._id.toString(),
      metadata: { email: user.email, requestedRole: requested }
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: formatUser(user),
      notice: isPrivileged ? `Account created as Citizen. Verification request submitted for ${requested.toUpperCase()} role.` : null
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Registration failed.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        code: 'DB_UNAVAILABLE',
        message: 'Database unavailable. Please try again shortly.' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user && (await user.comparePassword(password))) {
      await AuditLog.create({
        actor: user._id,
        action: 'USER_LOGIN',
        targetType: 'User',
        targetId: user._id.toString(),
      });

      res.json({
        token: generateToken(user._id),
        user: formatUser(user),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to fetch user profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { phone, avatar, location, availability, serviceRadiusKm, supportedAnimalTypes, vehicleAvailable, equipment, experience, language, theme } = req.body;

    const updates = {};
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    if (location !== undefined) updates.location = location;
    if (availability !== undefined) updates.availability = availability;
    if (serviceRadiusKm !== undefined) updates.serviceRadiusKm = Number(serviceRadiusKm);
    if (supportedAnimalTypes !== undefined) updates.supportedAnimalTypes = supportedAnimalTypes;
    if (vehicleAvailable !== undefined) updates.vehicleAvailable = Boolean(vehicleAvailable);
    if (equipment !== undefined) updates.equipment = equipment;
    if (experience !== undefined) updates.experience = experience;
    if (language !== undefined) updates.language = language;
    if (theme !== undefined) updates.theme = theme;

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true });
    res.json(formatUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Profile update failed.' });
  }
};

exports.requestRoleVerification = async (req, res) => {
  try {
    const { requestedRole, experience, organizationName, registrationNumber } = req.body;
    if (!['volunteer', 'ngo', 'vet', 'shelter'].includes(requestedRole)) {
      return res.status(400).json({ message: 'Invalid requested role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          verificationStatus: 'pending',
          verificationNotes: `Requested: ${requestedRole.toUpperCase()}. Exp: ${experience || 'N/A'}. Org: ${organizationName || 'N/A'} (${registrationNumber || 'N/A'})`
        }
      },
      { new: true }
    );

    await AuditLog.create({
      actor: req.user._id,
      action: 'ROLE_VERIFICATION_REQUESTED',
      targetType: 'User',
      targetId: req.user._id.toString(),
      metadata: { requestedRole, experience, organizationName }
    });

    res.json({ message: 'Verification application submitted for review.', user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Verification request failed.' });
  }
};
