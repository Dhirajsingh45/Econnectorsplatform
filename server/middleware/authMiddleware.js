const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'faunanet_secret_key_2026');

      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'User not found or token invalid.' });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token verification failed.' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no bearer token provided.' });
  }
};

/**
 * Role-Based Access Control (RBAC) Guard
 * Usage: router.get('/admin', protect, authorize('admin'), handler);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required before role verification.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Role '${req.user.role}' is not authorized for this resource.` 
      });
    }
    next();
  };
};

// Dual-export pattern: supports both `const auth = require(...)` and `const { protect, authorize } = require(...)`
protect.protect = protect;
protect.authorize = authorize;
protect.restrictTo = authorize;

module.exports = protect;

