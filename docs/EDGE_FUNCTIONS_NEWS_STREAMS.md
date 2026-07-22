# Edge Functions: News & Live Streams

## Overview

Two Supabase Edge Functions power the News Feed system:

1. **`find-live-streams`** — Detects live YouTube streams for news channels
2. **`fetch-news`** — Fetches news articles from multiple providers with fallback

---

## 1. `find-live-streams` Edge Function

### Purpose
Automatically detects currently live YouTube streams for built-in and custom news channels using the YouTube Data API v3, with scraping and fallback strategies.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY_ONE` | Recommended | Primary YouTube Data API v3 key |
| `YOUTUBE_API_KEY_TWO` | Optional | Backup key for automatic quota failover |
| `YOUTUBE_API_KEY` | Legacy | Backward-compatible key name (used if ONE/TWO not set) |

### Dual API Key Failover

The function supports **automatic failover** between two YouTube API keys:

1. **Primary key** (`YOUTUBE_API_KEY_ONE`) is used first for all API calls
2. When quota is exhausted (HTTP 403 with `quotaExceeded` reason), the function automatically switches to `YOUTUBE_API_KEY_TWO`
3. Each key has an independent **10-minute cooldown** after quota exhaustion
4. When cooldown expires, the key is re-enabled
5. If both keys are exhausted, the function falls back to scraping and fallback video IDs

### Detection Strategies (in order)

1. **Manual Override** — User-specified video IDs take highest priority
2. **YouTube API Search (Channel)** — Search within the channel for live videos
3. **YouTube API Search (General)** — General search with channel name verification
4. **Page Scraping** — Scrapes the channel's `/live` page for video IDs
5. **Fallback Video IDs** — Uses hardcoded known-good video IDs

### API Endpoints

#### Health Check
```json
POST /find-live-streams
{
  "healthCheck": true,
  "testQuota": true  // optional: actually test API key validity
}
```

Response:
```json
{
  "success": true,
  "healthCheck": true,
  "health": {
    "apiKeyConfigured": true,
    "apiKeyOneConfigured": true,
    "apiKeyTwoConfigured": true,
    "activeKeySlot": "one",
    "quotaExhausted": false,
    "quotaAvailable": true,
    "apiKeyValid": true,
    "quotaTestError": null,
    "cacheStatus": "valid",
    "cacheAge": 120,
    "lastSuccessfulApiCall": "2026-02-22T00:30:00.000Z"
  }
}
```

#### Detect Streams
```json
POST /find-live-streams
{
  "forceRefresh": false,
  "manualOverrides": {
    "nbc": "VIDEO_ID_HERE"
  },
  "customChannels": [
    {
      "channelId": "UC...",
      "name": "My Channel",
      "customHandle": "mychannel"
    }
  ]
}
```

#### Resolve Channel Names
```json
POST /find-live-streams
{
  "resolveNames": true,
  "channelIds": ["UCeY0bbntWzzVIaj2z3QigXg"]
}
```

### Built-in Channels

| ID | Channel | Channel ID |
|----|---------|------------|
| nbc | NBC News NOW | UCeY0bbntWzzVIaj2z3QigXg |
| cnn | CNN | UCupvZG-5ko_eiXAupbDfxWw |
| sky | Sky News | UCoMdktPbSTixAyNGwb-UYkQ |
| abc | ABC News | UCBi2mrWuNuyYy4gbM6fU18Q |
| fox | Fox News | UCXIJgqnII2ZOINSWNOGFThA |
| msnbc | MSNBC | UCaXkIU1QidjPwiAYu6GcHjg |
| aljazeera | Al Jazeera English | UCNye-wNBqNL5ZzHSJj3l8Bg |
| france24 | France 24 English | UCQfwfsi5VrQ8yKZ-UWmAEFg |
| bbc | BBC News | UC16niRr50-MSBwiO3YDb3RA |

### Caching

- **Memory cache TTL**: 20 minutes
- Cache is keyed by the set of channel IDs
- Manual overrides bypass the cache
- `forceRefresh: true` bypasses the cache

### Quota Management

- YouTube Data API v3 free tier: **10,000 units/day**
- Each `search.list` call costs ~100 units
- Each `videos.list` call costs ~1 unit
- The function batches channels (3 at a time) to control API usage
- Quota cooldown: 10 minutes per key

---

## 2. `fetch-news` Edge Function

### Purpose
Fetches news articles from multiple providers with automatic fallback, caching, and rate limiting.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GATEWAY_API_KEY` | Recommended | Gateway News API key (primary provider) |
| `GNEWS_API_KEY` | Optional | GNews API key (fallback provider) |

