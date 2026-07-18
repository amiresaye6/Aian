# Historical Collection Engine: Provider Integration Guide

Welcome to the Historical Sync Engine! We have recently upgraded the global architecture to support background, paginated historical backfills. This document outlines exactly how to plug your specific provider integration (Slack, GitHub, Zoom, Jira, etc.) into the engine.

## Step 1: Implement the `syncHistoricalResource` Interface

The `ProviderClient` interface now requires a new method called `syncHistoricalResource`. You must implement this in your specific client service (e.g., `GithubClientService`, `JiraClientService`).

```typescript
async syncHistoricalResource(
  connection: ProviderConnection,
  resource: any, // The specific resource (e.g., a channel, a repository, a project)
  fromDate: Date,
  cursor: string | undefined,
  savePageCallback: (rawEvents: any[], nextCursor?: string) => Promise<void>,
): Promise<void>
```

## Step 2: Build the Pagination Loop

Because the global engine cannot know how your provider's API works, **your client service is responsible for handling pagination and rate limiting**.

You must build a `while (hasMore)` loop that fetches data page-by-page.

```typescript
let currentCursor = cursor;
let hasMore = true;

while (hasMore) {
  // 1. Fetch data from your provider's API using `currentCursor`
  // 2. Extract the actual items (e.g., messages, commits, issues)
  // 3. Extract the `nextCursor` from the response metadata
  
  // ... rate limit handling goes here ...
}
```

## Step 3: Pass Data to `savePageCallback`

Inside your pagination loop, once you have successfully fetched a page of data, you must pass it to the `savePageCallback` provided by the engine.

```typescript
// rawEvents should be an array of the raw objects returned by the API
await savePageCallback(rawEvents, nextCursor);

// Advance the loop
currentCursor = nextCursor;
hasMore = !!currentCursor;
```

> **Why this is important:** The `savePageCallback` takes your raw events, passes them to your Provider Adapter to be normalized into `KnowledgeItems`, and securely stores them in the database with strict **idempotency checks**. If the server crashes, the engine will safely resume from the `nextCursor` you passed!

## Step 4: Ensure Your Adapter Can Handle Direct API Objects

Previously, your `ProviderAdapter` (e.g., `GithubAdapterService`) may have been built exclusively to handle Webhook payloads (which often come wrapped in a specific JSON envelope). 

Since the Historical Sync uses standard REST APIs, the objects you pass to `savePageCallback` will likely look different than your Webhooks. **You must update your adapter's `normalizeEvent` method to gracefully handle both Webhook envelopes AND direct API response objects.**

## Step 5: Test Using the Global Postman Collection

We have created a highly parameterized Postman collection so you can easily test the background sync engine.

**File Location:** `server/collections/Aian_Global_API.postman_collection.json`

**How to test your sync:**
1. Import the JSON into Postman.
2. Select some resources for your connection using `POST Update Selected Resources`.
3. Set your connection settings (e.g., `historyBackfillDays`) using `PUT Update Connection Settings`.
4. Trigger the background sync using `POST Start Historical Sync`.
5. Short-poll the progress using `GET Check Historical Sync Status` to see the live JSON progress block update!

---

## Provider-Specific Tips & Gotchas

When building your pagination loops, keep these provider-specific details in mind:

### 🐙 GitHub
- **Pagination Strategy:** GitHub REST API uses `page` and `per_page` query parameters (offset pagination), or `Link` headers for cursor pagination. The GraphQL API uses cursor-based `after` pagination. Use whichever is easiest for your resource.
- **Rate Limits:** The REST API is limited to 5,000 requests per hour for authenticated users. Watch out for the `x-ratelimit-remaining` header! If you hit 0, you must sleep until `x-ratelimit-reset`.

### 💬 Slack
- **Nested Loops:** `conversations.history` only fetches top-level channel messages. If a message has `reply_count > 0`, you must do a nested fetch using `conversations.replies` to get the thread!
- **Rate Limits:** Slack limits history requests to Tier 3 (50 requests per minute). **You must inject a mandatory `await sleep(1200)` delay after every API call** to mathematically prevent hitting the limit. Also, handle `HTTP 429` by parsing the `Retry-After` header.

### 🎥 Zoom
- **Pagination Strategy:** Zoom usually uses `next_page_token` for cursors. 
- **Gotcha:** Fetching `past_meetings` and their associated transcripts/recordings can result in massive JSON payloads. Be careful not to hold too many pages in memory before calling `savePageCallback`.
- **Auth Expiration:** Zoom OAuth tokens expire fast. Ensure your HTTP client can automatically refresh the token if you get a `401 Unauthorized` mid-sync!

### 📊 Jira (Atlassian)
- **Pagination Strategy:** Jira primarily uses Offset Pagination (`startAt` and `maxResults`). Your `cursor` variable will actually just be a stringified integer (e.g., `"100"`).
- **Nested Fetching:** If you are fetching Issues (`/rest/api/3/search`), the issue payload does not always include the full comment history. You may need a nested loop to hit `/rest/api/3/issue/{issueIdOrKey}/comment` for active tickets.
