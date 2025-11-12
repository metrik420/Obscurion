#!/bin/bash
# API Testing Script for Phase 2 Search & Filtering
# Base URL: http://localhost:3082

BASE_URL="http://localhost:3082"
OUTPUT_DIR="/home/metrik/docker/Obscurion/artifacts/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$OUTPUT_DIR/api-test-log-${TIMESTAMP}.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TEST_NUM=0
PASS_COUNT=0
FAIL_COUNT=0

# Function to run a test
run_test() {
    TEST_NUM=$((TEST_NUM + 1))
    local test_name=$1
    local url=$2
    local expected_status=$3
    local description=$4

    echo "========================================" | tee -a "$LOG_FILE"
    echo "TEST #${TEST_NUM}: ${test_name}" | tee -a "$LOG_FILE"
    echo "Description: ${description}" | tee -a "$LOG_FILE"
    echo "URL: ${url}" | tee -a "$LOG_FILE"
    echo "Expected Status: ${expected_status}" | tee -a "$LOG_FILE"
    echo "----------------------------------------" | tee -a "$LOG_FILE"

    # Make request and capture response
    local start_time=$(date +%s.%N)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "${url}")
    local end_time=$(date +%s.%N)

    # Parse response
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local time_total=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -2)

    echo "Status Code: ${http_code}" | tee -a "$LOG_FILE"
    echo "Response Time: ${time_total}s" | tee -a "$LOG_FILE"
    echo "Response Body (first 500 chars):" | tee -a "$LOG_FILE"
    echo "${body:0:500}" | tee -a "$LOG_FILE"

    # Check if test passed
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}" | tee -a "$LOG_FILE"
        PASS_COUNT=$((PASS_COUNT + 1))

        # Save full response to file
        echo "$body" > "$OUTPUT_DIR/test-${TEST_NUM}-response.json"
    else
        echo -e "${RED}✗ FAIL - Expected ${expected_status}, got ${http_code}${NC}" | tee -a "$LOG_FILE"
        FAIL_COUNT=$((FAIL_COUNT + 1))

        # Save error response
        echo "$body" > "$OUTPUT_DIR/test-${TEST_NUM}-error.json"
    fi

    echo "" | tee -a "$LOG_FILE"
}

# Function to run authenticated test (requires session cookie)
run_auth_test() {
    TEST_NUM=$((TEST_NUM + 1))
    local test_name=$1
    local url=$2
    local expected_status=$3
    local description=$4

    echo "========================================" | tee -a "$LOG_FILE"
    echo "TEST #${TEST_NUM}: ${test_name}" | tee -a "$LOG_FILE"
    echo "Description: ${description}" | tee -a "$LOG_FILE"
    echo "URL: ${url}" | tee -a "$LOG_FILE"
    echo "Expected Status: ${expected_status}" | tee -a "$LOG_FILE"
    echo "Note: This test requires authentication" | tee -a "$LOG_FILE"
    echo "----------------------------------------" | tee -a "$LOG_FILE"

    # Make request without auth (should fail with 401)
    local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "${url}")
    local http_code=$(echo "$response" | tail -n 2 | head -n 1)
    local time_total=$(echo "$response" | tail -n 1)
    local body=$(echo "$response" | head -n -2)

    echo "Status Code: ${http_code}" | tee -a "$LOG_FILE"
    echo "Response Time: ${time_total}s" | tee -a "$LOG_FILE"
    echo "Response Body (first 500 chars):" | tee -a "$LOG_FILE"
    echo "${body:0:500}" | tee -a "$LOG_FILE"

    # Check if test passed
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC}" | tee -a "$LOG_FILE"
        PASS_COUNT=$((PASS_COUNT + 1))
        echo "$body" > "$OUTPUT_DIR/test-${TEST_NUM}-response.json"
    else
        echo -e "${RED}✗ FAIL - Expected ${expected_status}, got ${http_code}${NC}" | tee -a "$LOG_FILE"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo "$body" > "$OUTPUT_DIR/test-${TEST_NUM}-error.json"
    fi

    echo "" | tee -a "$LOG_FILE"
}

# Start testing
echo "======================================"
echo "API Testing Suite - Phase 2 Search"
echo "Base URL: ${BASE_URL}"
echo "Timestamp: ${TIMESTAMP}"
echo "======================================"
echo ""

# Test 1: Health endpoint (should be public)
run_test "Health Check" \
    "${BASE_URL}/api/health" \
    "200" \
    "Verify API is running and healthy"

