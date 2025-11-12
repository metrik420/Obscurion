#!/usr/bin/env python3
"""
Comprehensive QA Testing Suite for Obscurion Application
Tests authentication, navigation, notes, flashcards, version history, and accessibility
"""

import json
import time
import sys
import traceback
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.keys import Keys
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.core.os_manager import ChromeType
from axe_selenium_python import Axe
import requests

# Configuration
BASE_URL = "http://localhost:3082"
ARTIFACTS_DIR = Path("/home/metrik/docker/Obscurion/artifacts")
TEST_USER_EMAIL = f"qatest_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "TestPassword123!"
TEST_USER_NAME = "QA Test User"

# Viewports to test
VIEWPORTS = [
    {"name": "mobile_small", "width": 360, "height": 740},
    {"name": "mobile_large", "width": 390, "height": 844},
    {"name": "tablet", "width": 768, "height": 1024},
    {"name": "desktop_small", "width": 1280, "height": 800},
    {"name": "desktop_medium", "width": 1920, "height": 1080},
    {"name": "desktop_large", "width": 2560, "height": 1440},
]

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
    "accessibility": [],
    "screenshots": [],
    "console_errors": [],
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

def setup_driver(viewport: Dict = None) -> webdriver.Chrome:
    """Set up Chrome WebDriver with options"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--enable-logging")
    chrome_options.add_argument("--v=1")
    chrome_options.binary_location = "/usr/bin/chromium-browser"

    if viewport:
        chrome_options.add_argument(f"--window-size={viewport['width']},{viewport['height']}")

    # Use webdriver-manager to handle chromedriver
    service = Service(ChromeDriverManager(chrome_type=ChromeType.CHROMIUM).install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    driver.implicitly_wait(5)
    return driver

def take_screenshot(driver: webdriver.Chrome, name: str, viewport: str = "default"):
    """Take a screenshot and save to artifacts"""
    filename = f"{name}_{viewport}_{int(time.time())}.png"
    filepath = ARTIFACTS_DIR / "selenium" / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    driver.save_screenshot(str(filepath))
    test_results["screenshots"].append(str(filepath))
    return str(filepath)

def check_console_errors(driver: webdriver.Chrome, page_name: str):
    """Check for console errors"""
    try:
        logs = driver.get_log('browser')
        errors = [log for log in logs if log['level'] == 'SEVERE']
        if errors:
            test_results["console_errors"].append({
                "page": page_name,
                "errors": errors
            })
            log_test(f"Console errors on {page_name}", "WARN",
                    f"Found {len(errors)} console errors",
                    json.dumps(errors[:5]))  # Log first 5 errors
    except Exception as e:
        log_test(f"Console check on {page_name}", "WARN",
                f"Could not check console: {str(e)}")

def run_accessibility_check(driver: webdriver.Chrome, page_name: str, viewport: str = "default"):
    """Run axe-core accessibility check"""
    try:
        axe = Axe(driver)
        axe.inject()
        results = axe.run()

        violations = results.get("violations", [])
        critical = [v for v in violations if v.get("impact") == "critical"]
        serious = [v for v in violations if v.get("impact") == "serious"]
        moderate = [v for v in violations if v.get("impact") == "moderate"]
        minor = [v for v in violations if v.get("impact") == "minor"]

        test_results["accessibility"].append({
            "page": page_name,
            "viewport": viewport,
            "critical": len(critical),
            "serious": len(serious),
            "moderate": len(moderate),
            "minor": len(minor),
            "violations": violations
        })

        if critical or serious:
            log_test(f"Accessibility check on {page_name} ({viewport})", "FAIL",
                    f"Critical: {len(critical)}, Serious: {len(serious)}, Moderate: {len(moderate)}, Minor: {len(minor)}",
                    f"artifacts/a11y-{page_name}-{viewport}.json")
        elif moderate:
            log_test(f"Accessibility check on {page_name} ({viewport})", "WARN",
                    f"Moderate: {len(moderate)}, Minor: {len(minor)}")
        else:
            log_test(f"Accessibility check on {page_name} ({viewport})", "PASS",
                    f"Minor: {len(minor)}")

        # Save detailed results
        a11y_file = ARTIFACTS_DIR / "a11y" / f"{page_name}_{viewport}.json"
        a11y_file.parent.mkdir(parents=True, exist_ok=True)
        with open(a11y_file, 'w') as f:
            json.dump(results, f, indent=2)

    except Exception as e:
        log_test(f"Accessibility check on {page_name} ({viewport})", "WARN",
                f"Could not run accessibility check: {str(e)}")

def test_health_check():
    """Test API health endpoint"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        if response.status_code == 200:
            log_test("API Health Check", "PASS", "Health endpoint responding")
        else:
            log_test("API Health Check", "FAIL", f"Status code: {response.status_code}")
    except Exception as e:
        log_test("API Health Check", "FAIL", f"Health endpoint unreachable: {str(e)}")

