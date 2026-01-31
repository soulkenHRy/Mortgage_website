# API Key Authentication System

## Overview

This backend now implements a comprehensive API key authentication system that allows external applications to securely access the database through REST API endpoints.

## Features

✅ **Secure API Key Generation** - Cryptographically secure 64-character keys with `mk_` prefix
✅ **Permission-Based Access** - Fine-grained permissions: `read`, `write`, `admin`
✅ **Key Management** - Create, list, update, revoke, and permanently delete keys
✅ **Usage Tracking** - Automatic tracking of API key usage and statistics
✅ **Rate Limiting** - Configurable per-hour and per-day request limits
✅ **IP Whitelisting** - Optional IP-based access control
✅ **Expiration Support** - Keys can have expiration dates
✅ **Active/Inactive State** - Temporarily disable keys without deletion

## Quick Start

### 1. Generate Your First API Key

Run this command in the backend directory:

```bash
cd backend
node generate-api-key.js
```

This will generate an API key and display it. **Save it securely** - you won't see it again!

Example output:
```
✅ API Key Generated Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Name: Frontend Application
🔑 API Key: mk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
🔐 Permissions: read, write
📅 Created: 2026-01-31T10:00:00.000Z
⏰ Expires: Never
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. Add API Key to Frontend

Add the API key to your frontend `.env` file:

```env
VITE_API_KEY=mk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### 3. Use the API Key

The frontend is already configured to include the API key in requests. For external applications:

**Option 1: Using x-api-key header (recommended)**
```bash
curl -X GET "http://localhost:3001/api/activity/user/john" \
  -H "x-api-key: mk_your_api_key_here"
```

**Option 2: Using Authorization header**
```bash
curl -X GET "http://localhost:3001/api/activity/user/john" \
  -H "Authorization: Bearer mk_your_api_key_here"
```

## API Endpoints

### Protected Endpoints (Require API Key)

#### Activity Tracking

**Save Calculator Activity** (Requires `write` permission)
```http
POST /api/activity/calculator
x-api-key: mk_your_key_here
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "calculationData": {
    "inputs": { ... },
    "results": { ... },
    "timestamp": "2026-01-31T10:00:00.000Z"
  }
}
```

**Save Chatbot Activity** (Requires `write` permission)
```http
POST /api/activity/chatbot
x-api-key: mk_your_key_here
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "chatData": {
    "userMessage": "What is a mortgage?",
    "aiResponse": "A mortgage is...",
    "timestamp": "2026-01-31T10:00:00.000Z"
  }
}
```

**Save Pre-qualification Activity** (Requires `write` permission)
```http
POST /api/activity/prequalification
x-api-key: mk_your_key_here
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "prequalificationData": {
    "formData": { ... },
    "qualificationResult": { ... },
    "timestamp": "2026-01-31T10:00:00.000Z"
  }
}
```

**Get User Activities** (Requires `read` permission)
```http
GET /api/activity/user/:username?activityType=calculator&limit=50&skip=0
x-api-key: mk_your_key_here
```

**Get User Activity Statistics** (Requires `read` permission)
```http
GET /api/activity/user/:username/stats
x-api-key: mk_your_key_here
```

### Admin Endpoints (Require JWT Authentication)

These endpoints require a valid JWT token from a logged-in admin user.

**Generate New API Key**
```http
POST /api/keys/generate
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "name": "Mobile App",
  "description": "API key for mobile application",
  "permissions": ["read", "write"],
  "expiresInDays": 365,
  "ipWhitelist": ["192.168.1.100", "10.0.0.50"],
  "rateLimit": {
    "requestsPerHour": 1000,
    "requestsPerDay": 10000
  }
}
```

**List All API Keys**
```http
GET /api/keys/list?includeInactive=false
Authorization: Bearer jwt_token_here
```

**Get Specific API Key Details**
```http
GET /api/keys/:id
Authorization: Bearer jwt_token_here
```

**Update API Key**
```http
PUT /api/keys/:id
Authorization: Bearer jwt_token_here
Content-Type: application/json

{
  "name": "Updated Name",
  "isActive": true,
  "permissions": ["read"]
}
```

**Revoke API Key**
```http
DELETE /api/keys/:id?permanently=false
Authorization: Bearer jwt_token_here
```
- `permanently=false` - Deactivates the key (can be reactivated)
- `permanently=true` - Permanently deletes the key

**Get API Key Usage Statistics**
```http
GET /api/keys/:id/stats
Authorization: Bearer jwt_token_here
```

