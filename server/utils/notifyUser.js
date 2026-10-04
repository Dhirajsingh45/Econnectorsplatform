/**
 * notifyUser.js — FaunaNet Notification Utility
 *
 * Sends an in-app notification to one or more users.
 * Also emits a real-time socket event if `io` is available on the Express app.
 *
 * Usage:
 *   const { notifyUser } = require('../utils/notifyUser');
 *   await notifyUser(req, { recipient: userId, title, message, type, link });
 */

const Notification = require('../models/Notification');

const VALID_TYPES = ['dispatch', 'assignment', 'escalation', 'verification', 'system', 'medical', 'foster', 'adoption', 'lost_found', 'training'];

/**
 * Create a persisted notification and push a real-time event via Socket.IO.
 *
 * @param {import('express').Request} req  - Express request (used to access `app.get('io')`)
 * @param {Object} opts
 * @param {string|mongoose.Types.ObjectId} opts.recipient  - User _id to notify
 * @param {string} opts.title     - Short notification title
 * @param {string} opts.message   - Notification body text
 * @param {string} [opts.type]    - Notification category (defaults to 'system')
 * @param {string} [opts.link]    - Optional deep-link path (e.g. '/app/adoption')
 * @returns {Promise<Object>}     - The created Notification document
 */
async function notifyUser(req, { recipient, title, message, type = 'system', link = null }) {
  if (!recipient || !title || !message) {
    console.warn('[notifyUser] Missing required fields. Notification skipped.');
    return null;
  }

  const notifType = VALID_TYPES.includes(type) ? type : 'system';

  try {
    const notification = await Notification.create({
      recipient,
      title,
      message,
      type: notifType,
      link,
    });

    // Push real-time event if Socket.IO is configured
    const io = req?.app?.get('io');
    if (io) {
      io.to(recipient.toString()).emit('notification', {
        _id: notification._id,
        title,
        message,
        type: notifType,
        link,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (err) {
    // Non-fatal — log but do not interrupt the request lifecycle
    console.error('[notifyUser] Failed to create notification:', err.message);
    return null;
  }
}

/**
 * Notify multiple recipients at once.
 *
 * @param {import('express').Request} req
 * @param {Array<string|mongoose.Types.ObjectId>} recipients
 * @param {Object} opts - Same options as notifyUser (recipient is ignored/overridden)
 */
async function notifyMany(req, recipients, opts) {
  if (!Array.isArray(recipients) || recipients.length === 0) return;
  await Promise.all(
    recipients.map((recipient) => notifyUser(req, { ...opts, recipient }))
  );
}

module.exports = { notifyUser, notifyMany };
