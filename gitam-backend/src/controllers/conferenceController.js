const pool = require('../config/database');

// @desc    Get all conferences
// @route   GET /api/conferences
// @access  Private
exports.getAllConferences = async (req, res) => {
    try {
        const { academicYear, facultyId, type } = req.query;
        
        let query = `
            SELECT c.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code
            FROM conferences c
            JOIN faculty f ON c.faculty_id = f.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 1;

        if (academicYear) {
            query += ` AND c.academic_year = $${paramCount}`;
            params.push(academicYear);
            paramCount++;
        }

        if (facultyId) {
            query += ` AND f.faculty_id = $${paramCount}`;
            params.push(facultyId);
            paramCount++;
        }

        if (type) {
            query += ` AND c.type = $${paramCount}`;
            params.push(type);
            paramCount++;
        }

        query += ` ORDER BY c.date DESC`;

        const result = await pool.query(query, params);

        const conferences = result.rows.map(conf => ({
            id: conf.id.toString(),
            title: conf.title,
            conferenceName: conf.conference_name,
            date: conf.date,
            authors: conf.authors,
            type: conf.type,
            doi: conf.doi,
            indexing: conf.indexing,
            link: conf.link,
            academicYear: conf.academic_year,
            host: conf.host,
            facultyName: conf.faculty_name,
            fileData: conf.file_url,
            fileName: conf.file_name,
            fileType: conf.file_type
        }));

        res.json({
            success: true,
            count: conferences.length,
            data: conferences
        });

    } catch (error) {
        console.error('Get conferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conferences',
            error: error.message
        });
    }
};

// @desc    Get conferences by faculty
// @route   GET /api/conferences/faculty/:facultyId
// @access  Private
exports.getConferencesByFaculty = async (req, res) => {
    try {
        const facultyId = req.params.facultyId;

        const result = await pool.query(
            `SELECT c.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code
             FROM conferences c
             JOIN faculty f ON c.faculty_id = f.id
             WHERE f.faculty_id = $1
             ORDER BY c.date DESC`,
            [facultyId]
        );

        const conferences = result.rows.map(conf => ({
            id: conf.id.toString(),
            title: conf.title,
            conferenceName: conf.conference_name,
            date: conf.date,
            authors: conf.authors,
            type: conf.type,
            doi: conf.doi,
            indexing: conf.indexing,
            link: conf.link,
            academicYear: conf.academic_year,
            host: conf.host,
            facultyName: conf.faculty_name,
            fileData: conf.file_url,
            fileName: conf.file_name,
            fileType: conf.file_type
        }));

        res.json({
            success: true,
            count: conferences.length,
            data: conferences
        });

    } catch (error) {
        console.error('Get faculty conferences error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching faculty conferences',
            error: error.message
        });
    }
};

// @desc    Create new conference
// @route   POST /api/conferences
// @access  Private
exports.createConference = async (req, res) => {
    try {
        const {
            title,
            conferenceName,
            date,
            authors,
            type,
            doi,
            indexing,
            link,
            academicYear,
            host,
            fileUrl,
            fileName,
            fileType
        } = req.body;

        const facultyResult = await pool.query(
            'SELECT id FROM faculty WHERE user_id = $1',
            [req.user.userId]
        );

        if (facultyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Faculty profile not found'
            });
        }

        const facultyId = facultyResult.rows[0].id;

        const result = await pool.query(
            `INSERT INTO conferences (
                faculty_id, title, conference_name, date, authors, type,
                doi, indexing, link, academic_year, host, 
                file_url, file_name, file_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                facultyId, title, conferenceName, date, authors, type,
                doi, indexing, link, academicYear, host,
                fileUrl, fileName, fileType
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Conference created successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Create conference error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating conference',
            error: error.message
        });
    }
};

// @desc    Update conference
// @route   PUT /api/conferences/:id
// @access  Private
exports.updateConference = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;

        const fields = [];
        const values = [];
        let paramCount = 1;

        const fieldMap = {
            title: 'title',
            conferenceName: 'conference_name',
            date: 'date',
            authors: 'authors',
            type: 'type',
            doi: 'doi',
            indexing: 'indexing',
            link: 'link',
            academicYear: 'academic_year',
            host: 'host',
            fileUrl: 'file_url',
            fileName: 'file_name',
            fileType: 'file_type'
        };

        for (const [key, dbColumn] of Object.entries(fieldMap)) {
            if (updateFields[key] !== undefined) {
                fields.push(`${dbColumn} = $${paramCount}`);
                values.push(updateFields[key]);
                paramCount++;
            }
        }

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE conferences 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conference not found'
            });
        }

        res.json({
            success: true,
            message: 'Conference updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update conference error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating conference',
            error: error.message
        });
    }
};

// @desc    Delete conference
// @route   DELETE /api/conferences/:id
// @access  Private
exports.deleteConference = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM conferences WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Conference not found'
            });
        }

        res.json({
            success: true,
            message: 'Conference deleted successfully'
        });

    } catch (error) {
        console.error('Delete conference error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting conference',
            error: error.message
        });
    }
};