**Verify API Key**
```http
POST /api/keys/verify
x-api-key: mk_your_key_here
```

## Permission Levels

- **`read`** - Can retrieve data (GET requests)
- **`write`** - Can create and update data (POST, PUT requests)
- **`admin`** - Full access (includes read and write)

## Security Best Practices

1. **Never Commit API Keys** - Add `.env` to `.gitignore`
2. **Rotate Keys Regularly** - Generate new keys periodically
3. **Use Appropriate Permissions** - Grant minimum required permissions
4. **Monitor Usage** - Check usage statistics regularly
5. **Set Expiration Dates** - Use time-limited keys for temporary access
6. **Use IP Whitelisting** - Restrict access to known IP addresses
7. **Revoke Unused Keys** - Deactivate or delete keys that are no longer needed

## Database Schema

### ApiKey Model
```javascript
{
  key: String,              // The actual API key (unique, indexed)
  name: String,             // Friendly name for the key
  description: String,      // Description of the key's purpose
  permissions: [String],    // Array of permissions: 'read', 'write', 'admin'
  isActive: Boolean,        // Whether the key is currently active
  createdBy: String,        // Username who created the key
  lastUsed: Date,          // Last time the key was used
  usageCount: Number,      // Total number of times used
  expiresAt: Date,         // Expiration date (null = never expires)
  ipWhitelist: [String],   // Allowed IP addresses (empty = all IPs)
  rateLimit: {
    requestsPerHour: Number,
    requestsPerDay: Number
  },
  createdAt: Date
}
```

## Error Responses

**401 Unauthorized - No API Key**
```json
{
  "success": false,
  "error": "API key required. Provide it in x-api-key header or Authorization header."
}
```

**401 Unauthorized - Invalid Key**
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

**401 Unauthorized - Expired Key**
```json
{
  "success": false,
  "error": "API key has expired"
}
```

**403 Forbidden - Insufficient Permissions**
```json
{
  "success": false,
  "error": "Permission 'write' required"
}
```

**403 Forbidden - IP Not Whitelisted**
```json
{
  "success": false,
  "error": "IP address not authorized for this API key"
}
```

## Example: External Application Integration

### Node.js
```javascript
const axios = require('axios');

const API_URL = 'http://localhost:3001';
const API_KEY = 'mk_your_api_key_here';

// Fetch user activities
async function getUserActivities(username) {
  try {
    const response = await axios.get(
      `${API_URL}/api/activity/user/${username}`,
      {
        headers: {
          'x-api-key': API_KEY
        }
      }
    );
    
    console.log('Activities:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Track calculator activity
async function trackCalculation(data) {
  try {
    const response = await axios.post(
      `${API_URL}/api/activity/calculator`,
      data,
      {
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Tracked:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Python
```python
import requests

API_URL = 'http://localhost:3001'
API_KEY = 'mk_your_api_key_here'

# Fetch user activities
def get_user_activities(username):
    headers = {'x-api-key': API_KEY}
    response = requests.get(
        f'{API_URL}/api/activity/user/{username}',
        headers=headers
    )
    return response.json()

# Track calculator activity
def track_calculation(data):
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    response = requests.post(
        f'{API_URL}/api/activity/calculator',
        json=data,
        headers=headers
    )
    return response.json()
```

### cURL
```bash
# Fetch user activities
curl -X GET "http://localhost:3001/api/activity/user/john" \
  -H "x-api-key: mk_your_api_key_here"

# Track calculator activity
curl -X POST "http://localhost:3001/api/activity/calculator" \
  -H "x-api-key: mk_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "email": "john@example.com",
    "calculationData": {
      "inputs": {"propertyPrice": 500000},
      "results": {"monthlyPayment": 2500}
    }
  }'
```

## Troubleshooting

**Problem: "API key required" error**
- Ensure you're including the API key in the `x-api-key` header or `Authorization` header

**Problem: "Invalid API key" error**
- Check that the API key is correct and matches the one in the database
- Verify the key hasn't been revoked or deleted

**Problem: "API key has expired" error**
- Generate a new API key or update the expiration date of the existing key

**Problem: "Permission required" error**
- Ensure the API key has the required permission (`read`, `write`, or `admin`)
- Update the key's permissions using the update endpoint

**Problem: "IP address not authorized" error**
- Add your IP address to the key's whitelist
- Remove IP whitelist restrictions if not needed

## Support

For issues or questions:
1. Check the server logs for detailed error messages
2. Verify your API key is active: `POST /api/keys/verify`
3. Review the API key permissions and expiration
4. Contact your system administrator
