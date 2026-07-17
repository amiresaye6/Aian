# Slack Integration API Documentation

This document outlines all the endpoints related to the Slack integration, including the OAuth flow, connection health checking, resource fetching, disconnecting, and sending messages.

---

## 1. Install (Start OAuth Flow)

Initiates the Slack OAuth process by redirecting the user to Slack's consent screen.

**Endpoint:** `GET /api/v1/integrations/slack/install`

### Request Parameters (Query)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationEyeId` | string (UUID) | Yes | The ID of the OrganizationEye to attach this connection to. |

### Request Example
```http
GET /api/v1/integrations/slack/install?organizationEyeId=d155bd83-8327-4414-b5c9-041f1efb86fd
```

### Response
*Does not return JSON.* Redirects (302 Found) to `https://slack.com/oauth/v2/authorize`.

---

## 2. Callback (Complete OAuth Flow)

Handles the redirect from Slack, exchanges the temporary code for a permanent access token, and creates a `ProviderConnection` in the database.

**Endpoint:** `GET /api/v1/integrations/slack/callback`

### Request Parameters (Query)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | The temporary OAuth code provided by Slack. |
| `state` | string (UUID) | Yes | The `organizationEyeId` passed during the install step. |

### Request Example
```http
GET /api/v1/integrations/slack/callback?code=12345.67890.abcde&state=d155bd83-8327-4414-b5c9-041f1efb86fd
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Slack connected successfully!",
  "data": {
    "connectionId": "76f903f9-556d-4d88-896f-41500c53167e",
    "teamName": "ITI_Graduation_Project",
    "teamId": "T0BGJHG4U6B"
  }
}
```

### Error Response (400 Bad Request)
```json
{
  "message": "Missing 'code' or 'state' in callback parameters",
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## 3. Health Check

Verifies if the stored Slack credentials are still valid by pinging the Slack `auth.test` API.

**Endpoint:** `GET /api/v1/eyes/:connectionId/health`

### Request Example
```http
GET /api/v1/eyes/76f903f9-556d-4d88-896f-41500c53167e/health
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "details": {
      "app_id": "A012345678",
      "bot_id": "B012345678",
      "team": "ITI_Graduation_Project",
      "team_id": "T0BGJHG4U6B"
    }
  }
}
```

### Error Response (200 OK - Invalid Token)
```json
{
  "success": true,
  "data": {
    "isValid": false,
    "error": "invalid_auth"
  }
}
```
*(Note: A failed token validation still returns a 200 HTTP status because the health check itself executed successfully, but the `isValid` payload indicates the connection is dead.)*

---

## 4. Fetch Available Resources (Channels)

Retrieves all the resources (public channels, private channels the bot is in) that this Slack connection can monitor.

**Endpoint:** `GET /api/v1/eyes/:connectionId/resources/available`

### Request Example
```http
GET /api/v1/eyes/76f903f9-556d-4d88-896f-41500c53167e/resources/available
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "resourceId": "C0BGJMBSS23",
      "name": "general",
      "type": "channel"
    },
    {
      "resourceId": "C0123456789",
      "name": "random",
      "type": "channel"
    }
  ]
}
```

---

## 5. Send Message

Sends a message to a specific Slack channel or user. This delegates to the global `MessagesService` under the hood.

**Endpoint:** `POST /api/v1/eyes/:connectionId/messages`

### Request Body (JSON)
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetId` | string | Yes | The Slack channel ID (`C...`), user ID (`U...`), or DM ID (`D...`). |
| `text` | string | Yes | The text content of the message. Supports Slack's `mrkdwn` formatting. |
| `blocks` | array | No | Optional Block Kit blocks for complex UI. |
| `threadId` | string | No | The `ts` (timestamp string) of a parent message to reply to. |
| `broadcastReply` | boolean | No | If replying to a thread, sets whether it is broadcast to the main channel. |

### Request Example
```http
POST /api/v1/eyes/76f903f9-556d-4d88-896f-41500c53167e/messages
Content-Type: application/json

{
  "targetId": "C0BGJMBSS23",
  "text": "🚀 *Hello from Aian!*"
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "messageId": "1721060933.000100",
    "channelId": "C0BGJMBSS23"
  }
}
```

### Validation Error Response (400 Bad Request)
```json
{
  "message": [
    "targetId should not be empty",
    "targetId must be a string",
    "text should not be empty",
    "text must be a string"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

### Provider Error Response (200 OK with success=false)
```json
{
  "success": false,
  "error": "channel_not_found"
}
```

---

## 6. Disconnect / Revoke Connection

Deletes the connection from our database, updates the parent OrganizationEye status to `disconnected`, and fires a revocation request to the Slack API so the token is invalidated on their end.

**Endpoint:** `DELETE /api/v1/eyes/:connectionId`

### Request Example
```http
DELETE /api/v1/eyes/76f903f9-556d-4d88-896f-41500c53167e
```

### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Connection deleted successfully"
}
```

### Error Response (404 Not Found)
```json
{
  "message": "Connection not found",
  "error": "Not Found",
  "statusCode": 404
}
```
