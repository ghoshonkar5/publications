const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// ── Format faculty user object (used in login + getMe) ──────────
const formatFacultyUser = (faculty) => ({
    id: faculty.user_id,
    email: faculty.email,
    role: faculty.role,
    facultyId: faculty.faculty_id,
    name: faculty.name,
    department: faculty.department,
    designation: faculty.designation,
    mobile: faculty.mobile,
    researchArea: faculty.research_area,
    profileSetupComplete: faculty.profile_setup_complete,
    // ✅ Academic profile URLs — dynamic per faculty
    googleScholarUrl: faculty.google_scholar_url || null,
    scopusUrl: faculty.scopus_url || null,
    wosUrl: faculty.wos_url || null,
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { facultyId, password } = req.body;

        if (!facultyId || !password) {
            return res.status(400).json({ success: false, message: 'Please provide faculty ID and password' });
        }

        // Admin login
        if (facultyId === 'admin') {
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
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        }

        // Faculty login
        const facultyResult = await pool.query(
            `SELECT f.*, u.id as user_id, u.email, u.password_hash, u.role 
             FROM faculty f 
             JOIN users u ON f.user_id = u.id 
             WHERE f.faculty_id = $1 AND u.is_active = true`,
            [facultyId]
        );

        if (facultyResult.rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const faculty = facultyResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, faculty.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(faculty.user_id, faculty.email, faculty.role);

        res.json({
            success: true,
            token,
            user: formatFacultyUser(faculty)
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password, facultyId, name, department, designation, mobile, researchArea } = req.body;

        if (!email || !password || !facultyId || !name) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields (email, password, facultyId, name)' });
        }

        const userExists = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        const facultyExists = await client.query('SELECT * FROM faculty WHERE faculty_id = $1', [facultyId]);
        if (facultyExists.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Faculty ID already registered' });
        }

        await client.query('BEGIN');

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const userResult = await client.query(
            'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, passwordHash, 'faculty']
        );

        const userId = userResult.rows[0].id;

        await client.query(
            `INSERT INTO faculty 
            (user_id, faculty_id, name, department, designation, mobile, research_area, profile_setup_complete)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [userId, facultyId, name, department, designation, mobile, researchArea, true]
        );

        await client.query('COMMIT');

        const token = generateToken(userId, email, 'faculty');

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: userId, email, facultyId, name, role: 'faculty',
                department, designation, mobile, researchArea,
                googleScholarUrl: null, scopusUrl: null, wosUrl: null,
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    } finally {
        client.release();
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const userId = req.user.userId;

        if (req.user.role === 'admin') {
            return res.json({
                success: true,
                user: { id: 'admin', email: 'admin@gitam.edu', role: 'admin', name: 'Administrator' }
            });
        }

        const result = await pool.query(
            'SELECT f.*, u.email, u.role FROM faculty f JOIN users u ON f.user_id = u.id WHERE f.user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, user: formatFacultyUser(result.rows[0]) });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Error fetching user', error: error.message });
    }
};

// @desc    Update faculty academic profile URLs
// @route   PUT /api/auth/profile-urls
// @access  Private
exports.updateProfileUrls = async (req, res) => {
    try {
        const { googleScholarUrl, scopusUrl, wosUrl } = req.body;
        const userId = req.user.userId;

        const result = await pool.query(
            `UPDATE faculty 
             SET google_scholar_url = $1, scopus_url = $2, wos_url = $3
             WHERE user_id = $4
             RETURNING *`,
            [googleScholarUrl || null, scopusUrl || null, wosUrl || null, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty not found' });
        }

        res.json({
            success: true,
            message: 'Profile URLs updated successfully',
            data: {
                googleScholarUrl: result.rows[0].google_scholar_url,
                scopusUrl: result.rows[0].scopus_url,
                wosUrl: result.rows[0].wos_url,
            }
        });

    } catch (error) {
        console.error('Update profile URLs error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile URLs', error: error.message });
    }
};