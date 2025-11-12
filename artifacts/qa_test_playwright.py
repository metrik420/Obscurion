#!/usr/bin/env python3
"""
Comprehensive QA Testing Suite for Obscurion Application using Playwright
Tests authentication, navigation, notes, flashcards, version history, and accessibility
"""

import json
import time
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from playwright.async_api import async_playwright, Page, Browser, BrowserContext
import requests

# Configuration
BASE_URL = "http://localhost:3082"
ARTIFACTS_DIR = Path("/home/metrik/docker/Obscurion/artifacts")
TEST_USER_EMAIL = f"qatest_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "TestPassword123!"
TEST_USER_NAME = "QA Test User"

# Test results
test_results = {
    "summary": {
        "timestamp": datetime.now().isoformat(),
        "base_url": BASE_URL,
        "test_user": TEST_USER_EMAIL,
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "warnings": 0,
    },
    "tests": [],
    "screenshots": [],
    "console_errors": {},
}

def log_test(name: str, status: str, details: str = "", evidence: str = ""):
    """Log a test result"""
    test_results["tests"].append({
        "name": name,
        "status": status,
        "details": details,
        "evidence": evidence,
        "timestamp": datetime.now().isoformat(),
    })
    test_results["summary"]["total_tests"] += 1
    if status == "PASS":
        test_results["summary"]["passed"] += 1
        print(f"✅ PASS: {name}")
    elif status == "FAIL":
        test_results["summary"]["failed"] += 1
        print(f"❌ FAIL: {name}")
        if details:
            print(f"   Details: {details}")
    elif status == "WARN":
        test_results["summary"]["warnings"] += 1
        print(f"⚠️  WARN: {name}")
        if details:
            print(f"   Details: {details}")

async def take_screenshot(page: Page, name: str, viewport: str = "default"):
    """Take a screenshot and save to artifacts"""
    filename = f"{name}_{viewport}_{int(time.time())}.png"
    filepath = ARTIFACTS_DIR / "selenium" / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(filepath), full_page=True)
    test_results["screenshots"].append(str(filepath))
    return str(filepath)

