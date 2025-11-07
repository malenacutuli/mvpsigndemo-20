# API Rate Limiting System

## Overview

This project implements a comprehensive API rate limiting system that prevents abuse and excessive usage by throttling requests based on user subscription tiers. The system tracks API requests per minute and enforces configurable limits.

## Rate Limits by Subscription Tier

| Tier | Requests per Minute | Use Case |
|------|-------------------|----------|
| **Free** | 10 req/min | Basic testing and evaluation |
| **Starter** | 30 req/min | Small projects and development |
| **Standard** | 100 req/min | Production applications |
| **Advanced** | 500 req/min | High-volume enterprise use |
| **Test Users** | Unlimited | Development and QA (malena@axessible.ai, test@axessible.ai) |

## Database Architecture

### Tables

#### `api_rate_limits`
Tracks API request counts per user per endpoint per time window (1 minute).

- `id`: UUID primary key
- `user_id`: UUID of the user
- `endpoint`: Name of the API endpoint (e.g., "transcribe", "generate-ad")
- `request_count`: Number of requests in current window
- `window_start`: Start of the current time window (minute-granularity)
- `last_request_at`: Timestamp of most recent request
- `created_at`: Record creation timestamp

#### `rate_limit_violations`
Logs all rate limit violations for security monitoring and abuse detection.

- `id`: UUID primary key
- `user_id`: UUID of the user who violated the limit
- `endpoint`: Endpoint that was rate limited
- `attempted_count`: Number of requests attempted
- `limit_exceeded`: The rate limit that was exceeded
- `tier`: User's subscription tier
- `ip_address`: IP address (anonymized)
- `user_agent`: Browser user agent (anonymized)
- `created_at`: Violation timestamp

### Database Functions

#### `check_rate_limit(p_user_id, p_endpoint)`
Checks if a user can make a request and enforces tier-based limits.

**Returns:**
```json
{
  "allowed": true,
  "limit": 100,
  "current": 45,
  "remaining": 55,
  "tier": "standard",
  "message": "Request allowed",
  "test_user": false
}
```

#### `get_rate_limit_status(p_user_id, p_endpoint?)`
Gets current rate limit status for a user.

#### `log_rate_limit_violation(...)`
Logs a rate limit violation for monitoring.

#### `cleanup_old_rate_limits()`
Removes rate limit records older than 1 hour to prevent table bloat.

## Implementation Guide

### 1. Import the Rate Limiter Helper

In your edge function, import the helper functions:

```typescript
import { 
  checkRateLimit, 
  logRateLimitViolation, 
  addRateLimitHeaders 
} from "../_shared/rateLimiter.ts";
```

### 2. Check Rate Limit

Early in your request handler, check the rate limit:

```typescript
// Get authenticated user
const authHeader = req.headers.get('Authorization');
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
  authHeader.replace('Bearer ', '')
);

if (!user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Check rate limit (use descriptive endpoint name)
const rateCheck = await checkRateLimit(
  supabaseClient, 
  user.id, 
  "your-endpoint-name"
);

if (!rateCheck.allowed) {
  // Log the violation
  await logRateLimitViolation(
    supabaseClient,
    user.id,
    "your-endpoint-name",
    rateCheck.current || 0,
    rateCheck.limit || 0,
    rateCheck.tier || 'unknown'
  );

  // Return 429 with rate limit headers
  const responseHeaders = addRateLimitHeaders(
    { ...corsHeaders, 'Content-Type': 'application/json' },
    rateCheck
  );

  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded',
      message: rateCheck.message,
      limit: rateCheck.limit,
      tier: rateCheck.tier,
      retryAfter: rateCheck.retryAfter
    }),
    { 
      status: 429,
      headers: responseHeaders
    }
  );
}

// Continue with your function logic...
console.log('Rate limit check passed:', {
  tier: rateCheck.tier,
  remaining: rateCheck.remaining
});
```

### 3. Add Rate Limit Headers to Success Responses (Optional)

```typescript
const responseHeaders = addRateLimitHeaders(
  { ...corsHeaders, 'Content-Type': 'application/json' },
  rateCheck
);

return new Response(JSON.stringify(result), {
  status: 200,
  headers: responseHeaders
});
```

## Response Headers

The system adds these headers to responses:

- `X-RateLimit-Limit`: Total requests allowed per minute
- `X-RateLimit-Current`: Current request count in window
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Tier`: User's subscription tier
- `Retry-After`: Seconds until next window (on 429 responses)

## Example Edge Function Integration

See `supabase/functions/transcribe/index.ts` for a complete implementation example.

## Monitoring Rate Limit Violations

Query violations for security monitoring:

```sql
-- Recent violations
SELECT 
  v.*,
  s.subscription_tier,
  s.email
FROM rate_limit_violations v
JOIN subscribers s ON v.user_id = s.user_id
WHERE v.created_at > NOW() - INTERVAL '24 hours'
ORDER BY v.created_at DESC;

-- Top violators
SELECT 
  user_id,
  endpoint,
  COUNT(*) as violation_count,
  MAX(attempted_count) as max_attempted,
  tier
FROM rate_limit_violations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id, endpoint, tier
ORDER BY violation_count DESC
LIMIT 20;
```

## Cleanup and Maintenance

The database automatically stores rate limit data for 1 hour. Run cleanup periodically:

```sql
SELECT cleanup_old_rate_limits();
```

Consider setting up a scheduled job (pg_cron) to run this daily.

## Testing Rate Limits

Test users (malena@axessible.ai, test@axessible.ai) bypass all rate limits for development purposes. To test rate limiting:

1. Create a test subscriber with a specific tier
2. Make rapid API calls
3. Verify 429 responses after exceeding tier limit
4. Check `rate_limit_violations` table for logged violations

## Security Considerations

- ✅ RLS policies protect rate limit data (users can only see their own)
- ✅ Violations are logged with anonymized IP addresses
- ✅ Test users are explicitly allowed unlimited access
- ✅ Service role can view all violations for monitoring
- ✅ Rate limits reset every minute (rolling window)

## Upgrading Subscription Tiers

When users upgrade their subscription tier:
1. The `subscribers` table is updated via `system_manage_subscription`
2. Rate limits automatically adjust on next request
3. No manual intervention needed

## Future Enhancements

- [ ] Add daily/monthly request quotas in addition to per-minute limits
- [ ] Implement burst allowances (e.g., allow 10 extra requests if under average)
- [ ] Create admin dashboard for monitoring violations
- [ ] Add webhook notifications for repeated violations
- [ ] Implement IP-based rate limiting for unauthenticated endpoints
- [ ] Add rate limit override capability for specific users/situations
