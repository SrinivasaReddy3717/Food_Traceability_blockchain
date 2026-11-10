const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'tracechain_mtech_jwt_secret_2026';

/**
 * Verify JWT Bearer token and attach req.user.
 */
const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (!authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please sign in first.'
            });
        }

        const token = authHeader.slice(7).trim();
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.userId).select('-passwordHash');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid session. User no longer exists.'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please sign in again.'
        });
    }
};

/**
 * Attach req.user when a valid Bearer token is present, without blocking guests.
 */
const optionalProtect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7).trim();
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-passwordHash');
            if (user) {
                req.user = user;
            }
        }
    } catch {
        // Ignore invalid optional token and treat as guest
    }
    next();
};

/**
 * Check if authenticated user holds one of the allowed roles.
 */
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied for role "${req.user.role}". Required role: ${allowedRoles.join(' or ')}.`
            });
        }

        next();
    };
};

module.exports = {
    JWT_SECRET,
    protect,
    optionalProtect,
    authorizeRoles
};
