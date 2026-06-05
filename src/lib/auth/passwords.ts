import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const algorithm = "sha256";
const iterations = 210_000;
const keyLength = 32;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, algorithm).toString("hex");

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationText, salt, expectedHash] = storedHash.split("$");

  if (scheme !== "pbkdf2_sha256" || !iterationText || !salt || !expectedHash) {
    return false;
  }

  const parsedIterations = Number(iterationText);
  if (!Number.isInteger(parsedIterations) || parsedIterations <= 0) {
    return false;
  }

  const actual = Buffer.from(
    pbkdf2Sync(password, salt, parsedIterations, keyLength, algorithm).toString("hex"),
    "hex",
  );
  const expected = Buffer.from(expectedHash, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
