// Protect routes — user must be logged in
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, message: 'Please log in to continue.' });
  }
  next();
};

// Optionally attach user info to req if session exists
const optionalAuth = (req, res, next) => {
  // Session userId is set during login; just pass through
  next();
};

module.exports = { requireAuth, optionalAuth };
