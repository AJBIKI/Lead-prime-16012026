const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const logger = require('./logger');

// Routes
const agentRoutes = require('./routes/agents');
const leadRoutes = require('./routes/leads');
const emailRoutes = require('./routes/emails');
const authRoutes = require('./routes/auth');       // Email account OAuth
const appAuthRoutes = require('./routes/appAuth'); // App login OAuth
const campaignRoutes = require('./routes/campaigns');
const analyticsRoutes = require('./routes/analytics');
const settingsRoutes = require('./routes/settings');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true  // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// DEBUG: Log all requests
app.use((req, res, next) => {
    logger.info(`[REQUEST] ${req.method} ${req.url}`);
    logger.info(`[COOKIES] ${JSON.stringify(req.cookies)}`);
    next();
});
app.use(morgan('combined', { stream: { write: (message) => logger.http(message.trim()) } }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lead_generator')
    .then(() => logger.info('Connected to MongoDB'))
    .catch((err) => logger.error(`MongoDB Connection Error: ${err.message}`));

// Routes
app.use('/api/agents', agentRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/auth', authRoutes);          // Email account connection
app.use('/api/app-auth', appAuthRoutes);   // App login/logout
app.use('/api/campaigns', campaignRoutes); // Campaign management
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/', (req, res) => {
    res.send('Lead Generation Agency API is running');
});

// Health Check Endpoints
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/health/detailed', async (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
            aiEngine: 'unknown'
        }
    };

    // Check AI Engine
    try {
        const axios = require('axios');
        const aiResponse = await axios.get(`${process.env.AI_ENGINE_URL || 'http://localhost:8000'}/health`, { timeout: 3000 });
        health.services.aiEngine = aiResponse.data.status ? 'connected' : 'error';
    } catch (err) {
        health.services.aiEngine = 'disconnected';
    }

    // Overall status
    if (health.services.database !== 'connected') {
        health.status = 'degraded';
    }

    res.json(health);
});

// Start Server
const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        logger.info('HTTP server closed');
        mongoose.connection.close(false, () => {
            logger.info('MongoDB connection closed');
            process.exit(0);
        });
    });
});
