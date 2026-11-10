const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const {
    JWT_SECRET,
    protect,
    authorizeRoles
} = require('../middleware/authMiddleware');

const router = express.Router();

const ALLOWED_ROLES = [
    'Admin',
    'Farmer',
    'Producer',
    'Processor',
    'Transporter',
    'Distributor',
    'Consumer'
];

function formatUserResponse(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization || '',
        createdAt: user.createdAt
    };
}

function generateToken(user) {
    return jwt.sign(
        {
            userId: user._id,
            role: user.role,
            email: user.email
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

/**
 * Seed default role accounts if the users collection is empty so every
 * supply-chain role can be tested immediately.
 */
async function ensureDefaultUsers() {
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
        return;
    }

    const defaultPassword = await bcrypt.hash('TraceChain@123', 10);
    const defaultUsers = [
        {
            name: 'System Admin',
            email: 'admin@tracechain.com',
            passwordHash: defaultPassword,
            role: 'Admin',
            organization: 'TraceChain Governance'
        },
        {
            name: 'Green Farm Producer',
            email: 'farmer@tracechain.com',
            passwordHash: defaultPassword,
            role: 'Farmer',
            organization: 'Green Farm'
        },
        {
            name: 'ABC Food Processing',
            email: 'processor@tracechain.com',
            passwordHash: defaultPassword,
            role: 'Processor',
            organization: 'ABC Food Processing Unit'
        },
        {
            name: 'Swift Logistics',
            email: 'transporter@tracechain.com',
            passwordHash: defaultPassword,
            role: 'Transporter',
            organization: 'Swift Cold Chain Transport'
        },
        {
            name: 'Chennai Distribution Hub',
            email: 'distributor@tracechain.com',
            passwordHash: defaultPassword,
            role: 'Distributor',
            organization: 'Chennai Distribution Centre'
        },
        {
            name: 'Demo Consumer',
            email: 'consumer@tracechain.com',
            passwordHash: defaultPassword,
            role: 'Consumer',
            organization: 'Public Consumer'
        }
    ];

    await User.insertMany(defaultUsers);
    console.log('Seeded default role accounts in MongoDB (password: TraceChain@123)');
}

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, organization } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists'
            });
        }

        const chosenRole = ALLOWED_ROLES.includes(role) ? role : 'Consumer';
        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: chosenRole,
            organization: (organization || '').trim()
        });

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Account registered successfully',
            token,
            user: formatUserResponse(user)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please enter email and password'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: formatUserResponse(user)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get currently logged-in user
router.get('/me', protect, async (req, res) => {
    res.status(200).json({
        success: true,
        user: formatUserResponse(req.user)
    });
});

// List users (Admin only)
router.get('/users', protect, authorizeRoles('Admin'), async (req, res) => {
    try {
        const users = await User.find()
            .select('-passwordHash')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users: users.map(formatUserResponse)
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = {
    router,
    ensureDefaultUsers
};

