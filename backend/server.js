const os = require('os');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const productRoutes = require('./routes/productRoutes');
const journeyRoutes = require('./routes/journeyRoutes');
const { router: authRoutes, ensureDefaultUsers } = require('./routes/authRoutes');
const blockchainRoutes = require('./routes/blockchainRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();

app.use(cors());
app.use(express.json());

function getLanIp() {
    const interfaces = os.networkInterfaces();
    const candidates = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs || []) {
            if (addr.family === 'IPv4' && !addr.internal) {
                const isWifiOrEthernet = /wi-fi|wlan|ethernet/i.test(name);
                const isVirtual = /virtual|vmware|vbox|hyper-v|wsl|vethernet|loopback/i.test(name);
                candidates.push({
                    name,
                    address: addr.address,
                    priority: isWifiOrEthernet && !isVirtual ? 1 : !isVirtual ? 2 : 3
                });
            }
        }
    }

    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0]?.address || '127.0.0.1';
}

app.get('/', (req, res) => {
    res.json({
        message: 'Food Traceability Blockchain Backend is Running!',
        status: 'Success'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Backend server is healthy'
    });
});

app.get('/api/network-info', (req, res) => {
    const lanIp = getLanIp();
    res.json({
        success: true,
        lanIp,
        backendPort: Number(process.env.PORT || 5000)
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/feedback', feedbackRoutes);

const startServer = async () => {
    await connectDB();
    await ensureDefaultUsers();

    const PORT = process.env.PORT || 5000;
    const lanIp = getLanIp();

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Food Traceability Backend running on http://localhost:${PORT}`);
        console.log(`LAN Network API: http://${lanIp}:${PORT}/api`);
        console.log(`Auth API       : http://localhost:${PORT}/api/auth`);
        console.log(`Product API    : http://localhost:${PORT}/api/products`);
        console.log(`Journey API    : http://localhost:${PORT}/api/journey`);
        console.log(`Blockchain API : http://localhost:${PORT}/api/blockchain`);
        console.log(`Dashboard API  : http://localhost:${PORT}/api/dashboard`);
        console.log(`Feedback API   : http://localhost:${PORT}/api/feedback`);
    });
};

startServer();
