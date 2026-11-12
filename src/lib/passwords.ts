import bcrypt from "bcryptjs";
import { createHash } from "crypto";

export const BCRYPT_COST = 12;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

// Returns an error message if the password isn't acceptable, otherwise null.
export async function validateNewPassword(password: string): Promise<string | null> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  // bcrypt silently ignores everything past 72 bytes.
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;
  }
  if (await isBreachedPassword(password)) {
    return "That password has appeared in a known data breach. Please choose a different one.";
  }
  return null;
}

// Checks Have I Been Pwned's k-anonymity range API: only the first 5 hex
// characters of the password's SHA-1 are sent, never the password itself.
// If the service is unreachable we allow the password rather than block signup.
async function isBreachedPassword(password: string): Promise<boolean> {
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => {
      const [hashSuffix, count] = line.trim().split(":");
      return hashSuffix === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
