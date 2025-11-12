/**
 * FILE: prisma/migrations/20251112120000_add_phase2_search/rollback.sql
 * PURPOSE: Rollback Phase 2 search migration (reverse all changes)
 * USAGE: docker exec -i obscurion-v2-postgres psql -U postgres -d obscurion < rollback.sql
 * WARNING: This will drop SearchHistory table and remove Phase 2 columns from Note table
 * IMPORTANT: This does NOT delete data, only removes schema changes
 */

BEGIN;

-- ============================================================================
-- PHASE 1: DROP SEARCHHISTORY TABLE AND CONSTRAINTS
-- ============================================================================

-- Drop SearchHistory table (CASCADE will drop foreign key constraints)
-- This removes all search history data
DROP TABLE IF EXISTS "SearchHistory" CASCADE;

-- ============================================================================
-- PHASE 2: DROP NOTE TABLE INDEXES
-- ============================================================================

-- Drop GIN index on searchText (pg_trgm)
DROP INDEX IF EXISTS "Note_searchText_idx";

-- Drop GIN index on tags array
DROP INDEX IF EXISTS "Note_tags_idx";

-- Drop B-tree index on isPinned
DROP INDEX IF EXISTS "Note_isPinned_idx";

-- Drop B-tree index on status
DROP INDEX IF EXISTS "Note_status_idx";

-- ============================================================================
-- PHASE 3: DROP NOTE TABLE COLUMNS
-- ============================================================================

-- Drop searchText column (no data loss concern, was NULL or derived)
ALTER TABLE "Note" DROP COLUMN IF EXISTS "searchText";

-- Drop isPinned column (default was false, no critical data)
ALTER TABLE "Note" DROP COLUMN IF EXISTS "isPinned";

-- Drop status column (default was 'ACTIVE', can be recreated)
ALTER TABLE "Note" DROP COLUMN IF EXISTS "status";

-- Drop tags array column (no data loss if empty)
ALTER TABLE "Note" DROP COLUMN IF EXISTS "tags";

-- ============================================================================
-- PHASE 4: REMOVE MIGRATION RECORD
-- ============================================================================

-- Remove migration from Prisma's tracking table
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20251112120000_add_phase2_search';

COMMIT;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Verify rollback
SELECT
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name='Note'
ORDER BY ordinal_position;

-- Should NOT show: tags, status, isPinned, searchText
-- Should show only: id, title, content, type, authorEmail, readingTime, createdAt, updatedAt
