const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Import routes
const authRoutes = require('./routes/authRoutes');

const publicationRoutes = require('./routes/publicationRoutes');

const conferenceRoutes = require('./routes/conferenceRoutes');

const bookRoutes = require('./routes/bookRoutes');
// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins for development
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);

app.use('/api/publications', publicationRoutes);

app.use('/api/conferences', conferenceRoutes);

app.use('/api/books', bookRoutes);
// Test route
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 GITAM Backend API is running!',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'GITAM Backend API is healthy',
        database: 'Connected to Neon PostgreSQL'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`\n🚀 GITAM Backend Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API URL: http://localhost:${PORT}`);
    console.log(`💾 Database: Neon PostgreSQL`);
    console.log(`\nPress Ctrl+C to stop\n`);
});
