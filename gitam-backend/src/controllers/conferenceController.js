const pool = require('../config/database');

const formatConf = (conf) => ({
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
    fileUrl: conf.file_url,
    fileName: conf.file_name,
    fileType: conf.file_type,
    lastEditedBy: conf.last_edited_by || null,
    lastEditedAt: conf.last_edited_at || null,
});

exports.getAllConferences = async (req, res) => {
    try {
        const { academicYear, facultyId, type } = req.query;
        let query = `SELECT c.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code FROM conferences c JOIN faculty f ON c.faculty_id = f.id WHERE 1=1`;
        const params = [];
        let paramCount = 1;
        if (academicYear) { query += ` AND c.academic_year = $${paramCount}`; params.push(academicYear); paramCount++; }
        if (facultyId) { query += ` AND f.faculty_id = $${paramCount}`; params.push(facultyId); paramCount++; }
        if (type) { query += ` AND c.type = $${paramCount}`; params.push(type); paramCount++; }
        query += ` ORDER BY c.date DESC`;
        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatConf) });
    } catch (error) {
        console.error('Get conferences error:', error);
        res.status(500).json({ success: false, message: 'Error fetching conferences', error: error.message });
    }
};

exports.getConferencesByFaculty = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT c.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code FROM conferences c JOIN faculty f ON c.faculty_id = f.id WHERE f.faculty_id = $1 ORDER BY c.date DESC`,
            [req.params.facultyId]
        );
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatConf) });
    } catch (error) {
        console.error('Get faculty conferences error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty conferences', error: error.message });
    }
};

exports.createConference = async (req, res) => {
    try {
        const { title, conferenceName, date, authors, type, doi, indexing, link, academicYear, host, fileUrl, fileName, fileType } = req.body;
        const facultyResult = await pool.query('SELECT id FROM faculty WHERE user_id = $1', [req.user.userId]);
        if (facultyResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Faculty profile not found' });

        const result = await pool.query(
            `INSERT INTO conferences (faculty_id, title, conference_name, date, authors, type, doi, indexing, link, academic_year, host, file_url, file_name, file_type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [facultyResult.rows[0].id, title, conferenceName, date, authors, type, doi, indexing, link, academicYear, host, fileUrl, fileName, fileType]
        );
        res.status(201).json({ success: true, message: 'Conference created successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Create conference error:', error);
        res.status(500).json({ success: false, message: 'Error creating conference', error: error.message });
    }
};

exports.updateConference = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        const fields = [], values = [];
        let paramCount = 1;

        const fieldMap = {
            title: 'title', conferenceName: 'conference_name', date: 'date',
            authors: 'authors', type: 'type', doi: 'doi', indexing: 'indexing',
            link: 'link', academicYear: 'academic_year', host: 'host',
            fileUrl: 'file_url', fileName: 'file_name', fileType: 'file_type',
            lastEditedBy: 'last_edited_by',
            lastEditedAt: 'last_edited_at',
        };

        for (const [key, dbColumn] of Object.entries(fieldMap)) {
            if (updateFields[key] !== undefined) {
                fields.push(`${dbColumn} = $${paramCount}`);
                values.push(updateFields[key]);
                paramCount++;
            }
        }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const result = await pool.query(`UPDATE conferences SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Conference not found' });
        res.json({ success: true, message: 'Conference updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Update conference error:', error);
        res.status(500).json({ success: false, message: 'Error updating conference', error: error.message });
    }
};

exports.deleteConference = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM conferences WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Conference not found' });
        res.json({ success: true, message: 'Conference deleted successfully' });
    } catch (error) {
        console.error('Delete conference error:', error);
        res.status(500).json({ success: false, message: 'Error deleting conference', error: error.message });
    }
};