# Zoom Integration API Documentation

This document outlines all the endpoints related to the Zoom integration, including the OAuth flow, connection health checking, resource fetching, meeting webhooks, and the MeetingBaas bot pipeline used to record and transcribe meetings.

Unlike other providers, the Zoom integration is composed of **two connected systems**:

1. **Zoom** — OAuth connection, meeting metadata, and the `meeting.started` / `meeting.ended` webhook events.
2. **MeetingBaas** — a third-party bot service that joins the live Zoom meeting to record, transcribe, and summarize it, then calls back with the results.

---

## 1. Install (Start OAuth Flow)

Initiates the Zoom OAuth process by redirecting the user to Zoom's consent screen.

**Endpoint:** `GET /integrations/zoom/install`

### Request Parameters (Query)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationEyeId` | string (UUID) | Yes | The ID of the OrganizationEye to attach this connection to. |

### Request Example
```http
GET /integrations/zoom/install?organizationEyeId=d155bd83-8327-4414-b5c9-041f1efb86fd
```

### Response
*Does not return JSON.* Redirects (302 Found) to `https://zoom.us/oauth/authorize`.

### Error Response (400 Bad Request)
```json
{
  "message": "Missing organizationEyeId query parameter",
  "error": "Bad Request",
  "statusCode": 400
}
```
Also returned if `ZOOM_CLIENT_ID` is not configured on the server.

---

## 2. Callback (Complete OAuth Flow)

Handles the redirect from Zoom, exchanges the temporary code for an access/refresh token pair, fetches the connected user's profile from `/v2/users/me`, and creates a `ProviderConnection` in the database. On success it redirects the browser to the frontend rather than returning JSON.

**Endpoint:** `GET /integrations/zoom/callback`

### Request Parameters (Query)
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | The temporary OAuth code provided by Zoom. |
| `state` | string (UUID) | Yes | The `organizationEyeId` passed during the install step. |
| `error` | string | No | Present if the user denied the authorization request. |

### Request Example
```http
GET /integrations/zoom/callback?code=abc123&state=d155bd83-8327-4414-b5c9-041f1efb86fd
```

### What happens on success
1. The `code` is exchanged for `access_token` / `refresh_token` at `https://zoom.us/oauth/token` (Basic auth using `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET`).
2. Both tokens are encrypted at rest via `EncryptionService`.
3. The user's Zoom profile is fetched from `https://api.zoom.us/v2/users/me` to obtain `account_id` (stored as `externalAccountId`) and `display_name` (stored as `externalAccountName`).
4. A per-connection webhook secret (`ZOOM_WEBHOOK_SECRET`) is encrypted and stored alongside the connection, since Zoom webhook signatures are validated per-account.
5. The parent `OrganizationEye` status is updated to `connected`.
6. The browser is redirected to `${FRONTEND_URL}/eyes/zoom/redirect`.

### Success Response
Not JSON — a `302` redirect to the frontend success URL.

### Error Response (400 Bad Request)
```json
{
  "message": "Zoom authorization was denied: access_denied",
  "error": "Bad Request",
  "statusCode": 400
}
```
Also returned for a missing `code`/`state`, an unknown `organizationEyeId`, a missing `zoom` provider row (seed not run), or any failure during the token exchange / profile fetch (logged as `Failed to complete Zoom OAuth flow`).

---

## 3. Test Connection (Health Check + Resources)

Verifies the stored Zoom credentials are still valid and, if so, immediately fetches the connection's available resources (scheduled meetings) in the same call. Automatically refreshes an expired access token before retrying.

**Endpoint:** `GET /integrations/zoom/test-client/:connectionId`

### Request Example
```http
GET /integrations/zoom/test-client/76f903f9-556d-4d88-896f-41500c53167e
```

### Success Response (200 OK)
```json
{
  "healthCheck": {
    "isValid": true,
    "message": "Connected as Muhammad Elazzazy (mohamadelazzazy@gmail.com)"
  },
  "resourcesFound": 2,
  "resources": [
    {
      "externalResourceId": "86537167305",
      "name": "Muhammad Elazzazy's Zoom Meeting",
      "resourceType": "meeting",
      "metadata": {
        "start_time": "2026-07-20T10:00:00Z",
        "duration": 30,
        "timezone": "Africa/Cairo",
        "join_url": "https://us05web.zoom.us/j/..."
      }
    }
  ]
}
```

