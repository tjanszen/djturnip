import { createHash } from "crypto";

/**
 * =============================================================================
 * REMIX PAGE ID UTILITIES
 * =============================================================================
 * Reference: docs/agent_memory/imp_plans/persisted_page_urls.md
 *
 * Provides deterministic URL normalization and ID generation for persisted
 * remix pages. Multiple generations per same URL are allowed (no dedupe).
 *
 * ID Strategy:
 * - source_url_hash = hashHex(normalizedUrl)[0:12] (base)
 * - run_suffix = hashHex(normalizedUrl + ":" + createdAtISO)[0:8]
 * - pageId = source_url_hash + "_" + run_suffix
 * =============================================================================
 */

/**
 * Normalize a URL for consistent hashing:
 * - Trim whitespace
 * - Lowercase hostname
 * - Remove URL fragment (#...)
 * - Remove common tracking params (utm_*, fbclid, gclid)
 */
export function normalizeUrl(inputUrl: string): string {
  try {
    const trimmed = inputUrl.trim();
    const url = new URL(trimmed);
    
    url.hostname = url.hostname.toLowerCase();
    
    url.hash = "";
    
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "fbclid", "gclid", "msclkid", "ref", "source"
    ];
    trackingParams.forEach(param => url.searchParams.delete(param));
    
    url.searchParams.sort();
    
    return url.toString();
  } catch {
    return inputUrl.trim().toLowerCase();
  }
}

/**
 * Extract the hostname/domain from a URL.
 * Returns null if parsing fails.
 */
export function extractDomain(inputUrl: string): string | null {
  try {
    const url = new URL(inputUrl.trim());
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Generate a truncated SHA-256 hash of a string (hex format).
 * Default length is 16 characters for readability.
 */
export function hashHex(s: string, length: number = 16): string {
  const hash = createHash("sha256").update(s).digest("hex");
  return hash.slice(0, length);
}

/**
 * Generate a deterministic page ID for a remix page.
 * 
 * @param normalizedUrl - The normalized source URL
 * @param createdAt - The creation timestamp (ISO string)
 * @returns pageId in format: "base_runSuffix"
 */
export function generatePageId(normalizedUrl: string, createdAt: string): string {
  const base = hashHex(normalizedUrl, 12);
  const runSuffix = hashHex(`${normalizedUrl}:${createdAt}`, 8);
  return `${base}_${runSuffix}`;
}

/**
 * Compute all remix page ID components from a source URL and timestamp.
 * 
 * @param sourceUrl - The original input URL
 * @param createdAt - The creation timestamp (Date object)
 * @returns Object with all ID components needed for DB insert
 */
export function computeRemixPageIdComponents(sourceUrl: string, createdAt: Date): {
  pageId: string;
  sourceUrlNormalized: string;
  sourceUrlHash: string;
  sourceDomain: string | null;
  createdAtIso: string;
} {
  const sourceUrlNormalized = normalizeUrl(sourceUrl);
  const sourceUrlHash = hashHex(sourceUrlNormalized, 12);
  const sourceDomain = extractDomain(sourceUrl);
  const createdAtIso = createdAt.toISOString();
  const pageId = generatePageId(sourceUrlNormalized, createdAtIso);
  
  return {
    pageId,
    sourceUrlNormalized,
    sourceUrlHash,
    sourceDomain,
    createdAtIso,
  };
}
