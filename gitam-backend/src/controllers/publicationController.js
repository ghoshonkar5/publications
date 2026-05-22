const pool = require('../config/database');

const formatPub = (pub) => ({
    id: pub.id.toString(),
    title: pub.title,
    journal: pub.journal,
    quartile: pub.quartile,
    impactFactor: pub.impact_factor,
    sjrScore: pub.sjr_score,
    citeScore: pub.cite_score,
    wosCitations: pub.wos_citations,
    scopusCitations: pub.scopus_citations,
    googleCitations: pub.google_citations,
    authors: pub.authors,
    indexing: pub.indexing,
    source: pub.source || 'manual',
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
    fileUrl: pub.file_url,
    fileName: pub.file_name,
    fileType: pub.file_type,
    lastEditedBy: pub.last_edited_by || null,
    lastEditedAt: pub.last_edited_at || null,
});

exports.getAllPublications = async (req, res) => {
    try {
        const { academicYear, facultyId, quartile } = req.query;
        let query = `SELECT p.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code FROM publications p JOIN faculty f ON p.faculty_id = f.id WHERE 1=1`;
        const params = [];
        let paramCount = 1;
        if (academicYear) { query += ` AND p.academic_year = $${paramCount}`; params.push(academicYear); paramCount++; }
        if (facultyId) { query += ` AND f.faculty_id = $${paramCount}`; params.push(facultyId); paramCount++; }
        if (quartile) { query += ` AND p.quartile = $${paramCount}`; params.push(quartile); paramCount++; }
        query += ` ORDER BY p.created_at DESC`;
        const result = await pool.query(query, params);
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatPub) });
    } catch (error) {
        console.error('Get publications error:', error);
        res.status(500).json({ success: false, message: 'Error fetching publications', error: error.message });
    }
};

exports.getPublicationsByFaculty = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code FROM publications p JOIN faculty f ON p.faculty_id = f.id WHERE f.faculty_id = $1 ORDER BY p.created_at DESC`,
            [req.params.facultyId]
        );
        res.json({ success: true, count: result.rows.length, data: result.rows.map(formatPub) });
    } catch (error) {
        console.error('Get faculty publications error:', error);
        res.status(500).json({ success: false, message: 'Error fetching faculty publications', error: error.message });
    }
};

exports.getPublicationById = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, f.name as faculty_name, f.department, f.faculty_id as faculty_code FROM publications p JOIN faculty f ON p.faculty_id = f.id WHERE p.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Publication not found' });
        res.json({ success: true, data: formatPub(result.rows[0]) });
    } catch (error) {
        console.error('Get publication error:', error);
        res.status(500).json({ success: false, message: 'Error fetching publication', error: error.message });
    }
};

exports.createPublication = async (req, res) => {
    try {
        const {
            title, journal, quartile, impactFactor, citeScore,
            wosCitations, scopusCitations, googleCitations, authors,
            indexing, source, areaOfPaper, apaFormat, positionOfAuthor,
            volume, issue, startPage, lastPage, monthYear, academicYear,
            listOfPaperFromJournal, doi, link, fileUrl, fileName, fileType
} = req.body;

        const facultyResult = await pool.query('SELECT id FROM faculty WHERE user_id = $1', [req.user.userId]);
        if (facultyResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Faculty profile not found' });


const facultyDbId = facultyResult.rows[0].id;

// 1. DOI check
if (doi && doi.trim()) {
  const doiCheck = await pool.query(
    'SELECT id FROM publications WHERE faculty_id = $1 AND doi = $2',
    [facultyDbId, doi.trim()]
  );
  if (doiCheck.rows.length > 0) {
    return res.status(409).json({
      success: false,
      message: 'A publication with this DOI already exists in your portfolio.',
      duplicateId: doiCheck.rows[0].id.toString()
    });
  }
}

// 2. Title check
const titleCheck = await pool.query(
  'SELECT id, indexing FROM publications WHERE faculty_id = $1 AND LOWER(title) = LOWER($2)',
  [facultyDbId, title]
);
if (titleCheck.rows.length > 0) {
  return res.status(409).json({
    success: false,
    message: 'A publication with this title already exists in your portfolio.',
    duplicateId: titleCheck.rows[0].id.toString()
  });
}

        const result = await pool.query(
            `INSERT INTO publications (faculty_id, title, journal, quartile, impact_factor, cite_score, wos_citations, scopus_citations, google_citations, authors, indexing, source, area_of_paper, apa_format, position_of_author, volume, issue, start_page, last_page, month_year, academic_year, list_of_paper_from_journal, doi, link, file_url, file_name, file_type)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING *`,
            [
                facultyResult.rows[0].id, title, journal, quartile, impactFactor, citeScore,
                wosCitations || 0, scopusCitations || 0, googleCitations || 0,
                Array.isArray(authors) ? authors : (authors ? authors.split(',').map(a => a.trim()) : []),
                indexing, source || 'manual', areaOfPaper, apaFormat, positionOfAuthor,
                volume, issue, startPage, lastPage, monthYear, academicYear,
                listOfPaperFromJournal, doi, link, fileUrl, fileName, fileType
            ]
        );

        const pub = result.rows[0];
        res.status(201).json({ success: true, message: 'Publication created successfully', data: { id: pub.id.toString(), title: pub.title, journal: pub.journal, academicYear: pub.academic_year } });
    } catch (error) {
        console.error('Create publication error:', error);
        res.status(500).json({ success: false, message: 'Error creating publication', error: error.message });
    }
};

exports.updatePublication = async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        const fields = [], values = [];
        let paramCount = 1;

        const fieldMap = {
            title: 'title', journal: 'journal', quartile: 'quartile',
            impactFactor: 'impact_factor', sjrScore: 'sjr_score', citeScore: 'cite_score',
            wosCitations: 'wos_citations', scopusCitations: 'scopus_citations', googleCitations: 'google_citations',
            authors: 'authors', indexing: 'indexing', source: 'source', areaOfPaper: 'area_of_paper',
            apaFormat: 'apa_format', positionOfAuthor: 'position_of_author',
            volume: 'volume', issue: 'issue', startPage: 'start_page', lastPage: 'last_page',
            monthYear: 'month_year', academicYear: 'academic_year',
            listOfPaperFromJournal: 'list_of_paper_from_journal',
            doi: 'doi', link: 'link', fileUrl: 'file_url', fileName: 'file_name', fileType: 'file_type',
            lastEditedBy: 'last_edited_by',
        };

        for (const [key, dbColumn] of Object.entries(fieldMap)) {
            if (updateFields[key] !== undefined) {
                fields.push(`${dbColumn} = $${paramCount}`);
                values.push(updateFields[key]);
                paramCount++;
            }
        }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
        fields.push(`updated_at = NOW() AT TIME ZONE 'UTC'`);
        fields.push(`last_edited_at = NOW() AT TIME ZONE 'UTC'`);
        values.push(id);

        const result = await pool.query(`UPDATE publications SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Publication not found' });
        res.json({ success: true, message: 'Publication updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Update publication error:', error);
        res.status(500).json({ success: false, message: 'Error updating publication', error: error.message });
    }
};