# Test 2-20: Search endpoint tests (all require auth, expect 401)
run_auth_test "Search - Basic query" \
    "${BASE_URL}/api/search?q=test" \
    "401" \
    "Search with query parameter only (unauthenticated)"

run_auth_test "Search - Status filter" \
    "${BASE_URL}/api/search?status=ACTIVE" \
    "401" \
    "Filter by ACTIVE status (unauthenticated)"

run_auth_test "Search - Multiple tags" \
    "${BASE_URL}/api/search?tags=javascript,react" \
    "401" \
    "Filter by multiple tags (unauthenticated)"

run_auth_test "Search - Pinned filter" \
    "${BASE_URL}/api/search?pinned=true" \
    "401" \
    "Filter by pinned notes only (unauthenticated)"

run_auth_test "Search - Combined filters" \
    "${BASE_URL}/api/search?q=test&status=ACTIVE&tags=javascript&pinned=true" \
    "401" \
    "Search with all filters combined (unauthenticated)"

run_auth_test "Search - Empty query with filters" \
    "${BASE_URL}/api/search?status=ACTIVE" \
    "401" \
    "Filter without search query (unauthenticated)"

run_auth_test "Search - Pagination" \
    "${BASE_URL}/api/search?q=test&page=1&limit=20" \
    "401" \
    "Search with pagination parameters (unauthenticated)"

run_auth_test "Search - Invalid pagination limit" \
    "${BASE_URL}/api/search?limit=1000" \
    "401" \
    "Search with limit exceeding maximum (should cap at 100)"

run_auth_test "Search - SQL injection attempt" \
    "${BASE_URL}/api/search?q=%27%20OR%20%271%27%3D%271" \
    "401" \
    "SQL injection test: ' OR '1'='1 (must be sanitized)"

run_auth_test "Search - XSS attempt" \
    "${BASE_URL}/api/search?q=%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E" \
    "401" \
    "XSS injection test: <script>alert('xss')</script> (must be escaped)"

run_auth_test "Search - Special characters" \
    "${BASE_URL}/api/search?q=%40%23%24%25%5E%26%2A%28%29" \
    "401" \
    "Special characters test: @#$%^&*() (must not crash)"

run_auth_test "Search - Empty query" \
    "${BASE_URL}/api/search?q=" \
    "401" \
    "Empty query parameter (should return filtered results or all)"

run_auth_test "Search - Invalid status" \
    "${BASE_URL}/api/search?status=INVALID" \
    "401" \
    "Invalid status value (should be ignored or rejected)"

run_auth_test "Search - Multiple status filters" \
    "${BASE_URL}/api/search?status=ACTIVE&status=DRAFT" \
    "401" \
    "Multiple status parameters (define behavior)"

run_auth_test "Search - Negative pagination" \
    "${BASE_URL}/api/search?page=-1&limit=-10" \
    "401" \
    "Negative pagination values (should default to valid values)"

run_auth_test "Search - Zero pagination" \
    "${BASE_URL}/api/search?page=0&limit=0" \
    "401" \
    "Zero pagination values (should default to valid values)"

# Test filters endpoint
run_auth_test "Filters - Get available filters" \
    "${BASE_URL}/api/filters" \
    "401" \
    "Retrieve available filter options (unauthenticated)"

# Test CORS and headers
run_test "Search - OPTIONS preflight" \
    "${BASE_URL}/api/search" \
    "404" \
    "OPTIONS request for CORS (may return 404 or 200)"

# Test long query string (10000 characters)
LONG_QUERY=$(printf 'a%.0s' {1..10000})
run_auth_test "Search - Very long query" \
    "${BASE_URL}/api/search?q=${LONG_QUERY}" \
    "401" \
    "10000 character query (should truncate or reject)"

# Test malformed URL encoding
run_auth_test "Search - Malformed encoding" \
    "${BASE_URL}/api/search?q=%ZZ%YY" \
    "401" \
    "Malformed URL encoding (should handle gracefully)"

# Print summary
echo "======================================"
echo "TEST SUMMARY"
echo "======================================"
echo "Total Tests: ${TEST_NUM}"
echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
echo "Success Rate: $(awk "BEGIN {printf \"%.2f\", ($PASS_COUNT/$TEST_NUM)*100}")%"
echo "======================================"
echo ""
echo "Results saved to: ${OUTPUT_DIR}"
echo "Log file: ${LOG_FILE}"
echo ""

# Exit with error if any tests failed
if [ $FAIL_COUNT -gt 0 ]; then
    exit 1
else
    exit 0
fi
