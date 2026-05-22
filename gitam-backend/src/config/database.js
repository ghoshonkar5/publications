const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('✅ Connected to Neon PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on database client', err);
    process.exit(-1);
});

// Auto-run migrations on startup
const runMigrations = async () => {
    try {
        // ── Publications / Conferences / Books edit tracking ──
        await pool.query(`ALTER TABLE publications ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR(255)`);
        await pool.query(`ALTER TABLE publications ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP`);

        await pool.query(`ALTER TABLE conferences ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR(255)`);
        await pool.query(`ALTER TABLE conferences ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP`);

        await pool.query(`ALTER TABLE books_chapters ADD COLUMN IF NOT EXISTS last_edited_by VARCHAR(255)`);
        await pool.query(`ALTER TABLE books_chapters ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP`);

        // ── Faculty academic profile URLs ──
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS google_scholar_url VARCHAR(500)`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS scopus_url VARCHAR(500)`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS wos_url VARCHAR(500)`);

        // ── Faculty extended profile ──
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS office_room VARCHAR(100)`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS office_hours VARCHAR(200)`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS courses_taught TEXT`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS roles TEXT`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500)`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS website_url VARCHAR(500)`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS years_of_experience INTEGER`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS profile_photo TEXT`);

        // ── WoS metrics on faculty ──
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS wos_citation_count INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS wos_h_index        INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS wos_doc_count      INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE faculty ADD COLUMN IF NOT EXISTS wos_last_synced    TIMESTAMP`);

       // ── WoS citations on publications and conferences ──
        await pool.query(`ALTER TABLE publications ADD COLUMN IF NOT EXISTS wos_citations INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE conferences  ADD COLUMN IF NOT EXISTS wos_citations INTEGER DEFAULT 0`);

        // ── Journal rankings table for Scimago quartile lookup ──
        await pool.query(`
            CREATE TABLE IF NOT EXISTS journal_rankings (
                id           SERIAL PRIMARY KEY,
                issn         VARCHAR(20),
                issn_e       VARCHAR(20),
                journal_name TEXT NOT NULL,
                year         INTEGER NOT NULL,
                quartile     VARCHAR(5),
                sjr_score    NUMERIC(10,3),
                subject_area TEXT,
                publisher    TEXT,
                country      TEXT
            )
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_journal_rankings_issn_year
            ON journal_rankings (issn, year)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_journal_rankings_name_year
            ON journal_rankings (LOWER(journal_name), year)
        `);

        console.log('✅ Database migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration error:', error.message);
    }
};

runMigrations();

module.exports = pool;