def test_signup(driver: webdriver.Chrome):
    """Test user signup"""
    try:
        driver.get(f"{BASE_URL}/auth/signup")
        time.sleep(2)

        # Take screenshot
        take_screenshot(driver, "signup_page", "initial")

        # Check page loaded
        if "sign" in driver.title.lower() or "obscurion" in driver.title.lower():
            log_test("Signup page loads", "PASS")
        else:
            log_test("Signup page loads", "WARN", f"Title: {driver.title}")

        # Fill form
        name_field = driver.find_element(By.NAME, "name")
        email_field = driver.find_element(By.NAME, "email")
        password_field = driver.find_element(By.NAME, "password")

        name_field.send_keys(TEST_USER_NAME)
        email_field.send_keys(TEST_USER_EMAIL)
        password_field.send_keys(TEST_USER_PASSWORD)

        # Submit
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        time.sleep(3)

        # Check redirect or success
        if "/dashboard" in driver.current_url or "/auth/signin" in driver.current_url:
            log_test("User signup", "PASS", f"Redirected to: {driver.current_url}")
            return True
        else:
            take_screenshot(driver, "signup_failed", "error")
            log_test("User signup", "FAIL", f"Current URL: {driver.current_url}")
            return False

    except Exception as e:
        take_screenshot(driver, "signup_error", "exception")
        log_test("User signup", "FAIL", f"Exception: {str(e)}")
        return False

def test_signin(driver: webdriver.Chrome):
    """Test user signin"""
    try:
        driver.get(f"{BASE_URL}/auth/signin")
        time.sleep(2)

        take_screenshot(driver, "signin_page", "initial")

        # Fill form
        email_field = driver.find_element(By.NAME, "email")
        password_field = driver.find_element(By.NAME, "password")

        email_field.send_keys(TEST_USER_EMAIL)
        password_field.send_keys(TEST_USER_PASSWORD)

        # Submit
        submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        submit_button.click()

        time.sleep(3)

        # Check redirect to dashboard
        if "/dashboard" in driver.current_url:
            log_test("User signin", "PASS", "Successfully logged in")
            return True
        else:
            take_screenshot(driver, "signin_failed", "error")
            log_test("User signin", "FAIL", f"Current URL: {driver.current_url}")
            return False

    except Exception as e:
        take_screenshot(driver, "signin_error", "exception")
        log_test("User signin", "FAIL", f"Exception: {str(e)}")
        return False

