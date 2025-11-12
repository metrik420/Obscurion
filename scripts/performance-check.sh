#!/bin/bash
# Quick performance check for Phase 2 search
# Run weekly or after significant data growth

set -e

POSTGRES_CONTAINER="obscurion-v2-postgres"
APP_CONTAINER="obscurion-v2-app"
API_URL="http://localhost:3082/api/search"

echo "=========================================="
echo "Phase 2 Search Performance Check"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

# Check containers are running
echo "Checking containers..."
docker ps --filter "name=obscurion-v2" --format "{{.Names}}: {{.Status}}" || {
    echo "Error: Containers not running"
    exit 1
}
echo ""

# Check database connection
echo "Checking database connection..."
docker exec $POSTGRES_CONTAINER psql -U postgres -d obscurion -c "SELECT 1" >/dev/null 2>&1 || {
    echo "Error: Cannot connect to database"
    exit 1
}
echo "✓ Database connection OK"
echo ""

# Get table statistics
echo "Table Statistics:"
docker exec $POSTGRES_CONTAINER psql -U postgres -d obscurion -tAc "
SELECT
    COUNT(*) as total_notes,
    pg_size_pretty(pg_total_relation_size('\"Note\"')) as total_size,
    pg_size_pretty(pg_relation_size('\"Note\"')) as table_size,
    pg_size_pretty(pg_indexes_size('\"Note\"')) as indexes_size
FROM \"Note\";
" | awk -F'|' '{
    printf "  Total Notes: %s\n", $1
    printf "  Total Size: %s\n", $2
    printf "  Table Size: %s\n", $3
    printf "  Indexes Size: %s\n", $4
}'
echo ""

# Check index usage
echo "Index Usage (GIN indexes should activate at >10K rows):"
docker exec $POSTGRES_CONTAINER psql -U postgres -d obscurion -c "
SELECT
    indexrelname as index_name,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE relname = 'Note' AND indexrelname LIKE '%_idx'
ORDER BY idx_scan DESC
LIMIT 10;
" | grep -E "(index_name|Note_)"
echo ""

# Quick API latency test (10 requests)
echo "API Latency Test (10 requests to /api/search?q=test):"
total=0
count=0
for i in {1..10}; do
    response_time=$(curl -s -o /dev/null -w '%{time_total}' "$API_URL?q=test" 2>&1)
    ms=$(echo "$response_time * 1000" | bc)
    total=$(echo "$total + $ms" | bc)
    count=$((count + 1))
    printf "  Request %2d: %6.2f ms\n" "$i" "$ms"
done

avg=$(echo "scale=2; $total / $count" | bc)
echo ""
printf "Average Response Time: %.2f ms\n" "$avg"

if (( $(echo "$avg < 50" | bc -l) )); then
    echo "✓ Average latency meets <50ms target"
else
    echo "⚠ Average latency exceeds 50ms target"
fi
echo ""

# Memory usage
echo "Container Memory Usage:"
docker stats $POSTGRES_CONTAINER $APP_CONTAINER --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}"
echo ""

# Database connections
echo "Active Database Connections:"
active_conns=$(docker exec $POSTGRES_CONTAINER psql -U postgres -d obscurion -tAc "SELECT count(*) FROM pg_stat_activity WHERE state='active';")
echo "  Active connections: $active_conns"
if [ "$active_conns" -gt 80 ]; then
    echo "  ⚠ Warning: Active connections approaching limit (max: 100)"
else
    echo "  ✓ Connection count normal"
fi
echo ""

echo "=========================================="
echo "Performance check complete"
echo "=========================================="
echo ""
echo "For detailed analysis, run:"
echo "  docker exec -i $POSTGRES_CONTAINER psql -U postgres -d obscurion -f /tmp/verify-indexes.sql"
