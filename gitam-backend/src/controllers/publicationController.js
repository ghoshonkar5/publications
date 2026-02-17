const pool = require('../config/database');

// @desc    Get all publications (with optional filters)
// @route   GET /api/publications
// @access  Private
exports.getAllPublications = async (req, res) => {
    try {
        const { academicYear, facultyId, quartile } = req.query;
        
        let query = `
            SELECT p.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code
            FROM publications p
            JOIN faculty f ON p.faculty_id = f.id
            WHERE 1=1
        `;
        
        const params = [];
        let paramCount = 1;

        // Add filters if provided
        if (academicYear) {
            query += ` AND p.academic_year = $${paramCount}`;
            params.push(academicYear);
            paramCount++;
        }

        if (facultyId) {
            query += ` AND f.faculty_id = $${paramCount}`;
            params.push(facultyId);
            paramCount++;
        }

        if (quartile) {
            query += ` AND p.quartile = $${paramCount}`;
            params.push(quartile);
            paramCount++;
        }

        query += ` ORDER BY p.created_at DESC`;

        const result = await pool.query(query, params);

        // Format the response to match your frontend interface
        const publications = result.rows.map(pub => ({
            id: pub.id.toString(),
            title: pub.title,
            journal: pub.journal,
            quartile: pub.quartile,
            impactFactor: pub.impact_factor,
            citeScore: pub.cite_score,
            wosCitations: pub.wos_citations,
            scopusCitations: pub.scopus_citations,
            googleCitations: pub.google_citations,
            authors: pub.authors,
            indexing: pub.indexing,
            areaOfPaper: pub.area_of_paper,
            apaFormat: pub.apa_format,
            positionOfAuthor: pub.position_of_author,
            volume: pub.volume,
            issue: pub.issue,
            startPage: pub.start_page,
            lastPage: pub.last_page,
            monthYear: pub.month_year,
            academicYear: pub.academic_year,
            listOfPaperFromJournal: pub.list_of_paper_from_journal,
            doi: pub.doi,
            link: pub.link,
            facultyName: pub.faculty_name,
            fileData: pub.file_url,
            fileName: pub.file_name,
            fileType: pub.file_type
        }));

        res.json({
            success: true,
            count: publications.length,
            data: publications
        });

    } catch (error) {
        console.error('Get publications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching publications',
            error: error.message
        });
    }
};

// @desc    Get publications by faculty
// @route   GET /api/publications/faculty/:facultyId
// @access  Private
exports.getPublicationsByFaculty = async (req, res) => {
    try {
        const facultyId = req.params.facultyId;

        const result = await pool.query(
            `SELECT p.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code
             FROM publications p
             JOIN faculty f ON p.faculty_id = f.id
             WHERE f.faculty_id = $1
             ORDER BY p.created_at DESC`,
            [facultyId]
        );

        const publications = result.rows.map(pub => ({
            id: pub.id.toString(),
            title: pub.title,
            journal: pub.journal,
            quartile: pub.quartile,
            impactFactor: pub.impact_factor,
            citeScore: pub.cite_score,
            wosCitations: pub.wos_citations,
            scopusCitations: pub.scopus_citations,
            googleCitations: pub.google_citations,
            authors: pub.authors,
            indexing: pub.indexing,
            areaOfPaper: pub.area_of_paper,
            apaFormat: pub.apa_format,
            positionOfAuthor: pub.position_of_author,
            volume: pub.volume,
            issue: pub.issue,
            startPage: pub.start_page,
            lastPage: pub.last_page,
            monthYear: pub.month_year,
            academicYear: pub.academic_year,
            listOfPaperFromJournal: pub.list_of_paper_from_journal,
            doi: pub.doi,
            link: pub.link,
            facultyName: pub.faculty_name,
            fileData: pub.file_url,
            fileName: pub.file_name,
            fileType: pub.file_type
        }));

        res.json({
            success: true,
            count: publications.length,
            data: publications
        });

    } catch (error) {
        console.error('Get faculty publications error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching faculty publications',
            error: error.message
        });
    }
};

// @desc    Get single publication
// @route   GET /api/publications/:id
// @access  Private
exports.getPublicationById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT p.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code
             FROM publications p
             JOIN faculty f ON p.faculty_id = f.id
             WHERE p.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Publication not found'
            });
        }

        const pub = result.rows[0];
        const publication = {
            id: pub.id.toString(),
            title: pub.title,
            journal: pub.journal,
            quartile: pub.quartile,
            impactFactor: pub.impact_factor,
            citeScore: pub.cite_score,
            wosCitations: pub.wos_citations,
            scopusCitations: pub.scopus_citations,
            googleCitations: pub.google_citations,
            authors: pub.authors,
            indexing: pub.indexing,
            areaOfPaper: pub.area_of_paper,
            apaFormat: pub.apa_format,
            positionOfAuthor: pub.position_of_author,
            volume: pub.volume,
            issue: pub.issue,
            startPage: pub.start_page,
            lastPage: pub.last_page,
            monthYear: pub.month_year,
            academicYear: pub.academic_year,
            listOfPaperFromJournal: pub.list_of_paper_from_journal,
            doi: pub.doi,
            link: pub.link,
            facultyName: pub.faculty_name,
            fileData: pub.file_url,
            fileName: pub.file_name,
            fileType: pub.file_type
        };

        res.json({
            success: true,
            data: publication
        });

    } catch (error) {
        console.error('Get publication error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching publication',
            error: error.message
        });
    }
};