exports.deletePublication = async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM publications WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Publication not found' });
        res.json({ success: true, message: 'Publication deleted successfully' });
    } catch (error) {
        console.error('Delete publication error:', error);
        res.status(500).json({ success: false, message: 'Error deleting publication', error: error.message });
    }
};

// ── Updated stats: counts by source instead of citations ──────────────────────
exports.getPublicationStats = async (req, res) => {
    try {
        const facultyResult = await pool.query('SELECT id FROM faculty WHERE faculty_id = $1', [req.user.userId]);
        if (facultyResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Faculty not found' });

        const stats = await pool.query(
            `SELECT
                COUNT(*) as total_publications,
                COUNT(CASE WHEN quartile = 'Q1' THEN 1 END) as q1_papers,
                COUNT(CASE WHEN quartile = 'Q2' THEN 1 END) as q2_papers,
                COUNT(CASE WHEN quartile = 'Q3' OR quartile = 'Q4' THEN 1 END) as q3_q4_papers,
                COUNT(CASE WHEN source = 'scopus' THEN 1 END) as scopus_publications,
                COUNT(CASE WHEN source = 'google_scholar' THEN 1 END) as scholar_publications,
                COUNT(CASE WHEN source = 'web_of_science' THEN 1 END) as wos_publications
             FROM publications WHERE faculty_id = $1`,
            [facultyResult.rows[0].id]
        );
        res.json({ success: true, data: stats.rows[0] });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ success: false, message: 'Error fetching statistics', error: error.message });
    }
};