### Connection Not Found (200 OK)
```json
{
  "error": "Connection record not found in database"
}
```

### Invalid Token Response (200 OK)
```json
{
  "healthCheck": {
    "isValid": false,
    "message": "Failed to connect with Zoom: <zoom error message>"
  },
  "resourcesFound": 0,
  "resources": []
}
```
*(Note: like the Slack health check, an invalid connection still returns HTTP 200 — the endpoint executed successfully, but the `isValid` flag reports the connection is dead.)*

---

## 4. Fetch Scheduled Meetings

Retrieves the connected Zoom user's upcoming scheduled meetings without performing an explicit health-check step first (`getResources` re-verifies internally).

**Endpoint:** `GET /zoom/scheduled/:connectionId`

### Request Example
```http
GET /zoom/scheduled/76f903f9-556d-4d88-896f-41500c53167e
```

### Success Response (200 OK)
```json
{
  "resourcesFound": 1,
  "resources": [
    {
      "externalResourceId": "86537167305",
      "name": "Weekly Sync",
      "resourceType": "meeting",
      "metadata": {
        "start_time": "2026-07-25T09:00:00Z",
        "duration": 60,
        "timezone": "Africa/Cairo",
        "join_url": "https://us05web.zoom.us/j/..."
      }
    }
  ]
}
```

### Connection Not Found (200 OK)
```json
{
  "error": "Connection record not found in database"
}
```

### Provider Error (200 OK)
```json
{
  "resourcesFound": 1,
  "resources": [
    { "error": "Failed to fetch resources: <zoom error message>" }
  ]
}
```

---

## 5. Zoom Event Webhook

Receives real-time meeting lifecycle events from Zoom (e.g. `meeting.started`, `meeting.ended`). Every request is validated against Zoom's HMAC signature scheme before any processing happens.

**Endpoint:** `POST /events/zoom`

### Signature Validation
Zoom signs each webhook using the per-account `ZOOM_WEBHOOK_SECRET` stored on the connection:
1. Reject if `x-zm-signature` or `x-zm-request-timestamp` headers are missing.
2. Reject if the timestamp is more than 5 minutes old (replay protection).
3. Compute `v0=` + `HMAC-SHA256("v0:{timestamp}:{rawBody}", secret)` and compare it to `x-zm-signature` using a timing-safe comparison.

### Request Example
```http
POST /events/zoom
Content-Type: application/json
x-zm-signature: v0=...
x-zm-request-timestamp: 1784327121

{
  "event": "meeting.started",
  "payload": {
    "account_id": "Ws9lYbOZT56qC8fzSVx-zg",
    "object": {
      "id": "86537167305",
      "topic": "Muhammad Elazzazy's Zoom Meeting",
      "host_id": "DzQ9MFEBTnWCbA79wfNsww"
    }
  },
  "event_ts": 1784327121469
}
```

### Behavior on `meeting.started`
1. The matching `ProviderConnection` is looked up by `payload.account_id`.
2. The live `join_url` is re-fetched via `GET /v2/meetings/:meetingId` (the URL in the webhook payload can be stale/incomplete).
3. A MeetingBaas bot ("Aian bot") is created against that `join_url` so it can join and record the meeting.

Failures while triggering the MeetingBaas bot are logged but do **not** fail the webhook response — Zoom always receives a `200 OK` as long as signature validation passed.

### Success Response (200 OK)
```json
{ "received": true }
```

### Error Responses
```json
// Missing/unknown account_id, provider, or connection
{
  "message": "connection not found",
  "error": "Not Found",
  "statusCode": 404
}
```
```json
// Signature check failed
{
  "message": "Zoom Webhook Signature comparison mismatch.",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

## 6. MeetingBaas Event Webhook

Receives lifecycle events from the MeetingBaas bot (the recording assistant spawned in step 5). The relevant event is `bot.completed`, which carries the recording, transcript, and summary once the bot leaves the meeting.

**Endpoint:** `POST /events/meeting-baas`

### Signature Validation
Validated via Svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) against `MEETING_BAAS_WEBHOOK_SECRET`, rather than Zoom's HMAC scheme:
1. Reject if the webhook secret or any Svix header is missing.
2. Build the signed content as `{svix-id}.{svix-timestamp}.{rawBody}`.
3. Compute an HMAC-SHA256 (base64) using the secret (stripping the `whsec_` prefix and base64-decoding it if present).
4. Accept if any signature in `svix-signature` matches the computed value, with or without a `v1,` prefix.

### Request Example
```http
POST /events/meeting-baas
Content-Type: application/json
svix-id: msg_...
svix-timestamp: 1784327200
svix-signature: v1,base64signature==

