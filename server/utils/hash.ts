import { createHash } from "crypto";

/**
 * Normalizes a string value and returns its SHA-256 hex digest.
 *
 * Facebook requires all PII (email, phone, name, etc.) to be hashed
 * before transmission. The value must be trimmed and lowercased prior
 * to hashing, as specified in the CAPI customer information parameters
 * documentation.
 *
 * Parameters that must NOT be hashed — client_ip_address,
 * client_user_agent, fbc, and fbp — are passed as plain text.
 *
 * @param value - Raw string to normalize and hash (e.g. an email address).
 * @returns Hex-encoded SHA-256 digest, or null if no value is provided.
 */
export function hashValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}