### News Providers (in priority order)

1. **Gateway API** — High-quality news articles from gateway.fastrouter.io
2. **GNews API** — Free tier with 100 requests/day from gnews.io
3. **RSS Feeds** — Server-side RSS parsing from NYT, BBC, Guardian, Reuters
4. **Client-side RSS** — Browser-based RSS fallback (handled by frontend)

### API Endpoints

#### Health Check
```json
POST /fetch-news
{
  "healthCheck": true
}
```

Response:
```json
{
  "success": true,
  "healthCheck": true,
  "version": "v6",
  "health": {
    "primaryApiConfigured": true,
    "gnewsApiConfigured": true,
    "gnewsRateLimit": {
      "remaining": 95,
      "limit": 100,
      "resetsIn": "18h",
      "allowed": true
    },
    "cacheStatus": "has_entries",
    "lastProvider": "gateway",
    "fallbacksAvailable": ["gnews", "rss"]
  }
}
```

#### Fetch Articles
```json
POST /fetch-news
{
  "query": "technology",
  "count": 30,
  "category": "technology",
  "forceRefresh": false,
  "preferredProviders": ["gateway", "gnews", "rss"]
}
```

### GNews Rate Limiting

- Free tier: **100 requests/day**
- Rate limit counter resets every 24 hours
- When limit is reached, GNews is skipped and RSS fallback is used
- Rate limit status is included in health check responses

### Category Mapping (GNews)

| Input | GNews Category |
|-------|---------------|
| technology, tech | technology |
| business, finance | business |
| sports, sport | sports |
| entertainment | entertainment |
| health | health |
| science | science |
| world | world |
| nation, politics | nation |

### Caching

- **Memory cache TTL**: 7 minutes
- Cache key: `query|count|category`
- `forceRefresh: true` bypasses the cache

---

## Deployment

### Prerequisites
- Supabase project with Edge Functions enabled
- API keys added as Edge Function secrets

### Adding Secrets

1. Go to your Supabase Dashboard → Edge Functions → Secrets
2. Add the following secrets:

```
YOUTUBE_API_KEY_ONE = <your-primary-youtube-api-key>
YOUTUBE_API_KEY_TWO = <your-backup-youtube-api-key>
GATEWAY_API_KEY = <your-gateway-api-key>
GNEWS_API_KEY = <your-gnews-api-key>
```

3. After adding secrets, edge functions may take **1-5 minutes** to pick up new secrets on their next cold start
4. You can verify by clicking "Refresh" on the Health Check tab in News Feed Settings

### Getting API Keys

#### YouTube Data API v3
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project and enable "YouTube Data API v3"
3. Create an API Key under Credentials
4. (Optional) Restrict the key to YouTube Data API v3 only

#### GNews API
1. Go to [gnews.io](https://gnews.io)
2. Sign up for a free account
3. Copy your API key from the dashboard
4. Free tier: 100 requests/day

#### Gateway News API
Pre-configured with the platform. Contact system administrator if issues arise.

---

## Troubleshooting

### Edge Function Not Reachable
- Check that edge functions are deployed in your Supabase project
- Edge functions may need redeployment after Supabase updates
- Client-side RSS fallback is always available as a safety net

### YouTube API Quota Exhausted
- Both keys will show "quota exhausted" in health check
- Quota resets daily at midnight Pacific Time
- The system automatically falls back to scraping and fallback video IDs
- Consider adding a second API key for failover

### GNews Not Working
- Verify the secret name is exactly `GNEWS_API_KEY` (case-sensitive)
- Check rate limit status in health check
- Free tier resets every 24 hours

### News Not Loading
- Check the Health Check tab in News Feed Settings
- Verify edge functions are deployed and reachable
- Client-side RSS fallback should always work
- Check browser console for specific error messages