{
  "event": "bot.completed",
  "data": {
    "bot_id": "2380152a-29c5-41cf-8dd7-6589360fe4d6",
    "duration_seconds": 1830,
    "joined_at": "2026-07-17T22:24:20Z",
    "exited_at": "2026-07-17T22:55:10Z",
    "participants": [{ "id": 101, "name": "Muhammad Elazzazy" }],
    "speakers": ["Muhammad Elazzazy"],
    "transcription": "https://s3.../transcription.json",
    "raw_transcription": "https://s3.../raw_transcription.json",
    "video": "https://s3.../video.mp4",
    "audio": "https://s3.../audio.mp3"
  }
}
```

### Behavior on `bot.completed`
1. The `ProviderConnection` is matched by `bot_id`, which was stored on `connectionMetadata` when the bot was created.
2. The transcription and raw-transcription JSON files are fetched from their S3 URLs.
3. A normalized `transcriptionText` is built from the `utterances` array (`[Speaker]: text` per line), falling back to a plain `transcription` field if utterances aren't present.
4. `summarization` and `full_transcription` are pulled from the raw transcription payload's `payload.summarization.results` / `payload.transcription.full_transcript`.
5. The compiled meeting object (duration, participants, speakers, transcript, summary, video/audio URLs, and the Zoom account name) replaces `req.body.data` and is handed to the shared `WebhookService` for downstream ingestion into `KnowledgeItem`s.

Downstream ingestion failures (e.g. signature mismatch inside the shared `WebhookService`) are caught and logged as a warning — they don't bubble up as an error response, since the MeetingBaas-side webhook has already been accepted.

### Success Response (200 OK)
```json
{ "received": true }
```

### Error Responses
```json
// Missing bot_id
{
  "message": "bot_id is missing from webhook body",
  "error": "Not Found",
  "statusCode": 404
}
```
```json
// No connection found for this bot_id
{
  "message": "couldn't find connection",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

## Notes on Token Lifecycle

- Access tokens are short-lived; `ZoomClientService.verifyConnection` and `getMeetingDetails` transparently call `refreshAccessToken` on a `401` and retry once.
- `refreshAccessToken` uses the stored (encrypted) refresh token, calls `https://zoom.us/oauth/token` with `grant_type=refresh_token`, and persists the new encrypted access/refresh tokens and expiry back onto the `ProviderConnection` row.
- `revokeCredentials` calls `https://zoom.us/oauth/revoke` to invalidate the token on Zoom's side when a connection is disconnected.

## Environment Variables

| Variable | Used By | Purpose |
|---|---|---|
| `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | `ZoomAuthController`, `ZoomClientService` | OAuth app credentials for the token exchange, refresh, and revoke calls. |
| `ZOOM_REDIRECT_URI` | `ZoomAuthController` | Must match the redirect URI registered in the Zoom app config. |
| `ZOOM_WEBHOOK_SECRET` | `ZoomAuthController`, `ZoomWebhookValidator` | Per-account secret used to validate `x-zm-signature` on incoming Zoom webhooks. |
| `MEET_BAAS_API_KEY` | `MeetingBaasService` | API key for all MeetingBaas REST calls (`/bots`). |
| `MEETING_BAAS_REDIRECT_URI` | `MeetingBaasService` | Used both as the callback URL and the callback signing secret when creating a bot. |
| `MEETING_BAAS_WEBHOOK_SECRET` | `ZoomWebhookValidator` | Svix signing secret used to validate incoming MeetingBaas webhooks. |
| `FRONTEND_URL` | `ZoomAuthController` | Base URL the browser is redirected to after a successful OAuth callback. |