// @desc    Create new publication
// @route   POST /api/publications
// @access  Private
exports.createPublication = async (req, res) => {
    try {
        const {
            title,
            journal,
            quartile,
            impactFactor,
            citeScore,
            wosCitations,
            scopusCitations,
            googleCitations,
            authors,
            indexing,
            areaOfPaper,
            apaFormat,
            positionOfAuthor,
            volume,
            issue,
            startPage,
            lastPage,
            monthYear,
            academicYear,
            listOfPaperFromJournal,
            doi,
            link,
            fileUrl,
            fileName,
            fileType
        } = req.body;

        // Get faculty_id from the logged-in user
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
            `INSERT INTO publications (
                faculty_id, title, journal, quartile, impact_factor, cite_score,
                wos_citations, scopus_citations, google_citations, authors,
                indexing, area_of_paper, apa_format, position_of_author,
                volume, issue, start_page, last_page, month_year, academic_year,
                list_of_paper_from_journal, doi, link, file_url, file_name, file_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
            RETURNING *`,
            [
                facultyId, title, journal, quartile, impactFactor, citeScore,
                wosCitations || 0, scopusCitations || 0, googleCitations || 0, authors,
                indexing, areaOfPaper, apaFormat, positionOfAuthor,
                volume, issue, startPage, lastPage, monthYear, academicYear,
                listOfPaperFromJournal, doi, link, fileUrl, fileName, fileType
            ]
        );

        const pub = result.rows[0];
        
        res.status(201).json({
            success: true,
            message: 'Publication created successfully',
            data: {
                id: pub.id.toString(),
                title: pub.title,
                journal: pub.journal,
                academicYear: pub.academic_year
            }
        });

    } catch (error) {
        console.error('Create publication error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating publication',
            error: error.message
        });
    }
};

// @desc    Update publication
// @route   PUT /api/publications/:id
// @access  Private
exports.updatePublication = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;

        // Build dynamic UPDATE query
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Map frontend field names to database column names
        const fieldMap = {
            title: 'title',
            journal: 'journal',
            quartile: 'quartile',
            impactFactor: 'impact_factor',
            citeScore: 'cite_score',
            wosCitations: 'wos_citations',
            scopusCitations: 'scopus_citations',
            googleCitations: 'google_citations',
            authors: 'authors',
            indexing: 'indexing',
            areaOfPaper: 'area_of_paper',
            apaFormat: 'apa_format',
            positionOfAuthor: 'position_of_author',
            volume: 'volume',
            issue: 'issue',
            startPage: 'start_page',
            lastPage: 'last_page',
            monthYear: 'month_year',
            academicYear: 'academic_year',
            listOfPaperFromJournal: 'list_of_paper_from_journal',
            doi: 'doi',
            link: 'link',
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

        // Add updated_at
        fields.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(id);
        const query = `
            UPDATE publications 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Publication not found'
            });
        }

        res.json({
            success: true,
            message: 'Publication updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Update publication error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating publication',
            error: error.message
        });
    }
};

// @desc    Delete publication
// @route   DELETE /api/publications/:id
// @access  Private
exports.deletePublication = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM publications WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Publication not found'
            });
        }

        res.json({
            success: true,
            message: 'Publication deleted successfully'
        });

    } catch (error) {
        console.error('Delete publication error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting publication',
            error: error.message
        });
    }
};

// @desc    Get publication statistics
// @route   GET /api/publications/stats/:facultyId
// @access  Private
exports.getPublicationStats = async (req, res) => {
    try {
        const { facultyId } = req.params;

        // Get faculty database ID
        const facultyResult = await pool.query(
            'SELECT id FROM faculty WHERE faculty_id = $1',
            [facultyId]
        );

        if (facultyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }

        const dbFacultyId = facultyResult.rows[0].id;

        // Get statistics
        const stats = await pool.query(
            `SELECT 
                COUNT(*) as total_publications,
                COUNT(CASE WHEN quartile = 'Q1' THEN 1 END) as q1_papers,
                COUNT(CASE WHEN quartile = 'Q2' THEN 1 END) as q2_papers,
                COUNT(CASE WHEN quartile = 'Q3' THEN 1 END) as q3_papers,
                COUNT(CASE WHEN quartile = 'Q4' THEN 1 END) as q4_papers,
                SUM(wos_citations) as total_wos_citations,
                SUM(scopus_citations) as total_scopus_citations,
                SUM(google_citations) as total_google_citations,
                COUNT(CASE WHEN academic_year = '2024-2025' THEN 1 END) as current_year_publications
             FROM publications 
             WHERE faculty_id = $1`,
            [dbFacultyId]
        );

        res.json({
            success: true,
            data: stats.rows[0]
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics',
            error: error.message
        });
    }
};