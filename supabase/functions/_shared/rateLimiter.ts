/**
 * Rate Limiting Helper for Supabase Edge Functions
 * 
 * This module provides rate limiting functionality based on user subscription tiers.
 * 
 * Rate Limits by Tier (requests per minute):
 * - Free: 10 requests/min
 * - Starter: 30 requests/min
 * - Standard: 100 requests/min
 * - Advanced: 500 requests/min
 * - Test Users: Unlimited
 * 
 * Usage:
 * ```typescript
 * import { checkRateLimit } from "../_shared/rateLimiter.ts";
 * 
 * const rateCheck = await checkRateLimit(supabaseClient, userId, "transcribe");
 * if (!rateCheck.allowed) {
 *   return new Response(
 *     JSON.stringify({ 
 *       error: rateCheck.message,
 *       retryAfter: rateCheck.retryAfter 
 *     }),
 *     { 
 *       status: 429,
 *       headers: {
 *         ...corsHeaders,
 *         "Content-Type": "application/json",
 *         "Retry-After": rateCheck.retryAfter?.toString() || "60"
 *       }
 *     }
 *   );
 * }
 * ```
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface RateLimitResult {
  allowed: boolean;
  limit?: number;
  current?: number;
  remaining?: number;
  tier?: string;
  message: string;
  retryAfter?: number;
  testUser?: boolean;
}

/**
 * Check if a user can make a request based on their subscription tier rate limits
 * 
 * @param supabaseClient - Supabase client with service role access
 * @param userId - UUID of the user making the request
 * @param endpoint - Name of the endpoint being accessed (e.g., "transcribe", "generate-ad")
 * @returns RateLimitResult indicating if request is allowed
 */
export async function checkRateLimit(
  supabaseClient: SupabaseClient,
  userId: string,
  endpoint: string
): Promise<RateLimitResult> {
  try {
    // Call the database function to check rate limit
    const { data, error } = await supabaseClient.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: endpoint,
    });

    if (error) {
      console.error("Rate limit check error:", error);
      // On error, allow the request but log it
      return {
        allowed: true,
        message: "Rate limit check failed, allowing request",
      };
    }

    return {
      allowed: data.allowed,
      limit: data.limit,
      current: data.current,
      remaining: data.remaining,
      tier: data.tier,
      message: data.message,
      retryAfter: data.retry_after,
      testUser: data.test_user || false,
    };
  } catch (err) {
    console.error("Rate limit exception:", err);
    // On exception, allow the request but log it
    return {
      allowed: true,
      message: "Rate limit check exception, allowing request",
    };
  }
}

/**
 * Log a rate limit violation for monitoring and abuse detection
 * 
 * @param supabaseClient - Supabase client with service role access
 * @param userId - UUID of the user who violated the limit
 * @param endpoint - Name of the endpoint that was rate limited
 * @param attemptedCount - Number of requests attempted
 * @param limit - The rate limit that was exceeded
 * @param tier - User's subscription tier
 * @param ipAddress - Optional IP address of the requester
 * @param userAgent - Optional user agent string
 */
export async function logRateLimitViolation(
  supabaseClient: SupabaseClient,
  userId: string,
  endpoint: string,
  attemptedCount: number,
  limit: number,
  tier: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const { error } = await supabaseClient.rpc("log_rate_limit_violation", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_attempted_count: attemptedCount,
      p_limit: limit,
      p_tier: tier,
      p_ip_address: ipAddress || null,
      p_user_agent: userAgent || null,
    });

    if (error) {
      console.error("Failed to log rate limit violation:", error);
    }
  } catch (err) {
    console.error("Exception logging rate limit violation:", err);
  }
}

/**
 * Get the current rate limit status for a user
 * 
 * @param supabaseClient - Supabase client (user or service role)
 * @param userId - UUID of the user
 * @param endpoint - Optional specific endpoint to check
 * @returns Array of rate limit status for endpoints
 */
export async function getRateLimitStatus(
  supabaseClient: SupabaseClient,
  userId: string,
  endpoint?: string
): Promise<any[]> {
  try {
    const { data, error } = await supabaseClient.rpc("get_rate_limit_status", {
      p_user_id: userId,
      p_endpoint: endpoint || null,
    });

    if (error) {
      console.error("Get rate limit status error:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Exception getting rate limit status:", err);
    return [];
  }
}

/**
 * Add rate limit headers to a response
 * 
 * @param headers - Existing headers object
 * @param rateLimitResult - Result from checkRateLimit
 * @returns Updated headers object
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  rateLimitResult: RateLimitResult
): Record<string, string> {
  const updatedHeaders = { ...headers };

  if (rateLimitResult.limit !== undefined) {
    updatedHeaders["X-RateLimit-Limit"] = rateLimitResult.limit.toString();
  }

  if (rateLimitResult.current !== undefined) {
    updatedHeaders["X-RateLimit-Current"] = rateLimitResult.current.toString();
  }

  if (rateLimitResult.remaining !== undefined) {
    updatedHeaders["X-RateLimit-Remaining"] = rateLimitResult.remaining.toString();
  }

  if (rateLimitResult.retryAfter !== undefined) {
    updatedHeaders["Retry-After"] = rateLimitResult.retryAfter.toString();
  }

  if (rateLimitResult.tier) {
    updatedHeaders["X-RateLimit-Tier"] = rateLimitResult.tier;
  }

  return updatedHeaders;
}
