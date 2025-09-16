#!/usr/bin/env python3
"""
Simple HTTP test script to debug the profile endpoint issue
"""
import requests
import json
import sys

def test_endpoint():
    print("=== Testing Profile API Endpoint ===\n")
    
    base_url = "http://localhost:8000"
    
    # Test 1: Check if server is running
    print("1. Testing if Django server is running...")
    try:
        response = requests.get(f"{base_url}/api/", timeout=5)
        print(f"   Server status: {response.status_code}")
        if response.status_code == 401:
            print("   ✓ Server is running (401 Unauthorized expected for /api/)")
        else:
            print(f"   Response: {response.text[:100]}")
    except requests.exceptions.RequestException as e:
        print(f"   ✗ Server not responding: {e}")
        return
    
    # Test 2: Check various user IDs to see which ones exist
    print("\n2. Testing different user IDs...")
    test_ids = [1, 2, 3, 4, 5, 10]
    
    for user_id in test_ids:
        url = f"{base_url}/api/users/{user_id}/profile/"
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 404:
                print(f"   User {user_id}: 404 Not Found (URL routing issue or user doesn't exist)")
            elif response.status_code == 401:
                print(f"   User {user_id}: 401 Unauthorized (endpoint exists, needs auth)")
            elif response.status_code == 403:
                print(f"   User {user_id}: 403 Forbidden (endpoint exists, auth failed)")
            else:
                print(f"   User {user_id}: {response.status_code} - {response.text[:50]}")
        except requests.exceptions.RequestException as e:
            print(f"   User {user_id}: Request failed - {e}")
    
    # Test 3: Test with a fake token to see what happens
    print("\n3. Testing with a fake token...")
    fake_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.token"
    url_with_token = f"{base_url}/api/users/5/profile/?token={fake_token}"
    
    try:
        response = requests.get(url_with_token, timeout=5)
        print(f"   Status with fake token: {response.status_code}")
        print(f"   Response: {response.text[:200]}")
    except requests.exceptions.RequestException as e:
        print(f"   Request failed: {e}")
    
    # Test 4: Check common Django endpoints
    print("\n4. Testing common Django endpoints...")
    endpoints_to_test = [
        "/api/auth/login/",
        "/api/auth/register/", 
        "/api/users/me/",
        "/admin/",
    ]
    
    for endpoint in endpoints_to_test:
        url = f"{base_url}{endpoint}"
        try:
            response = requests.get(url, timeout=3)
            print(f"   {endpoint}: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"   {endpoint}: Request failed - {e}")
    
    # Test 5: Check if this is a CORS issue
    print("\n5. Testing with different headers...")
    headers = {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json',
    }
    
    try:
        response = requests.get(f"{base_url}/api/users/5/profile/", headers=headers, timeout=5)
        print(f"   Status with CORS headers: {response.status_code}")
        print(f"   Response headers: {dict(response.headers)}")
    except requests.exceptions.RequestException as e:
        print(f"   Request with headers failed: {e}")

    print("\n=== Recommendations ===")
    print("If you see 404 errors for user profile endpoints:")
    print("1. Check if Django server is running: python manage.py runserver 8000")
    print("2. Check if user ID 5 exists in the database")
    print("3. Verify URL routing in users/urls.py")
    print("4. Check Django logs for any errors")
    print("\nIf you see 401/403 errors:")
    print("1. Check if authentication token is valid")
    print("2. Verify token is not expired")
    print("3. Clear localStorage and login again")
    
    print(f"\n=== Test Complete ===")

if __name__ == "__main__":
    test_endpoint()