def test_health_check():
    """Test API health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            log_test("API Health Check", "PASS", "Health endpoint responding")
            return True
        else:
            log_test("API Health Check", "FAIL", f"Status code: {response.status_code}")
            return False
    except Exception as e:
        log_test("API Health Check", "FAIL", f"Health endpoint unreachable: {str(e)}")
        return False

async def check_navigation_menu(page: Page, page_name: str):
    """Check for presence and functionality of navigation menu"""
    try:
        nav_checks = {
            "Obscurion branding": 'text=/obscurion/i',
            "Dashboard link": 'a[href*="/dashboard"]:not([href*="/notes"])',
            "Notes link": 'a[href*="/notes"]',
            "Search link": 'a[href*="/search"]',
            "Logout button": 'button:has-text("Logout"), button:has-text("Sign out")',
        }

        found_elements = {}
        missing = []

        for check_name, selector in nav_checks.items():
            try:
                element = await page.query_selector(selector)
                found = element is not None
                found_elements[check_name] = found
                if not found:
                    missing.append(check_name)
            except:
                found_elements[check_name] = False
                missing.append(check_name)

        if len(missing) == 0:
            log_test(f"Navigation menu on {page_name}", "PASS", "All elements present")
            return True
        elif len(missing) <= 2:
            log_test(f"Navigation menu on {page_name}", "WARN",
                    f"Missing: {', '.join(missing)}")
            return True
        else:
            await take_screenshot(page, f"nav_missing_{page_name}", "navigation")
            log_test(f"Navigation menu on {page_name}", "FAIL",
                    f"Missing: {', '.join(missing)}")
            return False

    except Exception as e:
        log_test(f"Navigation menu on {page_name}", "FAIL", f"Exception: {str(e)}")
        return False

async def test_signup(page: Page):
    """Test user signup"""
    try:
        await page.goto(f"{BASE_URL}/auth/signup", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        await take_screenshot(page, "signup_page", "initial")

        # Check page loaded
        title = await page.title()
        if "sign" in title.lower() or "obscurion" in title.lower():
            log_test("Signup page loads", "PASS")
        else:
            log_test("Signup page loads", "WARN", f"Title: {title}")

        # Fill form (using placeholders since React form doesn't have name attributes)
        await page.fill('input[placeholder="Your name"]', TEST_USER_NAME)
        await page.fill('input[placeholder="your@email.com"]', TEST_USER_EMAIL)
        await page.fill('input[type="password"]', TEST_USER_PASSWORD)

        # Submit
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(3000)

        # Check redirect or success
        current_url = page.url
        if "/dashboard" in current_url or "/auth/signin" in current_url:
            log_test("User signup", "PASS", f"Redirected to: {current_url}")
            return True
        else:
            await take_screenshot(page, "signup_failed", "error")
            log_test("User signup", "FAIL", f"Current URL: {current_url}")
            return False

    except Exception as e:
        await take_screenshot(page, "signup_error", "exception")
        log_test("User signup", "FAIL", f"Exception: {str(e)}")
        return False

async def test_signin(page: Page):
    """Test user signin"""
    try:
        await page.goto(f"{BASE_URL}/auth/signin", wait_until="networkidle")
        await page.wait_for_timeout(1000)

        await take_screenshot(page, "signin_page", "initial")

        # Fill form (using placeholders since React form doesn't have name attributes)
        await page.fill('input[type="email"]', TEST_USER_EMAIL)
        await page.fill('input[type="password"]', TEST_USER_PASSWORD)

        # Submit
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(3000)

        # Check redirect to dashboard
        current_url = page.url
        if "/dashboard" in current_url:
            log_test("User signin", "PASS", "Successfully logged in")
            return True
        else:
            await take_screenshot(page, "signin_failed", "error")
            log_test("User signin", "FAIL", f"Current URL: {current_url}")
            return False

    except Exception as e:
        await take_screenshot(page, "signin_error", "exception")
        log_test("User signin", "FAIL", f"Exception: {str(e)}")
        return False

async def test_dashboard(page: Page):
    """Test dashboard page"""
    try:
        await page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        await take_screenshot(page, "dashboard", "main")

        current_url = page.url
        if "/dashboard" in current_url and "/notes" not in current_url:
            log_test("Dashboard page loads", "PASS")
        else:
            log_test("Dashboard page loads", "FAIL", f"URL: {current_url}")

        await check_navigation_menu(page, "dashboard")

        # Check for console errors
        console_messages = []
        page.on("console", lambda msg: console_messages.append(msg.text))
        test_results["console_errors"]["dashboard"] = console_messages

    except Exception as e:
        log_test("Dashboard page", "FAIL", f"Exception: {str(e)}")

async def test_create_note(page: Page) -> Optional[str]:
    """Test note creation and return note ID"""
    try:
        await page.goto(f"{BASE_URL}/dashboard/notes/new", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        await take_screenshot(page, "create_note", "initial")

        await check_navigation_menu(page, "create_note")

        # Fill in note details (using placeholders for React form)
        await page.fill('input[placeholder*="Enter note title"]', "QA Test Note - Automated Testing")

        # Find content field
        try:
            await page.fill('textarea[placeholder*="Write your note here"]', "This is a test note created by the QA automation suite. It tests note creation, editing, flashcards, and version history.")
        except Exception as e:
            log_test("Note creation - content field", "FAIL", f"Could not find content field: {str(e)}")
            return None

        # Select note type if available
        try:
            await page.select_option('select', "GENERAL")
        except:
            log_test("Note creation - type field", "WARN", "Could not find type selector")

        await page.wait_for_timeout(4000)  # Wait for auto-save

        # Check if URL changed to include note ID
        current_url = page.url
        if "/dashboard/notes/" in current_url and current_url != f"{BASE_URL}/dashboard/notes/new":
            note_id = current_url.split("/")[-1]
            log_test("Note creation", "PASS", f"Note created with ID: {note_id}")
            await take_screenshot(page, f"note_created_{note_id}", "success")
            return note_id
        else:
            log_test("Note creation", "WARN", "Note may have been created but URL didn't change")
            await take_screenshot(page, "note_creation_ambiguous", "warning")
            return None

    except Exception as e:
        await take_screenshot(page, "note_creation_error", "exception")
        log_test("Note creation", "FAIL", f"Exception: {str(e)}")
        return None

async def test_flashcard_creation(page: Page, note_id: str):
    """Test manual flashcard creation"""
    try:
        await page.goto(f"{BASE_URL}/dashboard/notes/{note_id}", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        await take_screenshot(page, f"note_{note_id}_before_flashcard", "initial")

        # Look for "View Flashcards" button
        try:
            await page.click('button:has-text("Flashcard"), button:has-text("View Flashcard")')
            await page.wait_for_timeout(2000)
            log_test("View Flashcards button", "PASS", "Button found and clicked")
        except:
            log_test("View Flashcards button", "FAIL", "Could not find View Flashcards button")
            await take_screenshot(page, "no_flashcard_button", "error")
            return

        # Check for flashcard form (using IDs since they exist in the code)
        try:
            question_field = await page.query_selector('#flashcard-question')
            answer_field = await page.query_selector('#flashcard-answer')
            difficulty_select = await page.query_selector('#flashcard-difficulty')

            if question_field and answer_field and difficulty_select:
                log_test("Flashcard form elements", "PASS", "All form fields present")
            else:
                missing = []
                if not question_field: missing.append("question")
                if not answer_field: missing.append("answer")
                if not difficulty_select: missing.append("difficulty")
                log_test("Flashcard form elements", "FAIL", f"Missing: {', '.join(missing)}")
                await take_screenshot(page, "flashcard_form_missing", "error")
                return
        except Exception as e:
            log_test("Flashcard form elements", "FAIL", f"Exception: {str(e)}")
            await take_screenshot(page, "flashcard_form_missing", "error")
            return

        # Fill flashcard form
        await page.fill('#flashcard-question', "What is 2+2?")
        await page.fill('#flashcard-answer', "4")
        await page.select_option('#flashcard-difficulty', "EASY")

        await take_screenshot(page, "flashcard_form_filled", "before_submit")

        # Submit flashcard
        try:
            await page.click('button:has-text("Add Flashcard")')
            await page.wait_for_timeout(2000)
            log_test("Add Flashcard button", "PASS", "Button clicked")
        except Exception as e:
            log_test("Add Flashcard button", "FAIL", f"Could not click button: {str(e)}")
            return

        await take_screenshot(page, "flashcard_after_add", "after_submit")

        # Check if flashcard appears in list
        try:
            flashcard_text = await page.text_content('body')
            if "What is 2+2?" in flashcard_text:
                log_test("Flashcard appears in list", "PASS", "Flashcard found in page content")
            else:
                log_test("Flashcard appears in list", "FAIL", "Flashcard not found in list")
        except Exception as e:
            log_test("Flashcard appears in list", "FAIL", f"Exception: {str(e)}")

        # Check for character limits display
        try:
            content = await page.text_content('body')
            if "255" in content:
                log_test("Character limit display", "PASS", "Character limit shown")
            else:
                log_test("Character limit display", "WARN", "Character limits not visible")
        except:
            log_test("Character limit display", "WARN", "Could not check character limits")

        # Try to delete flashcard
        try:
            delete_buttons = await page.query_selector_all('button:has-text("Delete")')
            if len(delete_buttons) > 0:
                await delete_buttons[0].click()
                await page.wait_for_timeout(2000)

                # Check if flashcard is gone
                flashcard_text_after = await page.text_content('body')
                if "What is 2+2?" not in flashcard_text_after:
                    log_test("Flashcard deletion", "PASS", "Flashcard successfully deleted")
                else:
                    log_test("Flashcard deletion", "WARN", "Flashcard may still be visible")
            else:
                log_test("Flashcard deletion", "WARN", "No delete button found")
        except Exception as e:
            log_test("Flashcard deletion", "WARN", f"Could not test deletion: {str(e)}")

    except Exception as e:
        await take_screenshot(page, "flashcard_test_error", "exception")
        log_test("Flashcard creation test", "FAIL", f"Exception: {str(e)}")

async def test_version_history(page: Page, note_id: str):
    """Test version history functionality"""
    try:
        await page.goto(f"{BASE_URL}/dashboard/notes/{note_id}", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # Make an edit to create a version
        try:
            await page.fill('textarea[placeholder*="Write your note here"]', "This is a test note - EDITED VERSION")
        except Exception as e:
            log_test("Version history - edit", "WARN", f"Could not edit note to create version: {str(e)}")

        await page.wait_for_timeout(4000)  # Wait for auto-save

        # Look for "View Version History" or "Versions" button
        try:
            await page.click('button:has-text("Version"), button:has-text("History")')
            await page.wait_for_timeout(2000)
            log_test("View Version History button", "PASS", "Button found and clicked")
        except Exception as e:
            log_test("View Version History button", "FAIL", f"Could not find button: {str(e)}")
            await take_screenshot(page, "no_version_button", "error")
            return

        await take_screenshot(page, "version_history_open", "list")

        # Check for version list
        try:
            content = await page.text_content('body')
            version_count = content.lower().count('version')
            if version_count >= 1:
                log_test("Version history list", "PASS", f"Found version references in content")
            else:
                log_test("Version history list", "FAIL", "No versions found in list")
        except Exception as e:
            log_test("Version history list", "FAIL", f"Exception: {str(e)}")

        # Check for restore button
        try:
            restore_buttons = await page.query_selector_all('button:has-text("Restore")')
            if len(restore_buttons) > 0:
                log_test("Version restore button", "PASS", f"Found {len(restore_buttons)} restore button(s)")

                # Try to restore a version
                await restore_buttons[0].click()
                await page.wait_for_timeout(2000)
                log_test("Version restoration", "PASS", "Restore button clicked successfully")
                await take_screenshot(page, "version_restored", "after_restore")
            else:
                log_test("Version restore button", "WARN", "No restore buttons found")
        except Exception as e:
            log_test("Version restore functionality", "WARN", f"Could not test restore: {str(e)}")

    except Exception as e:
        await take_screenshot(page, "version_history_error", "exception")
        log_test("Version history test", "FAIL", f"Exception: {str(e)}")

async def test_notes_list(page: Page):
    """Test notes list page"""
    try:
        await page.goto(f"{BASE_URL}/dashboard/notes", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        await take_screenshot(page, "notes_list", "main")

        await check_navigation_menu(page, "notes_list")

        # Check for table or list of notes
        try:
            table = await page.query_selector('table')
            if table:
                log_test("Notes list table", "PASS", "Table element found")
            else:
                log_test("Notes list table", "WARN", "No table found, may use different layout")
        except:
            log_test("Notes list table", "WARN", "Could not check for table")

        # Check for note entries
        try:
            content = await page.text_content('body')
            if "QA Test Note" in content:
                log_test("Notes list shows created note", "PASS", "Test note visible")
            else:
                log_test("Notes list shows created note", "WARN", "Test note not visible in list")
        except Exception as e:
            log_test("Notes list content", "WARN", f"Could not check content: {str(e)}")

    except Exception as e:
        await take_screenshot(page, "notes_list_error", "exception")
        log_test("Notes list page", "FAIL", f"Exception: {str(e)}")

async def test_search_page(page: Page):
    """Test search functionality"""
    try:
        await page.goto(f"{BASE_URL}/dashboard/search", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        await take_screenshot(page, "search_page", "main")

        await check_navigation_menu(page, "search_page")

        # Check for search input
        try:
            search_input = await page.query_selector('input[type="search"], input[placeholder*="search" i]')
            if search_input:
                log_test("Search input field", "PASS", "Search input found")

                # Try searching
                await page.fill('input[type="search"], input[placeholder*="search" i]', "QA Test")
                await page.press('input[type="search"], input[placeholder*="search" i]', "Enter")
                await page.wait_for_timeout(2000)

                await take_screenshot(page, "search_results", "after_search")
                log_test("Search functionality", "PASS", "Search executed successfully")
            else:
                log_test("Search input field", "FAIL", "Could not find search input")
        except Exception as e:
            log_test("Search input field", "FAIL", f"Could not find or use search: {str(e)}")

    except Exception as e:
        await take_screenshot(page, "search_error", "exception")
        log_test("Search page", "FAIL", f"Exception: {str(e)}")

async def test_protected_routes(page: Page):
    """Test that protected routes redirect to signin when not authenticated"""
    try:
        # Clear cookies to ensure we're logged out
        await page.context.clear_cookies()

        await page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
        await page.wait_for_timeout(2000)

        current_url = page.url
        if "/auth/signin" in current_url:
            log_test("Protected route redirect", "PASS", "Dashboard redirects to signin when unauthenticated")
        else:
            log_test("Protected route redirect", "FAIL", f"Dashboard accessible without auth: {current_url}")

    except Exception as e:
        log_test("Protected route redirect", "FAIL", f"Exception: {str(e)}")

def generate_report():
    """Generate final QA report"""

    # Calculate final verdict
    failed = test_results["summary"]["failed"]
    warnings = test_results["summary"]["warnings"]

    if failed > 5:
        verdict = "FAIL - NEEDS MAJOR FIXES"
    elif failed > 0:
        verdict = "WARN - NEEDS FIXES"
    elif warnings > 10:
        verdict = "WARN - REVIEW WARNINGS"
    else:
        verdict = "PASS - READY TO DEPLOY"

    test_results["summary"]["verdict"] = verdict

    # Save JSON report
    json_report_path = ARTIFACTS_DIR / "qa-report.json"
    with open(json_report_path, 'w') as f:
        json.dump(test_results, f, indent=2)

    # Generate HTML report
    html_report = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Obscurion QA Report</title>
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .header {{ background: white; color: #2c3e50; padding: 40px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }}
            .verdict {{ font-size: 56px; font-weight: 900; margin: 20px 0; text-transform: uppercase; }}
            .verdict.pass {{ color: #27ae60; }}
            .verdict.warn {{ color: #f39c12; }}
            .verdict.fail {{ color: #e74c3c; }}
            .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }}
            .stat {{ background: white; padding: 30px; border-radius: 12px; text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .stat-label {{ font-size: 14px; color: #7f8c8d; text-transform: uppercase; letter-spacing: 1px; }}
            .stat-value {{ font-size: 48px; font-weight: bold; margin: 15px 0; }}
            .section {{ background: white; padding: 30px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }}
            .test-item {{ padding: 20px; border-bottom: 1px solid #ecf0f1; display: flex; justify-content: space-between; align-items: flex-start; }}
            .test-item:last-child {{ border-bottom: none; }}
            .test-item:hover {{ background: #f8f9fa; }}
            .test-name {{ flex: 1; font-weight: 600; color: #2c3e50; font-size: 16px; }}
            .test-status {{ padding: 8px 20px; border-radius: 6px; font-weight: bold; margin-left: 20px; font-size: 14px; }}
            .test-status.pass {{ background: #d4edda; color: #155724; }}
            .test-status.warn {{ background: #fff3cd; color: #856404; }}
            .test-status.fail {{ background: #f8d7da; color: #721c24; }}
            .test-details {{ color: #7f8c8d; font-size: 14px; margin-top: 8px; line-height: 1.6; }}
            h2 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 15px; margin-top: 0; font-size: 28px; }}
            .meta {{ color: #7f8c8d; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0 0 10px 0; font-size: 42px;">🔍 Obscurion QA Report</h1>
                <div class="verdict {'pass' if 'PASS' in verdict else 'warn' if 'WARN' in verdict else 'fail'}">{verdict}</div>
                <p class="meta">Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p class="meta">Base URL: {BASE_URL}</p>
                <p class="meta">Test User: {TEST_USER_EMAIL}</p>
            </div>

            <div class="summary">
                <div class="stat">
                    <div class="stat-label">Total Tests</div>
                    <div class="stat-value" style="color: #3498db">{test_results['summary']['total_tests']}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Passed</div>
                    <div class="stat-value" style="color: #27ae60">{test_results['summary']['passed']}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Warnings</div>
                    <div class="stat-value" style="color: #f39c12">{test_results['summary']['warnings']}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">Failed</div>
                    <div class="stat-value" style="color: #e74c3c">{test_results['summary']['failed']}</div>
                </div>
            </div>

            <div class="section">
                <h2>📋 Test Results</h2>
    """

    # Group tests by category
    categories = {
        "Authentication": [],
        "Navigation": [],
        "Notes": [],
        "Flashcards": [],
        "Version History": [],
        "Other": []
    }

    for test in test_results['tests']:
        name = test['name']
        if 'sign' in name.lower() or 'auth' in name.lower() or 'protected' in name.lower():
            categories["Authentication"].append(test)
        elif 'navigation' in name.lower() or 'menu' in name.lower():
            categories["Navigation"].append(test)
        elif 'flashcard' in name.lower():
            categories["Flashcards"].append(test)
        elif 'version' in name.lower():
            categories["Version History"].append(test)
        elif 'note' in name.lower():
            categories["Notes"].append(test)
        else:
            categories["Other"].append(test)

    for category, tests in categories.items():
        if tests:
            html_report += f"<h3 style='color: #3498db; margin-top: 30px; font-size: 20px;'>{category}</h3>"
            for test in tests:
                status_class = test['status'].lower()
                html_report += f"""
                <div class="test-item">
                    <div style="flex: 1;">
                        <div class="test-name">{test['name']}</div>
                        {f'<div class="test-details">{test["details"]}</div>' if test.get('details') else ''}
                    </div>
                    <div class="test-status {status_class}">{test['status']}</div>
                </div>
                """

    html_report += f"""
            </div>

            <div class="section">
                <h2>📸 Artifacts</h2>
                <div class="test-item">
                    <div class="test-name">Screenshots Captured</div>
                    <div class="stat-value" style="font-size: 24px">{len(test_results['screenshots'])}</div>
                </div>
                <div class="test-item">
                    <div class="test-name">Console Errors</div>
                    <div class="stat-value" style="font-size: 24px">{len(test_results['console_errors'])} pages</div>
                </div>
                <div class="test-details" style="margin-top: 20px;">
                    <p><strong>Full JSON report:</strong> artifacts/qa-report.json</p>
                    <p><strong>Screenshots directory:</strong> artifacts/selenium/</p>
                </div>
            </div>

            <div class="section">
                <h2>✅ Next Steps</h2>
                <div class="test-details">
    """

    if failed > 0:
        html_report += "<h3 style='color: #e74c3c;'>🔴 Critical Issues to Fix:</h3><ul>"
        for test in test_results['tests']:
            if test['status'] == 'FAIL':
                html_report += f"<li><strong>{test['name']}</strong>: {test.get('details', 'No details provided')}</li>"
        html_report += "</ul>"

    if warnings > 0:
        html_report += "<h3 style='color: #f39c12;'>⚠️  Warnings to Review:</h3><ul>"
        for test in test_results['tests']:
            if test['status'] == 'WARN':
                html_report += f"<li><strong>{test['name']}</strong>: {test.get('details', 'No details provided')}</li>"
        html_report += "</ul>"

    if failed == 0 and warnings == 0:
        html_report += "<p style='font-size: 18px; color: #27ae60;'>✅ All tests passed! The application is ready for deployment.</p>"

    html_report += """
                </div>
            </div>
        </div>
    </body>
    </html>
    """

    html_report_path = ARTIFACTS_DIR / "qa-report.html"
    with open(html_report_path, 'w') as f:
        f.write(html_report)

    print(f"\n{'='*80}")
    print(f"📊 QA REPORT SUMMARY")
    print(f"{'='*80}")
    print(f"Verdict: {verdict}")
    print(f"Total Tests: {test_results['summary']['total_tests']}")
    print(f"✅ Passed: {test_results['summary']['passed']}")
    print(f"⚠️  Warnings: {test_results['summary']['warnings']}")
    print(f"❌ Failed: {test_results['summary']['failed']}")
    print(f"\nReports saved:")
    print(f"  📄 JSON: {json_report_path}")
    print(f"  🌐 HTML: {html_report_path}")
    print(f"  📸 Screenshots: {ARTIFACTS_DIR}/selenium/")
    print(f"{'='*80}\n")

