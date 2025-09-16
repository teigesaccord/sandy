#!/bin/bash

echo "🔧 Sandy Authentication Flow Test"
echo "================================="

# Configuration
API_HOST="http://localhost:8000"
FRONTEND_HOST="http://localhost:3000"
TEST_EMAIL="testuser@example.com"
TEST_PASSWORD="testpassword123"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $1 in
        "SUCCESS") echo -e "${GREEN}✅ $2${NC}" ;;
        "ERROR") echo -e "${RED}❌ $2${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $2${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $2${NC}" ;;
    esac
}

# Function to check if server is running
check_server() {
    local url=$1
    local name=$2
    
    if curl -s -f "$url" > /dev/null 2>&1; then
        print_status "SUCCESS" "$name server is running at $url"
        return 0
    else
        print_status "ERROR" "$name server is not running at $url"
        return 1
    fi
}

# Function to test endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description ... "
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url")
    fi
    
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        print_status "SUCCESS" "Status $status_code (Expected $expected_status)"
        return 0
    else
        print_status "ERROR" "Status $status_code (Expected $expected_status)"
        echo "Response: $body"
        return 1
    fi
}

echo ""
print_status "INFO" "Step 1: Checking if servers are running"
echo "----------------------------------------"

check_server "$API_HOST/api/" "Django API"
api_running=$?

check_server "$FRONTEND_HOST" "Next.js Frontend" 
frontend_running=$?

if [ $api_running -ne 0 ]; then
    print_status "ERROR" "Django API is not running. Please start it with:"
    echo "cd backend && python manage.py runserver 8000"
    exit 1
fi

echo ""
print_status "INFO" "Step 2: Testing Django API endpoints"
echo "-------------------------------------"

# Test health endpoints
test_endpoint "GET" "$API_HOST/api/" "" "401" "API root (should require auth)"
test_endpoint "GET" "$API_HOST/api/auth/debug-headers/" "" "200" "Debug headers endpoint"

echo ""
print_status "INFO" "Step 3: Testing authentication flow"
echo "------------------------------------"

# Test registration (create test user)
print_status "INFO" "Creating test user: $TEST_EMAIL"
register_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\",\"first_name\":\"Test\",\"last_name\":\"User\"}"

registration_response=$(curl -s -w "\n%{http_code}" -X POST "$API_HOST/api/auth/register/" \
    -H "Content-Type: application/json" \
    -d "$register_data")

reg_status=$(echo "$registration_response" | tail -n1)
reg_body=$(echo "$registration_response" | head -n -1)

if [ "$reg_status" = "201" ]; then
    print_status "SUCCESS" "User registered successfully"
elif [ "$reg_status" = "400" ] && echo "$reg_body" | grep -q "already exists"; then
    print_status "WARNING" "User already exists, continuing with login test"
else
    print_status "ERROR" "Registration failed with status $reg_status"
    echo "Response: $reg_body"
fi

# Test login
print_status "INFO" "Testing login with credentials"
login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"

login_response=$(curl -s -w "\n%{http_code}" -X POST "$API_HOST/api/auth/login/" \
    -H "Content-Type: application/json" \
    -d "$login_data")

login_status=$(echo "$login_response" | tail -n1)
login_body=$(echo "$login_response" | head -n -1)

if [ "$login_status" = "200" ]; then
    print_status "SUCCESS" "Login successful"
    
    # Extract tokens
    access_token=$(echo "$login_body" | grep -o '"access":"[^"]*"' | cut -d'"' -f4)
    refresh_token=$(echo "$login_body" | grep -o '"refresh":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$access_token" ]; then
        print_status "SUCCESS" "Access token received (${#access_token} characters)"
        
        # Test authenticated endpoints
        echo ""
        print_status "INFO" "Step 4: Testing authenticated endpoints"
        echo "---------------------------------------"
        
        # Test /me endpoint with query parameter
        me_url="$API_HOST/api/auth/simple-me/?token=$access_token"
        me_response=$(curl -s -w "\n%{http_code}" "$me_url")
        me_status=$(echo "$me_response" | tail -n1)
        me_body=$(echo "$me_response" | head -n -1)
        
        if [ "$me_status" = "200" ]; then
            print_status "SUCCESS" "/me endpoint works with token"
            user_id=$(echo "$me_body" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
            print_status "INFO" "User ID: $user_id"
            
            # Test profile endpoint
            if [ -n "$user_id" ]; then
                profile_url="$API_HOST/api/users/$user_id/profile/?token=$access_token"
                profile_response=$(curl -s -w "\n%{http_code}" "$profile_url")
                profile_status=$(echo "$profile_response" | tail -n1)
                
                if [ "$profile_status" = "200" ]; then
                    print_status "SUCCESS" "Profile endpoint works"
                elif [ "$profile_status" = "404" ]; then
                    print_status "WARNING" "Profile not found (normal for new users)"
                elif [ "$profile_status" = "401" ]; then
                    print_status "ERROR" "Profile endpoint returned 401 - token issue"
                else
                    print_status "ERROR" "Profile endpoint returned $profile_status"
                fi
            fi
            
        else
            print_status "ERROR" "/me endpoint failed with status $me_status"
            echo "Response: $me_body"
        fi
        
        # Test token refresh
        if [ -n "$refresh_token" ]; then
            print_status "INFO" "Testing token refresh"
            refresh_data="{\"refresh\":\"$refresh_token\"}"
            refresh_response=$(curl -s -w "\n%{http_code}" -X POST "$API_HOST/api/auth/token/refresh/" \
                -H "Content-Type: application/json" \
                -d "$refresh_data")
            
            refresh_status=$(echo "$refresh_response" | tail -n1)
            
            if [ "$refresh_status" = "200" ]; then
                print_status "SUCCESS" "Token refresh works"
            else
                print_status "ERROR" "Token refresh failed with status $refresh_status"
            fi
        fi
        
    else
        print_status "ERROR" "No access token in login response"
        echo "Response: $login_body"
    fi
else
    print_status "ERROR" "Login failed with status $login_status"
    echo "Response: $login_body"
fi

echo ""
print_status "INFO" "Step 5: Frontend integration recommendations"
echo "---------------------------------------------"

if [ $frontend_running -eq 0 ]; then
    print_status "SUCCESS" "Frontend is running"
    echo ""
    echo "🌐 Open these URLs to test:"
    echo "   • Main app: $FRONTEND_HOST"
    echo "   • Login page: $FRONTEND_HOST/login" 
    echo "   • Debug page: $FRONTEND_HOST/debug-auth"
    echo ""
    echo "🔑 Test credentials:"
    echo "   • Email: $TEST_EMAIL"
    echo "   • Password: $TEST_PASSWORD"
else
    print_status "WARNING" "Frontend is not running"
    echo ""
    echo "To start the frontend:"
    echo "   npm run dev"
fi

echo ""
print_status "INFO" "Step 6: Troubleshooting tips"
echo "------------------------------"

echo "If you see 401 errors:"
echo "  1. Clear browser localStorage (F12 > Application > Local Storage)"
echo "  2. Try logging in again"
echo "  3. Check browser console for errors"
echo ""
echo "If you see 404 errors:"
echo "  1. Verify Django server is running on port 8000"
echo "  2. Check Django URL configuration"
echo ""
echo "If you see CORS errors:"
echo "  1. Check CORS_ALLOWED_ORIGINS in Django settings"
echo "  2. Verify API_HOST in frontend environment"

echo ""
print_status "INFO" "Test completed!"
echo "================="

# Clean up test user (optional)
read -p "Do you want to delete the test user? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "INFO" "Test user cleanup would go here (not implemented)"
fi