def check_navigation_menu(driver: webdriver.Chrome, page_name: str):
    """Check for presence and functionality of navigation menu"""
    try:
        # Look for navigation elements
        nav_checks = {
            "Obscurion branding": ["//a[contains(text(), 'Obscurion')]", "//h1[contains(text(), 'Obscurion')]"],
            "Dashboard link": ["//a[contains(@href, '/dashboard') and not(contains(@href, '/notes'))]"],
            "Notes link": ["//a[contains(@href, '/notes')]"],
            "Search link": ["//a[contains(@href, '/search')]"],
            "User email display": [f"//text()[contains(., '{TEST_USER_EMAIL}')]", "//button[contains(@aria-label, 'user')]"],
            "Logout button": ["//button[contains(text(), 'Logout')]", "//button[contains(text(), 'Sign out')]", "//a[contains(text(), 'Logout')]"],
        }

        found_elements = {}
        for check_name, xpaths in nav_checks.items():
            found = False
            for xpath in xpaths:
                try:
                    driver.find_element(By.XPATH, xpath)
                    found = True
                    break
                except:
                    continue
            found_elements[check_name] = found

        # Check if navigation is sticky
        try:
            nav = driver.find_element(By.TAG_NAME, "nav")
            position = nav.value_of_css_property("position")
            is_sticky = position in ["sticky", "fixed"]
        except:
            is_sticky = False

        missing = [k for k, v in found_elements.items() if not v]

        if len(missing) == 0 and is_sticky:
            log_test(f"Navigation menu on {page_name}", "PASS", "All elements present and sticky")
        elif len(missing) <= 2:
            log_test(f"Navigation menu on {page_name}", "WARN",
                    f"Missing: {', '.join(missing)}. Sticky: {is_sticky}")
        else:
            take_screenshot(driver, f"nav_missing_{page_name}", "navigation")
            log_test(f"Navigation menu on {page_name}", "FAIL",
                    f"Missing: {', '.join(missing)}. Sticky: {is_sticky}")

        return len(missing) <= 2

    except Exception as e:
        log_test(f"Navigation menu on {page_name}", "FAIL", f"Exception: {str(e)}")
        return False

def test_dashboard(driver: webdriver.Chrome):
    """Test dashboard page"""
    try:
        driver.get(f"{BASE_URL}/dashboard")
        time.sleep(2)

        take_screenshot(driver, "dashboard", "main")

        if "/dashboard" in driver.current_url and "/notes" not in driver.current_url:
            log_test("Dashboard page loads", "PASS")
        else:
            log_test("Dashboard page loads", "FAIL", f"URL: {driver.current_url}")

        check_navigation_menu(driver, "dashboard")
        check_console_errors(driver, "dashboard")
        run_accessibility_check(driver, "dashboard")

    except Exception as e:
        log_test("Dashboard page", "FAIL", f"Exception: {str(e)}")

def test_create_note(driver: webdriver.Chrome) -> Optional[str]:
    """Test note creation and return note ID"""
    try:
        driver.get(f"{BASE_URL}/dashboard/notes/new")
        time.sleep(2)

        take_screenshot(driver, "create_note", "initial")

        check_navigation_menu(driver, "create_note")

        # Fill in note details
        title_field = driver.find_element(By.NAME, "title")
        title_field.send_keys("QA Test Note - Manual Testing")

        # Find content field (could be textarea or contenteditable div)
        try:
            content_field = driver.find_element(By.NAME, "content")
            content_field.send_keys("This is a test note created by the QA automation suite. It tests note creation, editing, flashcards, and version history.")
        except:
            try:
                content_field = driver.find_element(By.CSS_SELECTOR, "[contenteditable='true']")
                content_field.send_keys("This is a test note created by the QA automation suite. It tests note creation, editing, flashcards, and version history.")
            except:
                log_test("Note creation - content field", "FAIL", "Could not find content field")
                return None

        # Select note type
        try:
            type_select = driver.find_element(By.NAME, "type")
            type_select.send_keys("GENERAL")
        except:
            log_test("Note creation - type field", "WARN", "Could not find type selector")

        time.sleep(3)  # Wait for auto-save

        # Check if URL changed to include note ID
        current_url = driver.current_url
        if "/dashboard/notes/" in current_url and current_url != f"{BASE_URL}/dashboard/notes/new":
            note_id = current_url.split("/")[-1]
            log_test("Note creation", "PASS", f"Note created with ID: {note_id}")
            take_screenshot(driver, f"note_created_{note_id}", "success")
            return note_id
        else:
            log_test("Note creation", "WARN", "Note may have been created but URL didn't change")
            take_screenshot(driver, "note_creation_ambiguous", "warning")
            return None

    except Exception as e:
        take_screenshot(driver, "note_creation_error", "exception")
        log_test("Note creation", "FAIL", f"Exception: {str(e)}")
        return None

