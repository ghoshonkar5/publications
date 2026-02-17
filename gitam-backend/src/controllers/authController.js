
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Generate JWT Token
const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { facultyId, password } = req.body;

        // Validation
        if (!facultyId || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide faculty ID and password'
            });
        }

        // Check for admin login
        if (facultyId === 'admin') {
            // Simple admin check (you can make this more secure)
            if (password === 'admin123') {
                const token = generateToken('admin', 'admin@gitam.edu', 'admin');
                
                return res.json({
                    success: true,
                    token,
                    user: {
                        id: 'admin',
                        email: 'admin@gitam.edu',
                        role: 'admin',
                        facultyId: 'admin',
                        name: 'Administrator'
                    }
                });
            } else {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }
        }

        // Find faculty by faculty_id
        const facultyResult = await pool.query(
            'SELECT f.*, u.id as user_id, u.email, u.password_hash, u.role FROM faculty f JOIN users u ON f.user_id = u.id WHERE f.faculty_id = $1 AND u.is_active = true',
            [facultyId]
        );

        if (facultyResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const faculty = facultyResult.rows[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(password, faculty.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(faculty.user_id, faculty.email, faculty.role);

        res.json({
            success: true,
            token,
            user: {
                id: faculty.user_id,
                email: faculty.email,
                role: faculty.role,
                facultyId: faculty.faculty_id,
                name: faculty.name,
                department: faculty.department,
                designation: faculty.designation,
                mobile: faculty.mobile,
                researchArea: faculty.research_area,
                profileSetupComplete: faculty.profile_setup_complete
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const client = await pool.connect();
    
    try {
        const {
            email,
            password,
            facultyId,
            name,
            department,
            designation,
            mobile,
            researchArea
        } = req.body;

        // Validation
        if (!email || !password || !facultyId || !name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields (email, password, facultyId, name)'
            });
        }

        // Check if user exists
        const userExists = await client.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Check if faculty ID exists
        const facultyExists = await client.query(
            'SELECT * FROM faculty WHERE faculty_id = $1',
            [facultyId]
        );

        if (facultyExists.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID already registered'
            });
        }

        await client.query('BEGIN');

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, passwordHash, 'faculty']
        );

        const userId = userResult.rows[0].id;

        // Create faculty profile
        await client.query(
            `INSERT INTO faculty 
            (user_id, faculty_id, name, department, designation, mobile, research_area, profile_setup_complete)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [userId, facultyId, name, department, designation, mobile, researchArea, true]
        );

        await client.query('COMMIT');

        // Generate token
        const token = generateToken(userId, email, 'faculty');

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: userId,
                email,
                facultyId,
                name,
                role: 'faculty',
                department,
                designation,
                mobile,
                researchArea
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    } finally {
        client.release();
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        // User is attached to req by auth middleware
        const userId = req.user.userId;

        if (req.user.role === 'admin') {
            return res.json({
                success: true,
                user: {
                    id: 'admin',
                    email: 'admin@gitam.edu',
                    role: 'admin',
                    name: 'Administrator'
                }
            });
        }

        const result = await pool.query(
            'SELECT f.*, u.email, u.role FROM faculty f JOIN users u ON f.user_id = u.id WHERE f.user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const faculty = result.rows[0];

        res.json({
            success: true,
            user: {
                id: faculty.user_id,
                email: faculty.email,
                role: faculty.role,
                facultyId: faculty.faculty_id,
                name: faculty.name,
                department: faculty.department,
                designation: faculty.designation,
                mobile: faculty.mobile,
                researchArea: faculty.research_area,
                profileSetupComplete: faculty.profile_setup_complete
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user',
            error: error.message
        });
    }
};