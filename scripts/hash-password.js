#!/usr/bin/env node
/**
 * Generates a value for the ADMIN_PASSWORD_HASH_BASE64 environment variable.
 *
 * IMPORTANT: the hash is base64-encoded before being printed. A raw bcrypt
 * hash looks like "$2b$12$..." — and Next.js's .env loader (like many env
 * file loaders) performs shell-style "$VAR" expansion on values, which
 * silently mangles/truncates a hash containing literal "$" characters.
 * Base64-encoding sidesteps that landmine entirely, regardless of shell or
 * loader quirks on whatever machine ends up running this.
 *
 * Usage:
 *   node scripts/hash-password.js "yourStrongPassword"
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
const encoded = Buffer.from(hash, "utf8").toString("base64");

console.log("\nAdd this to your .env file:\n");
console.log(`ADMIN_PASSWORD_HASH_BASE64="${encoded}"`);
console.log("");