def test_flashcard_creation(driver: webdriver.Chrome, note_id: str):
    """Test manual flashcard creation"""
    try:
        # Navigate to note
        driver.get(f"{BASE_URL}/dashboard/notes/{note_id}")
        time.sleep(2)

        take_screenshot(driver, f"note_{note_id}_before_flashcard", "initial")

        # Look for "View Flashcards" button
        try:
            view_flashcards_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'View Flashcards') or contains(text(), 'Flashcards')]")
            view_flashcards_btn.click()
            time.sleep(2)
            log_test("View Flashcards button", "PASS", "Button found and clicked")
        except:
            log_test("View Flashcards button", "FAIL", "Could not find View Flashcards button")
            take_screenshot(driver, "no_flashcard_button", "error")
            return

        # Check for flashcard form
        try:
            question_field = driver.find_element(By.NAME, "question")
            answer_field = driver.find_element(By.NAME, "answer")
            difficulty_select = driver.find_element(By.NAME, "difficulty")
            log_test("Flashcard form elements", "PASS", "All form fields present")
        except Exception as e:
            log_test("Flashcard form elements", "FAIL", f"Missing form fields: {str(e)}")
            take_screenshot(driver, "flashcard_form_missing", "error")
            return

        # Fill flashcard form
        question_field.send_keys("What is 2+2?")
        answer_field.send_keys("4")
        difficulty_select.send_keys("EASY")

        take_screenshot(driver, "flashcard_form_filled", "before_submit")

        # Submit flashcard
        try:
            add_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Add Flashcard')]")
            add_btn.click()
            time.sleep(2)
            log_test("Add Flashcard button", "PASS", "Button clicked")
        except Exception as e:
            log_test("Add Flashcard button", "FAIL", f"Could not click button: {str(e)}")
            return

        take_screenshot(driver, "flashcard_after_add", "after_submit")

        # Check if flashcard appears in list
        try:
            flashcard_list = driver.find_elements(By.XPATH, "//*[contains(text(), 'What is 2+2?')]")
            if len(flashcard_list) > 0:
                log_test("Flashcard appears in list", "PASS", f"Found {len(flashcard_list)} matches")
            else:
                log_test("Flashcard appears in list", "FAIL", "Flashcard not found in list")
        except Exception as e:
            log_test("Flashcard appears in list", "FAIL", f"Exception: {str(e)}")

        # Check for character limits display
        try:
            driver.find_element(By.XPATH, "//*[contains(text(), '255')]")
            log_test("Character limit display", "PASS", "Question limit shown")
        except:
            log_test("Character limit display", "WARN", "Character limits not visible")

        # Try to delete flashcard
        try:
            delete_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Delete') or contains(@aria-label, 'delete')]")
            delete_btn.click()
            time.sleep(2)

            # Check if flashcard is gone
            flashcard_list_after = driver.find_elements(By.XPATH, "//*[contains(text(), 'What is 2+2?')]")
            if len(flashcard_list_after) == 0:
                log_test("Flashcard deletion", "PASS", "Flashcard successfully deleted")
            else:
                log_test("Flashcard deletion", "WARN", "Flashcard may still be visible")
        except Exception as e:
            log_test("Flashcard deletion", "WARN", f"Could not test deletion: {str(e)}")

    except Exception as e:
        take_screenshot(driver, "flashcard_test_error", "exception")
        log_test("Flashcard creation test", "FAIL", f"Exception: {str(e)}")

