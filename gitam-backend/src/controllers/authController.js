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
    // ✅ Academic profile URLs
    googleScholarUrl: faculty.google_scholar_url || null,
    scopusUrl: faculty.scopus_url || null,
    scopusUrl2: faculty.scopus_url_2 || null,
    scopusUrl3: faculty.scopus_url_3 || null,
    wosUrl: faculty.wos_url || null,
    // ✅ Extended profile fields
    officeRoom: faculty.office_room || null,
    officeHours: faculty.office_hours || null,
    coursesTaught: faculty.courses_taught || null,
    roles: faculty.roles || null,
    linkedinUrl: faculty.linkedin_url || null,
    websiteUrl: faculty.website_url || null,
    yearsOfExperience: faculty.years_of_experience || null,
    profilePhoto: faculty.profile_photo || null,
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
            [userId, facultyId, name, department, designation, mobile, researchArea, false]
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
                profileSetupComplete: false,
googleScholarUrl: null, scopusUrl: null, scopusUrl2: null, scopusUrl3: null, wosUrl: null,                officeRoom: null, officeHours: null, coursesTaught: null,
                roles: null, linkedinUrl: null, websiteUrl: null,
                yearsOfExperience: null, profilePhoto: null,
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

// @desc    Update faculty extended profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
    try {
        const {
            officeRoom, officeHours, coursesTaught, roles,
            linkedinUrl, websiteUrl, yearsOfExperience, profilePhoto,
            // also allow updating basic fields
            mobile, researchArea
        } = req.body;
        const userId = req.user.userId;

        const result = await pool.query(
            `UPDATE faculty 
             SET 
               office_room = COALESCE($1, office_room),
               office_hours = COALESCE($2, office_hours),
               courses_taught = COALESCE($3, courses_taught),
               roles = COALESCE($4, roles),
               linkedin_url = COALESCE($5, linkedin_url),
               website_url = COALESCE($6, website_url),
               years_of_experience = COALESCE($7, years_of_experience),
               profile_photo = COALESCE($8, profile_photo),
               mobile = COALESCE($9, mobile),
               research_area = COALESCE($10, research_area),
               profile_setup_complete = true
             WHERE user_id = $11
             RETURNING *`,
            [
                officeRoom || null,
                officeHours || null,
                coursesTaught || null,
                roles || null,
                linkedinUrl || null,
                websiteUrl || null,
                yearsOfExperience || null,
                profilePhoto || null,
                mobile || null,
                researchArea || null,
                userId
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty not found' });
        }

        // Return updated user object with all fields
        const updated = result.rows[0];
        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                officeRoom: updated.office_room,
                officeHours: updated.office_hours,
                coursesTaught: updated.courses_taught,
                roles: updated.roles,
                linkedinUrl: updated.linkedin_url,
                websiteUrl: updated.website_url,
                yearsOfExperience: updated.years_of_experience,
                profilePhoto: updated.profile_photo,
                mobile: updated.mobile,
                researchArea: updated.research_area,
                profileSetupComplete: updated.profile_setup_complete,
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile', error: error.message });
    }
};

// @desc    Update faculty academic profile URLs
// @route   PUT /api/auth/profile-urls
// @access  Private
exports.updateProfileUrls = async (req, res) => {
    try {
        const { googleScholarUrl, scopusUrl, scopusUrl2, scopusUrl3, wosUrl } = req.body;
        const userId = req.user.userId;

        const result = await pool.query(
            `UPDATE faculty 
             SET google_scholar_url = $1, scopus_url = $2, scopus_url_2 = $3,
                 scopus_url_3 = $4, wos_url = $5
             WHERE user_id = $6
             RETURNING *`,
            [
                googleScholarUrl || null,
                scopusUrl || null,
                scopusUrl2 || null,
                scopusUrl3 || null,
                wosUrl || null,
                userId
            ]
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
                scopusUrl2: result.rows[0].scopus_url_2,
                scopusUrl3: result.rows[0].scopus_url_3,
                wosUrl: result.rows[0].wos_url,
            }
        });

    } catch (error) {
        console.error('Update profile URLs error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile URLs', error: error.message });
    }
};

// @desc    Admin update any faculty profile
// @route   PUT /api/auth/admin/faculty/:id
// @access  Private (admin)
exports.adminUpdateFaculty = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, designation, department, email, mobile,
            researchArea, officeRoom, officeHours, coursesTaught,
            roles, linkedinUrl, websiteUrl, yearsOfExperience
        } = req.body;

        const result = await pool.query(
            `UPDATE faculty SET
               name = COALESCE($1, name),
               designation = COALESCE($2, designation),
               department = COALESCE($3, department),
               mobile = COALESCE($4, mobile),
               research_area = COALESCE($5, research_area),
               office_room = COALESCE($6, office_room),
               office_hours = COALESCE($7, office_hours),
               courses_taught = COALESCE($8, courses_taught),
               roles = COALESCE($9, roles),
               linkedin_url = COALESCE($10, linkedin_url),
               website_url = COALESCE($11, website_url),
               years_of_experience = COALESCE($12, years_of_experience)
             WHERE id = $13
             RETURNING *`,
            [
                name || null, designation || null, department || null,
                mobile || null, researchArea || null, officeRoom || null,
                officeHours || null, coursesTaught || null, roles || null,
                linkedinUrl || null, websiteUrl || null,
                yearsOfExperience || null, id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Faculty not found' });
        }

        // Also update email in users table if provided
        if (email) {
            await pool.query(
                `UPDATE users SET email = $1 WHERE id = (SELECT user_id FROM faculty WHERE id = $2)`,
                [email, id]
            );
        }

        res.json({ success: true, message: 'Faculty updated successfully' });

    } catch (error) {
        console.error('Admin update faculty error:', error);
        res.status(500).json({ success: false, message: 'Error updating faculty', error: error.message });
    }
};
exports.getAllFaculty = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT f.*, u.email, u.role,
                (SELECT COUNT(*) FROM publications p WHERE p.faculty_id = f.id) as publications_count,
                (SELECT COUNT(*) FROM conferences c WHERE c.faculty_id = f.id) as conferences_count,
                (SELECT COUNT(*) FROM books_chapters b WHERE b.faculty_id = f.id) as books_count
             FROM faculty f
             JOIN users u ON f.user_id = u.id
             ORDER BY f.name ASC`
        );

        const faculty = result.rows.map(f => ({
            ...formatFacultyUser({ ...f, user_id: f.user_id }),
            publicationsCount: parseInt(f.publications_count) || 0,
            conferencesCount: parseInt(f.conferences_count) || 0,
            booksCount: parseInt(f.books_count) || 0,
        }));

        res.json({ success: true, count: faculty.length, data: faculty });

    } catch (error) {
        console.error('Get all faculty error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty', error: error.message });
    }
};