// ── CSV Export endpoint ────────────────────────────────────────────────────────
exports.exportPublicationsCSV = async (req, res) => {
    try {
const { facultyId, fromYear, toYear, indexing, source, quartile, columns } = req.query;
        // Build query
        let query = `SELECT p.*, f.name as faculty_name FROM publications p JOIN faculty f ON p.faculty_id = f.id WHERE 1=1`;
const params = [];
let paramCount = 1;

if (facultyId) {
    query += ` AND f.faculty_id = $${paramCount}`;
    params.push(facultyId);
    paramCount++;
}

        if (fromYear) {
    query += ` AND NULLIF(SPLIT_PART(p.academic_year, '-', 1), '')::integer >= $${paramCount}`;
    params.push(parseInt(fromYear));
    paramCount++;
}
if (toYear) {
    query += ` AND NULLIF(SPLIT_PART(p.academic_year, '-', 1), '')::integer <= $${paramCount}`;
    params.push(parseInt(toYear));
    paramCount++;
}

        // Indexing filter — supports multi-value e.g. "Scopus,Google Scholar"
        if (indexing) {
            const indexingList = indexing.split(',').map(i => i.trim());
            const indexingConditions = indexingList.map(() => {
                const c = `p.indexing ILIKE $${paramCount}`;
                params.push(`%${indexingList[indexingList.indexOf(indexingList[paramCount - params.length + indexingList.length - 1])] || indexingList[0]}%`);
                paramCount++;
                return c;
            });
            // Simpler approach: one condition per value with OR
            // Rebuild properly:
            params.splice(params.length - indexingList.length, indexingList.length);
            paramCount -= indexingList.length;
            const orConditions = indexingList.map(idx => {
    // Normalize: treat "Web of Science" and "WoS" as the same
    const normalized = idx.toLowerCase() === 'web of science' ? 'WoS' 
                     : idx.toLowerCase() === 'wos' ? 'Web of Science' 
                     : null;
    if (normalized) {
        params.push(`%${idx}%`);
        params.push(`%${normalized}%`);
        const p1 = paramCount++;
        const p2 = paramCount++;
        return `(p.indexing ILIKE $${p1} OR p.indexing ILIKE $${p2})`;
    }
    params.push(`%${idx}%`);
    return `p.indexing ILIKE $${paramCount++}`;
});
query += ` AND (${orConditions.join(' OR ')})`;
        }

        // Quartile filter
        if (quartile) {
            const quartileList = quartile.split(',').map(q => q.trim());
            const placeholders = quartileList.map(() => `$${paramCount++}`);
            params.push(...quartileList);
            query += ` AND p.quartile IN (${placeholders.join(',')})`;
        }

        // Source filter (import origin)
        if (source) {
            const sourceList = source.split(',').map(s => s.trim());
            const placeholders = sourceList.map(() => `$${paramCount++}`);
            params.push(...sourceList);
            query += ` AND p.source IN (${placeholders.join(',')})`;
        }

        query += ` ORDER BY p.created_at DESC`;
        const result = await pool.query(query, params);

        // Column mapping: frontend key → DB/format label
        const allColumns = {
            title: 'Title',
            journal: 'Journal',
            quartile: 'Quartile',
            impactFactor: 'Impact Factor',
            sjrScore: 'SJR Score',
            citeScore: 'Cite Score',
            wosCitations: 'WoS Citations',
            scopusCitations: 'Scopus Citations',
            googleCitations: 'Google Citations',
            authors: 'Authors',
            indexing: 'Indexing',
            source: 'Source',
            areaOfPaper: 'Area of Paper',
            positionOfAuthor: 'Author Position',
            volume: 'Volume',
            issue: 'Issue',
            startPage: 'Start Page',
            lastPage: 'Last Page',
            monthYear: 'Month Year',
            academicYear: 'Academic Year',
            doi: 'DOI',
            link: 'Link',
            apaFormat: 'APA Format',
        };

        const selectedColumns = columns
            ? columns.split(',').filter(c => allColumns[c])
            : Object.keys(allColumns);

        // Build CSV
        const header = selectedColumns.map(c => allColumns[c]).join(',');
        const rows = result.rows.map(pub => {
            return selectedColumns.map(col => {
                let val = '';
                switch (col) {
                    case 'title': val = pub.title || ''; break;
                    case 'journal': val = pub.journal || ''; break;
                    case 'quartile': val = pub.quartile || ''; break;
                    case 'impactFactor': val = pub.impact_factor || ''; break;
                    case 'sjrScore': val = pub.sjr_score || ''; break;
                    case 'citeScore': val = pub.cite_score || ''; break;
                    case 'wosCitations': val = pub.wos_citations || 0; break;
                    case 'scopusCitations': val = pub.scopus_citations || 0; break;
                    case 'googleCitations': val = pub.google_citations || 0; break;
                    case 'authors': val = Array.isArray(pub.authors) ? pub.authors.join('; ') : (pub.authors || ''); break;
                    case 'indexing': val = pub.indexing || ''; break;
                    case 'source': val = pub.source || 'manual'; break;
                    case 'areaOfPaper': val = pub.area_of_paper || ''; break;
                    case 'positionOfAuthor': val = pub.position_of_author || ''; break;
                    case 'volume': val = pub.volume || ''; break;
                    case 'issue': val = pub.issue || ''; break;
                    case 'startPage': val = pub.start_page || ''; break;
                    case 'lastPage': val = pub.last_page || ''; break;
                    case 'monthYear': val = pub.month_year || ''; break;
                    case 'academicYear': val = pub.academic_year || ''; break;
                    case 'doi': val = pub.doi || ''; break;
                    case 'link': val = pub.link || ''; break;
                    case 'apaFormat': val = pub.apa_format || ''; break;
                    default: val = '';
                }
                // Escape quotes in CSV
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            }).join(',');
        });

        const csv = [header, ...rows].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="publications_export.csv"`);
        res.send(csv);
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ success: false, message: 'Error exporting publications', error: error.message });
    }
};