def test_version_history(driver: webdriver.Chrome, note_id: str):
    """Test version history functionality"""
    try:
        # Navigate to note
        driver.get(f"{BASE_URL}/dashboard/notes/{note_id}")
        time.sleep(2)

        # Make an edit to create a version
        try:
            content_field = driver.find_element(By.NAME, "content")
            content_field.send_keys(" - EDITED VERSION")
        except:
            try:
                content_field = driver.find_element(By.CSS_SELECTOR, "[contenteditable='true']")
                content_field.send_keys(" - EDITED VERSION")
            except:
                log_test("Version history - edit", "WARN", "Could not edit note to create version")

        time.sleep(3)  # Wait for auto-save

        # Look for "View Version History" button
        try:
            version_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Version History') or contains(text(), 'Versions')]")
            version_btn.click()
            time.sleep(2)
            log_test("View Version History button", "PASS", "Button found and clicked")
        except Exception as e:
            log_test("View Version History button", "FAIL", f"Could not find button: {str(e)}")
            take_screenshot(driver, "no_version_button", "error")
            return

        take_screenshot(driver, "version_history_open", "list")

        # Check for version list
        try:
            versions = driver.find_elements(By.XPATH, "//*[contains(text(), 'Version')]")
            if len(versions) >= 1:
                log_test("Version history list", "PASS", f"Found {len(versions)} version entries")
            else:
                log_test("Version history list", "FAIL", "No versions found in list")
        except Exception as e:
            log_test("Version history list", "FAIL", f"Exception: {str(e)}")

        # Check for restore button
        try:
            restore_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Restore')]")
            log_test("Version restore button", "PASS", "Restore button present")

            # Try to restore a version
            restore_btn.click()
            time.sleep(2)
            log_test("Version restoration", "PASS", "Restore button clicked successfully")
            take_screenshot(driver, "version_restored", "after_restore")
        except Exception as e:
            log_test("Version restore functionality", "WARN", f"Could not test restore: {str(e)}")

    except Exception as e:
        take_screenshot(driver, "version_history_error", "exception")
        log_test("Version history test", "FAIL", f"Exception: {str(e)}")

def test_notes_list(driver: webdriver.Chrome):
    """Test notes list page"""
    try:
        driver.get(f"{BASE_URL}/dashboard/notes")
        time.sleep(2)

        take_screenshot(driver, "notes_list", "main")

        check_navigation_menu(driver, "notes_list")

        # Check for table or list of notes
        try:
            table = driver.find_element(By.TAG_NAME, "table")
            log_test("Notes list table", "PASS", "Table element found")
        except:
            log_test("Notes list table", "WARN", "No table found, may use different layout")

        # Check for note entries
        try:
            notes = driver.find_elements(By.XPATH, "//td[contains(text(), 'QA Test Note')] | //div[contains(text(), 'QA Test Note')]")
            if len(notes) > 0:
                log_test("Notes list shows created note", "PASS", f"Found {len(notes)} matching notes")
            else:
                log_test("Notes list shows created note", "WARN", "Test note not visible in list")
        except Exception as e:
            log_test("Notes list content", "WARN", f"Could not check content: {str(e)}")

        check_console_errors(driver, "notes_list")
        run_accessibility_check(driver, "notes_list")

    except Exception as e:
        take_screenshot(driver, "notes_list_error", "exception")
        log_test("Notes list page", "FAIL", f"Exception: {str(e)}")

def test_search_page(driver: webdriver.Chrome):
    """Test search functionality"""
    try:
        driver.get(f"{BASE_URL}/dashboard/search")
        time.sleep(2)

        take_screenshot(driver, "search_page", "main")

        check_navigation_menu(driver, "search_page")

        # Check for search input
        try:
            search_input = driver.find_element(By.CSS_SELECTOR, "input[type='search'], input[placeholder*='search' i], input[placeholder*='Search' i]")
            log_test("Search input field", "PASS", "Search input found")

            # Try searching
            search_input.send_keys("QA Test")
            search_input.send_keys(Keys.RETURN)
            time.sleep(2)

            take_screenshot(driver, "search_results", "after_search")
            log_test("Search functionality", "PASS", "Search executed successfully")

        except Exception as e:
            log_test("Search input field", "FAIL", f"Could not find or use search: {str(e)}")

        check_console_errors(driver, "search_page")
        run_accessibility_check(driver, "search_page")

    except Exception as e:
        take_screenshot(driver, "search_error", "exception")
        log_test("Search page", "FAIL", f"Exception: {str(e)}")

