#!/usr/bin/env python3
"""
Debug script to test the profile endpoint and check user data
"""
import os
import sys
import django
import requests
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sandy.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

def main():
    print("=== Debug Profile Endpoint ===\n")
    
    # Check if users exist
    print("1. Checking users in database:")
    users = User.objects.all()[:10]
    if not users:
        print("   No users found in database!")
        return
    
    for user in users:
        print(f"   User ID: {user.id}, Email: {user.email}")
    
    # Check if user ID 5 exists
    print(f"\n2. Checking if user ID 5 exists:")
    try:
        user_5 = User.objects.get(id=5)
        print(f"   ✓ User 5 exists: {user_5.email}")
        test_user = user_5
    except User.DoesNotExist:
        print("   ✗ User 5 does not exist, using first available user")
        test_user = users[0]
    
    # Generate a valid token for the test user
    print(f"\n3. Generating token for user {test_user.id}:")
    token = AccessToken.for_user(test_user)
    print(f"   Token generated: {str(token)[:50]}...")
    
    # Test the endpoint with curl
    print(f"\n4. Testing endpoint /api/users/{test_user.id}/profile/:")
    
    # Test without token (should get 401)
    url_no_token = f"http://localhost:8000/api/users/{test_user.id}/profile/"
    print(f"   Testing without token: {url_no_token}")
    try:
        response = requests.get(url_no_token, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code != 200:
            print(f"   Response: {response.text[:200]}")
    except requests.exceptions.RequestException as e:
        print(f"   Error: {e}")
    
    # Test with token in query parameter
    url_with_token = f"http://localhost:8000/api/users/{test_user.id}/profile/?token={token}"
    print(f"\n   Testing with token in query parameter:")
    try:
        response = requests.get(url_with_token, timeout=5)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✓ Success! Response: {json.dumps(response.json(), indent=2)}")
        else:
            print(f"   ✗ Error response: {response.text[:200]}")
    except requests.exceptions.RequestException as e:
        print(f"   Error: {e}")
    
    # Check if user has a profile
    print(f"\n5. Checking if user {test_user.id} has a profile:")
    try:
        from profiles.models import UserProfile
        profile = UserProfile.objects.get(user=test_user)
        print(f"   ✓ Profile exists: {profile}")
    except UserProfile.DoesNotExist:
        print(f"   ✗ No profile exists for user {test_user.id}")
        print("   Creating a basic profile...")
        try:
            from profiles.models import UserProfile
            profile = UserProfile.objects.create(user=test_user)
            print(f"   ✓ Profile created: {profile}")
        except Exception as e:
            print(f"   ✗ Failed to create profile: {e}")
    except ImportError:
        print("   Could not import UserProfile model")
    
    print(f"\n=== Debug Complete ===")
    print(f"Frontend should use: http://localhost:8000/api/users/{test_user.id}/profile/?token=YOUR_TOKEN")

if __name__ == "__main__":
    main()