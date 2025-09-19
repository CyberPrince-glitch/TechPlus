#!/usr/bin/env python3
"""
TechPulse AI Backend API Testing Suite
Tests all API endpoints for RSS feed aggregation and AI content generation platform
"""

import requests
import sys
import json
import time
from datetime import datetime

class TechPulseAPITester:
    def __init__(self, base_url="http://localhost:8001"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.token = None
        self.admin_credentials = {
            "username": "admin",
            "password": "admin123!@#TechPulse"
        }

    def log_test(self, name, success, details="", response_data=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_admin_login(self):
        """Test admin login and get authentication token"""
        try:
            response = requests.post(f"{self.api_url}/auth/login", 
                                   json=self.admin_credentials, 
                                   timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and data.get("access_token"):
                self.token = data["access_token"]
                user_info = data.get("user", {})
                self.log_test("Admin Login", True, 
                            f"Logged in as {user_info.get('username', 'unknown')}, Admin: {user_info.get('is_admin', False)}",
                            response_data={"username": user_info.get("username"), "is_admin": user_info.get("is_admin")})
                return True, data
            else:
                self.log_test("Admin Login", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception: {str(e)}")
            return False, {}

    def get_auth_headers(self):
        """Get authentication headers"""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    def test_health_check(self):
        """Test basic API health check"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and "TechPulse AI API" in data.get("message", ""):
                self.log_test("Health Check", True, response_data=data)
                return True
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}, Response: {data}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False

    def test_health_endpoint(self):
        """Test dedicated health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and data.get("status") == "healthy":
                self.log_test("Health Endpoint", True, response_data=data)
                return True
            else:
                self.log_test("Health Endpoint", False, f"Status: {response.status_code}, Response: {data}")
                return False
        except Exception as e:
            self.log_test("Health Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_initialize_feeds(self):
        """Test RSS feed initialization"""
        try:
            response = requests.post(f"{self.api_url}/feeds/initialize", 
                                   headers=self.get_auth_headers(), timeout=30)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success:
                message = data.get("message", "")
                if "feeds" in message.lower():
                    self.log_test("Initialize RSS Feeds", True, response_data=data)
                    return True, data
                else:
                    self.log_test("Initialize RSS Feeds", False, f"Unexpected response: {data}")
                    return False, data
            else:
                self.log_test("Initialize RSS Feeds", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Initialize RSS Feeds", False, f"Exception: {str(e)}")
            return False, {}

    def test_get_feeds(self):
        """Test getting RSS feeds"""
        try:
            response = requests.get(f"{self.api_url}/feeds", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and isinstance(data, list):
                self.log_test("Get RSS Feeds", True, f"Found {len(data)} feeds", response_data={"count": len(data)})
                return True, data
            else:
                self.log_test("Get RSS Feeds", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Get RSS Feeds", False, f"Exception: {str(e)}")
            return False, []

    def test_collect_articles(self):
        """Test article collection from RSS feeds"""
        try:
            response = requests.post(f"{self.api_url}/articles/collect", 
                                   headers=self.get_auth_headers(), timeout=15)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and "background" in data.get("message", "").lower():
                self.log_test("Collect Articles", True, response_data=data)
                return True, data
            else:
                self.log_test("Collect Articles", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Collect Articles", False, f"Exception: {str(e)}")
            return False, {}

    def test_get_articles(self):
        """Test getting collected articles"""
        try:
            response = requests.get(f"{self.api_url}/articles?limit=10", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and isinstance(data, list):
                self.log_test("Get Articles", True, f"Found {len(data)} articles", response_data={"count": len(data)})
                return True, data
            else:
                self.log_test("Get Articles", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Get Articles", False, f"Exception: {str(e)}")
            return False, []

    def test_generate_content(self, language="english"):
        """Test AI content generation"""
        try:
            payload = {
                "topics": ["artificial intelligence", "machine learning", "technology"],
                "language": language,
                "tone": "professional",
                "length": "medium",
                "include_seo": True,
                "article_count": 3
            }
            
            response = requests.post(f"{self.api_url}/generate", json=payload, 
                                   headers=self.get_auth_headers(), timeout=60)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and data.get("title") and data.get("content"):
                self.log_test(f"Generate Content ({language})", True, 
                            f"Generated: {data.get('word_count', 0)} words, SEO: {data.get('seo_score', 0)}%",
                            response_data={"title": data.get("title", "")[:100], "word_count": data.get("word_count", 0)})
                return True, data
            else:
                self.log_test(f"Generate Content ({language})", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test(f"Generate Content ({language})", False, f"Exception: {str(e)}")
            return False, {}

    def test_get_generated_content(self):
        """Test getting generated content"""
        try:
            response = requests.get(f"{self.api_url}/content?limit=5", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and isinstance(data, list):
                self.log_test("Get Generated Content", True, f"Found {len(data)} generated articles", 
                            response_data={"count": len(data)})
                return True, data
            else:
                self.log_test("Get Generated Content", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Get Generated Content", False, f"Exception: {str(e)}")
            return False, []

    def test_publish_content(self, content_id):
        """Test content publishing (mock)"""
        try:
            payload = {
                "content_id": content_id,
                "platforms": ["facebook", "twitter", "linkedin", "wordpress"]
            }
            
            response = requests.post(f"{self.api_url}/publish", json=payload, 
                                   headers=self.get_auth_headers(), timeout=15)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and data.get("results"):
                self.log_test("Publish Content", True, f"Published to {len(data.get('results', {}))} platforms",
                            response_data={"platforms": list(data.get("results", {}).keys())})
                return True, data
            else:
                self.log_test("Publish Content", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Publish Content", False, f"Exception: {str(e)}")
            return False, {}

    def test_analytics(self):
        """Test analytics endpoint"""
        try:
            response = requests.get(f"{self.api_url}/analytics", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and "feeds" in data and "articles" in data:
                self.log_test("Analytics", True, 
                            f"Feeds: {data.get('feeds', {}).get('total', 0)}, Articles: {data.get('articles', {}).get('total', 0)}",
                            response_data=data)
                return True, data
            else:
                self.log_test("Analytics", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Analytics", False, f"Exception: {str(e)}")
            return False, {}

    def test_search(self):
        """Test search functionality"""
        try:
            response = requests.get(f"{self.api_url}/search?q=AI&limit=5", timeout=10)
            success = response.status_code == 200
            data = response.json() if success else {}
            
            if success and isinstance(data, dict):
                articles_count = len(data.get("articles", []))
                content_count = len(data.get("generated_content", []))
                self.log_test("Search", True, f"Found {articles_count} articles, {content_count} generated content",
                            response_data={"articles": articles_count, "generated_content": content_count})
                return True, data
            else:
                self.log_test("Search", False, f"Status: {response.status_code}, Response: {data}")
                return False, data
        except Exception as e:
            self.log_test("Search", False, f"Exception: {str(e)}")
            return False, {}

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting TechPulse AI Backend API Tests")
        print("=" * 60)
        
        # Basic connectivity tests
        if not self.test_health_check():
            print("❌ Basic health check failed. Stopping tests.")
            return False
            
        self.test_health_endpoint()
        
        # Authentication test
        print("\n🔐 Testing Authentication...")
        login_success, login_data = self.test_admin_login()
        if not login_success:
            print("❌ Admin login failed. Cannot test protected endpoints.")
            return False
        
        # RSS Feed Management Tests
        print("\n📡 Testing RSS Feed Management...")
        init_success, init_data = self.test_initialize_feeds()
        feeds_success, feeds_data = self.test_get_feeds()
        
        # Article Collection Tests
        print("\n📰 Testing Article Collection...")
        collect_success, collect_data = self.test_collect_articles()
        
        # Wait a bit for background collection
        if collect_success:
            print("⏳ Waiting 5 seconds for article collection...")
            time.sleep(5)
        
        articles_success, articles_data = self.test_get_articles()
        
        # AI Content Generation Tests
        print("\n🤖 Testing AI Content Generation...")
        
        # Test English content generation
        gen_success, gen_data = self.test_generate_content("english")
        content_id = gen_data.get("id") if gen_success else None
        
        # Test other languages if English works
        if gen_success:
            print("⏳ Waiting 3 seconds before next generation...")
            time.sleep(3)
            self.test_generate_content("hindi")
            time.sleep(3)
            self.test_generate_content("bangla")
        
        # Content Management Tests
        print("\n📄 Testing Content Management...")
        self.test_get_generated_content()
        
        # Publishing Tests
        if content_id:
            print("\n📤 Testing Publishing...")
            self.test_publish_content(content_id)
        
        # Analytics and Search Tests
        print("\n📊 Testing Analytics and Search...")
        self.test_analytics()
        self.test_search()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test["success"]]
        if failed_tests:
            print(f"\n❌ FAILED TESTS ({len(failed_tests)}):")
            for test in failed_tests:
                print(f"  • {test['name']}: {test['details']}")
        
        # Show key successful tests
        successful_tests = [test for test in self.test_results if test["success"]]
        if successful_tests:
            print(f"\n✅ KEY SUCCESSFUL TESTS ({len(successful_tests)}):")
            for test in successful_tests[:10]:  # Show first 10
                print(f"  • {test['name']}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    print("TechPulse AI Backend API Test Suite")
    print("Testing URL: http://localhost:8001/api")
    print()
    
    tester = TechPulseAPITester()
    
    try:
        success = tester.run_comprehensive_test()
        all_passed = tester.print_summary()
        
        if all_passed:
            print("\n🎉 All tests passed! Backend API is fully functional.")
            return 0
        else:
            print(f"\n⚠️  Some tests failed. Check the details above.")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrupted by user")
        tester.print_summary()
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error during testing: {str(e)}")
        tester.print_summary()
        return 1

if __name__ == "__main__":
    sys.exit(main())