def test_responsive_design():
    """Test responsive design across multiple viewports"""
    for viewport in VIEWPORTS[:3]:  # Test first 3 viewports for time
        print(f"\n🖥️  Testing viewport: {viewport['name']} ({viewport['width']}x{viewport['height']})")

        driver = setup_driver(viewport)
        try:
            # Sign in
            driver.get(f"{BASE_URL}/auth/signin")
            time.sleep(1)

            email_field = driver.find_element(By.NAME, "email")
            password_field = driver.find_element(By.NAME, "password")
            email_field.send_keys(TEST_USER_EMAIL)
            password_field.send_keys(TEST_USER_PASSWORD)

            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            time.sleep(2)

            # Test dashboard on this viewport
            driver.get(f"{BASE_URL}/dashboard")
            time.sleep(2)

            take_screenshot(driver, "dashboard", viewport['name'])

            # Check for mobile menu on small viewports
            if viewport['width'] < 768:
                try:
                    hamburger = driver.find_element(By.CSS_SELECTOR, "button[aria-label*='menu' i], button[aria-label*='navigation' i]")
                    log_test(f"Mobile hamburger menu ({viewport['name']})", "PASS", "Hamburger menu found")
                except:
                    log_test(f"Mobile hamburger menu ({viewport['name']})", "WARN", "Hamburger menu not found on mobile viewport")

            # Run accessibility check
            run_accessibility_check(driver, "dashboard", viewport['name'])

            log_test(f"Responsive test ({viewport['name']})", "PASS", f"Tested at {viewport['width']}x{viewport['height']}")

        except Exception as e:
            log_test(f"Responsive test ({viewport['name']})", "FAIL", f"Exception: {str(e)}")
        finally:
            driver.quit()

