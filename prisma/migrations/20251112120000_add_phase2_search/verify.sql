/**
 * FILE: prisma/migrations/20251112120000_add_phase2_search/verify.sql
 * PURPOSE: Verification script for Phase 2 search migration
 * USAGE: docker exec -i obscurion-v2-postgres psql -U postgres -d obscurion < verify.sql
 */

\echo '========================================'
\echo 'PHASE 2 MIGRATION VERIFICATION'
\echo '========================================'
\echo ''

\echo '1. Verify Note table columns exist:'
\echo '------------------------------------'
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name='Note'
    AND column_name IN ('tags', 'status', 'isPinned', 'searchText')
ORDER BY column_name;

\echo ''
\echo '2. Verify SearchHistory table exists:'
\echo '--------------------------------------'
SELECT table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='SearchHistory') as column_count
FROM information_schema.tables
WHERE table_schema='public' AND table_name='SearchHistory';

\echo ''
\echo '3. Verify SearchHistory columns:'
\echo '---------------------------------'
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='SearchHistory'
ORDER BY ordinal_position;

\echo ''
\echo '4. Verify Note indexes (should show 7 indexes):'
\echo '-----------------------------------------------'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename='Note'
    AND indexname IN (
        'Note_status_idx',
        'Note_isPinned_idx',
        'Note_tags_idx',
        'Note_searchText_idx'
    )
ORDER BY indexname;

\echo ''
\echo '5. Verify SearchHistory indexes (should show 3 indexes + PK):'
\echo '-------------------------------------------------------------'
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename='SearchHistory'
ORDER BY indexname;

\echo ''
\echo '6. Verify SearchHistory foreign key constraint:'
\echo '-----------------------------------------------'
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = '"SearchHistory"'::regclass
    AND contype = 'f';

\echo ''
\echo '7. Verify data integrity (existing notes preserved):'
\echo '----------------------------------------------------'
SELECT
    COUNT(*) as total_notes,
    COUNT(CASE WHEN tags IS NOT NULL THEN 1 END) as notes_with_tags,
    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_notes,
    COUNT(CASE WHEN "isPinned" = false THEN 1 END) as unpinned_notes
FROM "Note";

\echo ''
\echo '8. Test query performance (EXPLAIN ANALYZE):'
\echo '----------------------------------------------'
\echo 'Testing status filter query:'
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, status FROM "Note" WHERE status = 'ACTIVE' LIMIT 10;

\echo ''
\echo '9. Check pg_trgm extension for full-text search:'
\echo '-------------------------------------------------'
SELECT
    extname,
    extversion,
    (SELECT setting FROM pg_settings WHERE name = 'shared_preload_libraries') as preloaded
FROM pg_extension
WHERE extname = 'pg_trgm';

\echo ''
\echo '========================================'
\echo 'VERIFICATION COMPLETE'
\echo '========================================'
\echo ''
\echo 'Expected Results:'
\echo '- Note table: 4 new columns (tags, status, isPinned, searchText)'
\echo '- SearchHistory table: 8 columns'
\echo '- Note indexes: 4 new indexes (status, isPinned, tags GIN, searchText GIN)'
\echo '- SearchHistory indexes: 3 indexes + primary key'
\echo '- Foreign key: SearchHistory.noteId -> Note.id (ON DELETE SET NULL)'
\echo '- Data integrity: All existing notes preserved with default values'
\echo '- Query performance: Indexes should be used (Index Scan, not Seq Scan)'
\echo ''