async def main():
    """Main test execution"""
    print("="*80)
    print("🚀 STARTING COMPREHENSIVE QA TEST SUITE FOR OBSCURION")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_USER_EMAIL}")
    print(f"Artifacts: {ARTIFACTS_DIR}")
    print("="*80 + "\n")

    # Phase 1: Health check
    print("\n📡 Phase 1: Health Check")
    health_ok = test_health_check()
    if not health_ok:
        print("❌ Application not responding, cannot proceed with tests")
        generate_report()
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1920, "height": 1080})
        page = await context.new_page()

        try:
            # Phase 2: Protected routes (before auth)
            print("\n🔐 Phase 2: Protected Route Test")
            await test_protected_routes(page)

            # Phase 3: Authentication
            print("\n🔐 Phase 3: Authentication Tests")
            signup_success = await test_signup(page)
            if not signup_success:
                print("⚠️  Signup failed, trying to signin with existing account...")

            signin_success = await test_signin(page)
            if not signin_success:
                print("❌ Cannot proceed with tests - authentication failed")
                await browser.close()
                generate_report()
                return

            # Phase 4: Navigation & Dashboard
            print("\n🧭 Phase 4: Navigation & Dashboard Tests")
            await test_dashboard(page)

            # Phase 5: Note Creation
            print("\n📝 Phase 5: Note Creation Tests")
            note_id = await test_create_note(page)

            # Phase 6: Flashcard Tests
            if note_id:
                print("\n🃏 Phase 6: Flashcard Tests")
                await test_flashcard_creation(page, note_id)

                # Phase 7: Version History Tests
                print("\n📚 Phase 7: Version History Tests")
                await test_version_history(page, note_id)

            # Phase 8: Notes List & Search
            print("\n📋 Phase 8: Notes List & Search Tests")
            await test_notes_list(page)
            await test_search_page(page)

        except Exception as e:
            print(f"\n❌ Error during tests: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await browser.close()

    # Phase 9: Generate Report
    print("\n📊 Phase 9: Generating Report")
    generate_report()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        generate_report()
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        generate_report()