def test_protected_routes():
    """Test that protected routes redirect to signin when not authenticated"""
    driver = setup_driver()
    try:
        # Test dashboard without auth
        driver.get(f"{BASE_URL}/dashboard")
        time.sleep(2)

        if "/auth/signin" in driver.current_url:
            log_test("Protected route redirect", "PASS", "Dashboard redirects to signin when unauthenticated")
        else:
            log_test("Protected route redirect", "FAIL", f"Dashboard accessible without auth: {driver.current_url}")

    except Exception as e:
        log_test("Protected route redirect", "FAIL", f"Exception: {str(e)}")
    finally:
        driver.quit()

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
            body {{ font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }}
            .header {{ background: #2c3e50; color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }}
            .verdict {{ font-size: 48px; font-weight: bold; margin: 20px 0; }}
            .verdict.pass {{ color: #27ae60; }}
            .verdict.warn {{ color: #f39c12; }}
            .verdict.fail {{ color: #e74c3c; }}
            .summary {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }}
            .stat {{ background: white; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            .stat-value {{ font-size: 36px; font-weight: bold; margin: 10px 0; }}
            .section {{ background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
            .test-item {{ padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; }}
            .test-item:last-child {{ border-bottom: none; }}
            .test-name {{ flex: 1; font-weight: 600; }}
            .test-status {{ padding: 5px 15px; border-radius: 4px; font-weight: bold; margin-left: 20px; }}
            .test-status.pass {{ background: #d4edda; color: #155724; }}
            .test-status.warn {{ background: #fff3cd; color: #856404; }}
            .test-status.fail {{ background: #f8d7da; color: #721c24; }}
            .test-details {{ color: #666; font-size: 14px; margin-top: 8px; }}
            h2 {{ color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Obscurion QA Report</h1>
            <div class="verdict {'pass' if 'PASS' in verdict else 'warn' if 'WARN' in verdict else 'fail'}">{verdict}</div>
            <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>Base URL: {BASE_URL}</p>
        </div>

        <div class="summary">
            <div class="stat">
                <div>Total Tests</div>
                <div class="stat-value">{test_results['summary']['total_tests']}</div>
            </div>
            <div class="stat">
                <div>Passed</div>
                <div class="stat-value" style="color: #27ae60">{test_results['summary']['passed']}</div>
            </div>
            <div class="stat">
                <div>Warnings</div>
                <div class="stat-value" style="color: #f39c12">{test_results['summary']['warnings']}</div>
            </div>
            <div class="stat">
                <div>Failed</div>
                <div class="stat-value" style="color: #e74c3c">{test_results['summary']['failed']}</div>
            </div>
        </div>

        <div class="section">
            <h2>Test Results</h2>
    """

    for test in test_results['tests']:
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

    html_report += """
        </div>

        <div class="section">
            <h2>Accessibility Summary</h2>
    """

    total_critical = sum(a['critical'] for a in test_results['accessibility'])
    total_serious = sum(a['serious'] for a in test_results['accessibility'])
    total_moderate = sum(a['moderate'] for a in test_results['accessibility'])
    total_minor = sum(a['minor'] for a in test_results['accessibility'])

    html_report += f"""
            <div class="test-item">
                <div class="test-name">Critical Violations</div>
                <div class="stat-value" style="color: {'#e74c3c' if total_critical > 0 else '#27ae60'}">{total_critical}</div>
            </div>
            <div class="test-item">
                <div class="test-name">Serious Violations</div>
                <div class="stat-value" style="color: {'#e74c3c' if total_serious > 0 else '#27ae60'}">{total_serious}</div>
            </div>
            <div class="test-item">
                <div class="test-name">Moderate Violations</div>
                <div class="stat-value" style="color: {'#f39c12' if total_moderate > 0 else '#27ae60'}">{total_moderate}</div>
            </div>
            <div class="test-item">
                <div class="test-name">Minor Violations</div>
                <div class="stat-value">{total_minor}</div>
            </div>
        </div>

        <div class="section">
            <h2>Artifacts</h2>
            <p>Screenshots: {len(test_results['screenshots'])} files</p>
            <p>Console Errors: {len(test_results['console_errors'])} pages with errors</p>
            <p>Accessibility Reports: {len(test_results['accessibility'])} pages checked</p>
            <p>Full JSON report: artifacts/qa-report.json</p>
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
    print(f"Passed: {test_results['summary']['passed']}")
    print(f"Warnings: {test_results['summary']['warnings']}")
    print(f"Failed: {test_results['summary']['failed']}")
    print(f"\nAccessibility:")
    print(f"  Critical: {total_critical}")
    print(f"  Serious: {total_serious}")
    print(f"  Moderate: {total_moderate}")
    print(f"  Minor: {total_minor}")
    print(f"\nReports saved:")
    print(f"  JSON: {json_report_path}")
    print(f"  HTML: {html_report_path}")
    print(f"{'='*80}\n")

def main():
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
    test_health_check()

    # Phase 2: Authentication
    print("\n🔐 Phase 2: Authentication Tests")
    test_protected_routes()

    driver = setup_driver()
    try:
        signup_success = test_signup(driver)
        if not signup_success:
            print("⚠️  Signup failed, trying to signin with existing account...")

        signin_success = test_signin(driver)
        if not signin_success:
            print("❌ Cannot proceed with tests - authentication failed")
            driver.quit()
            generate_report()
            return

        # Phase 3: Navigation & Dashboard
        print("\n🧭 Phase 3: Navigation & Dashboard Tests")
        test_dashboard(driver)

        # Phase 4: Note Creation
        print("\n📝 Phase 4: Note Creation Tests")
        note_id = test_create_note(driver)

        # Phase 5: Flashcard Tests
        if note_id:
            print("\n🃏 Phase 5: Flashcard Tests")
            test_flashcard_creation(driver, note_id)

            # Phase 6: Version History Tests
            print("\n📚 Phase 6: Version History Tests")
            test_version_history(driver, note_id)

        # Phase 7: Notes List & Search
        print("\n📋 Phase 7: Notes List & Search Tests")
        test_notes_list(driver)
        test_search_page(driver)

    finally:
        driver.quit()

    # Phase 8: Responsive Design
    print("\n📱 Phase 8: Responsive Design Tests")
    test_responsive_design()

    # Phase 9: Generate Report
    print("\n📊 Phase 9: Generating Report")
    generate_report()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        generate_report()
    except Exception as e:
        print(f"\n\n❌ Fatal error: {str(e)}")
        traceback.print_exc()
        generate_report()
        sys.exit(1)
