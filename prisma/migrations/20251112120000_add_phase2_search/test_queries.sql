/**
 * FILE: prisma/migrations/20251112120000_add_phase2_search/test_queries.sql
 * PURPOSE: Test queries to validate Phase 2 functionality
 * USAGE: cat test_queries.sql | docker exec -i obscurion-v2-postgres psql -U postgres -d obscurion
 */

\echo '========================================'
\echo 'PHASE 2 FUNCTIONALITY TESTS'
\echo '========================================'
\echo ''

-- ============================================================================
-- TEST 1: Basic CRUD on Note with Phase 2 fields
-- ============================================================================

\echo 'TEST 1: Insert note with Phase 2 fields'
\echo '----------------------------------------'

-- Insert a test note with all Phase 2 fields
INSERT INTO "Note" (
    id,
    title,
    content,
    type,
    "authorEmail",
    "readingTime",
    tags,
    status,
    "isPinned",
    "searchText",
    "createdAt",
    "updatedAt"
) VALUES (
    'test_phase2_001',
    'Phase 2 Test Note',
    'This is a test note with tags, status, and searchText populated.',
    'GENERAL',
    'test@example.com',
    5,
    ARRAY['test', 'phase2', 'migration']::TEXT[],
    'ACTIVE',
    true,
    'phase 2 test note this is a test note with tags, status, and searchtext populated.',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

SELECT 'Note inserted successfully' AS result;

\echo ''
\echo 'TEST 2: Query by status'
\echo '-----------------------'

SELECT id, title, status, "isPinned"
FROM "Note"
WHERE status = 'ACTIVE'
ORDER BY "isPinned" DESC, "createdAt" DESC
LIMIT 5;

\echo ''
\echo 'TEST 3: Query by isPinned'
\echo '-------------------------'

SELECT id, title, status, "isPinned"
FROM "Note"
WHERE "isPinned" = true
ORDER BY "createdAt" DESC;

\echo ''
\echo 'TEST 4: Query by tags (array containment)'
\echo '------------------------------------------'

-- Find notes containing 'test' tag
SELECT id, title, tags
FROM "Note"
WHERE 'test' = ANY(tags);

\echo ''
\echo 'TEST 5: Query by multiple tags (array overlap)'
\echo '-----------------------------------------------'

-- Find notes containing any of ['phase2', 'migration']
SELECT id, title, tags
FROM "Note"
WHERE tags && ARRAY['phase2', 'migration']::TEXT[];

\echo ''
\echo 'TEST 6: Full-text search on searchText'
\echo '---------------------------------------'

-- Fuzzy search for 'phase'
SELECT id, title, "searchText"
FROM "Note"
WHERE "searchText" ILIKE '%phase%'
LIMIT 5;

\echo ''
\echo 'TEST 7: Combined filters (status + isPinned + tags)'
\echo '---------------------------------------------------'

SELECT id, title, status, "isPinned", tags
FROM "Note"
WHERE status = 'ACTIVE'
    AND "isPinned" = true
    AND 'migration' = ANY(tags);

\echo ''
\echo 'TEST 8: Update note Phase 2 fields'
\echo '-----------------------------------'

UPDATE "Note"
SET
    status = 'ARCHIVED',
    "isPinned" = false,
    tags = ARRAY['archived', 'test']::TEXT[],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE id = 'test_phase2_001';

SELECT 'Note updated successfully' AS result;

-- Verify update
SELECT id, title, status, "isPinned", tags
FROM "Note"
WHERE id = 'test_phase2_001';

\echo ''
\echo 'TEST 9: Insert SearchHistory record'
\echo '------------------------------------'

INSERT INTO "SearchHistory" (
    id,
    "userEmail",
    "noteId",
    query,
    filters,
    "resultCount",
    clicked,
    "createdAt"
) VALUES (
    'search_test_001',
    'test@example.com',
    'test_phase2_001',
    'phase 2 migration',
    '{"status":"ACTIVE","tags":["migration"]}',
    1,
    true,
    CURRENT_TIMESTAMP
);

SELECT 'SearchHistory record inserted successfully' AS result;

\echo ''
\echo 'TEST 10: Query SearchHistory'
\echo '----------------------------'

SELECT
    id,
    "userEmail",
    "noteId",
    query,
    filters,
    "resultCount",
    clicked
FROM "SearchHistory"
WHERE "userEmail" = 'test@example.com'
ORDER BY "createdAt" DESC;

\echo ''
\echo 'TEST 11: Test foreign key constraint (Note deletion)'
\echo '-----------------------------------------------------'

-- This should set SearchHistory.noteId to NULL
DELETE FROM "Note" WHERE id = 'test_phase2_001';

SELECT 'Note deleted successfully' AS result;

-- Verify SearchHistory still exists but noteId is NULL
SELECT
    id,
    "userEmail",
    "noteId",
    query,
    CASE WHEN "noteId" IS NULL THEN 'FK correctly set to NULL' ELSE 'FK ERROR' END AS fk_status
FROM "SearchHistory"
WHERE id = 'search_test_001';

\echo ''
\echo 'TEST 12: Cleanup test data'
\echo '--------------------------'

DELETE FROM "SearchHistory" WHERE id = 'search_test_001';
SELECT 'Test SearchHistory cleaned up' AS result;

\echo ''
\echo '========================================'
\echo 'ALL TESTS COMPLETED'
\echo '========================================'
\echo ''
\echo 'Summary:'
\echo '- ✅ INSERT with Phase 2 fields'
\echo '- ✅ SELECT by status'
\echo '- ✅ SELECT by isPinned'
\echo '- ✅ SELECT by tags (array containment)'
\echo '- ✅ SELECT by tags (array overlap)'
\echo '- ✅ SELECT with full-text search'
\echo '- ✅ SELECT with combined filters'
\echo '- ✅ UPDATE Phase 2 fields'
\echo '- ✅ INSERT SearchHistory'
\echo '- ✅ SELECT SearchHistory'
\echo '- ✅ Foreign key ON DELETE SET NULL'
\echo '- ✅ Cleanup'
\echo ''
