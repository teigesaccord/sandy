#!/usr/bin/env python3
"""
Test script to verify chat API endpoints with authentication
"""
import requests
import json
import uuid

BASE_URL = "http://localhost:8000"

def test_chat_api():
    print("🧪 Testing Chat API with Authentication")
    print("=" * 50)
    
    # Step 1: Register a test user
    print("\n1. Registering test user...")
    register_data = {
        "email": "testuser@example.com",
        "password": "testpassword123",
        "name": "Test User"
    }
    
    register_response = requests.post(f"{BASE_URL}/api/users/register/", json=register_data)
    print(f"Register Status: {register_response.status_code}")
    
    if register_response.status_code == 201:
        register_result = register_response.json()
        print(f"✅ User registered successfully: {register_result.get('email')}")
        user_id = register_result.get('id') or register_result.get('user', {}).get('id')
    elif register_response.status_code == 400:
        print("⚠️  User might already exist, trying to login...")
        user_id = None
    else:
        print(f"❌ Registration failed: {register_response.text}")
        return
    
    # Step 2: Login to get JWT token
    print("\n2. Logging in...")
    login_data = {
        "email": "testuser@example.com",
        "password": "testpassword123"
    }
    
    login_response = requests.post(f"{BASE_URL}/api/users/login/", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        login_result = login_response.json()
        access_token = login_result.get('access_token')
        user_id = user_id or login_result.get('user', {}).get('id')
        print(f"✅ Login successful, user ID: {user_id}")
        print(f"🔑 Access token: {access_token[:20]}...")
    else:
        print(f"❌ Login failed: {login_response.text}")
        return
    
    if not user_id:
        print("❌ Could not get user ID")
        return
    
    # Headers for authenticated requests
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Step 3: Test main chat endpoint
    print(f"\n3. Testing main chat endpoint: /api/chat/")
    chat_response = requests.get(f"{BASE_URL}/api/chat/", headers=headers)
    print(f"Chat API Status: {chat_response.status_code}")
    
    if chat_response.status_code == 200:
        chat_data = chat_response.json()
        print(f"✅ Main chat endpoint works: {len(chat_data.get('results', []))} conversations")
    else:
        print(f"❌ Main chat endpoint failed: {chat_response.text}")
    
    # Step 4: Test user-specific chat endpoint
    print(f"\n4. Testing user-specific chat endpoint: /api/users/{user_id}/chat/")
    user_chat_response = requests.get(f"{BASE_URL}/api/users/{user_id}/chat/", headers=headers)
    print(f"User Chat API Status: {user_chat_response.status_code}")
    
    if user_chat_response.status_code == 200:
        user_chat_data = user_chat_response.json()
        print(f"✅ User-specific chat endpoint works: {len(user_chat_data.get('results', []))} conversations")
    else:
        print(f"❌ User-specific chat endpoint failed: {user_chat_response.text}")
    
    # Step 5: Create a test conversation
    print(f"\n5. Creating test conversation...")
    conversation_data = {
        "message_type": "user",
        "message_text": "Hello, this is a test message",
        "context_data": {"test": True}
    }
    
    create_response = requests.post(f"{BASE_URL}/api/users/{user_id}/chat/", 
                                  json=conversation_data, headers=headers)
    print(f"Create Conversation Status: {create_response.status_code}")
    
    if create_response.status_code == 201:
        created_conv = create_response.json()
        print(f"✅ Conversation created: {created_conv.get('id')}")
        print(f"   Message: {created_conv.get('message_text')}")
    else:
        print(f"❌ Conversation creation failed: {create_response.text}")
    
    # Step 6: Retrieve conversations again to verify
    print(f"\n6. Retrieving conversations after creation...")
    final_response = requests.get(f"{BASE_URL}/api/users/{user_id}/chat/", headers=headers)
    print(f"Final Retrieval Status: {final_response.status_code}")
    
    if final_response.status_code == 200:
        final_data = final_response.json()
        conversations = final_data.get('results', [])
        print(f"✅ Retrieved {len(conversations)} conversations")
        for i, conv in enumerate(conversations[:3]):  # Show first 3
            print(f"   {i+1}. {conv.get('message_type')}: {conv.get('message_text')[:50]}...")
    else:
        print(f"❌ Final retrieval failed: {final_response.text}")

if __name__ == "__main__":
    try:
        test_chat_api()
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the backend. Make sure it's running on localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")