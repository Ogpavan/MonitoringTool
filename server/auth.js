import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getConnection } from './db.js';

const scrypt = promisify(scryptCallback);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function sanitizeUserRecord(record) {
  return {
    id: record.id,
    firstName: record.first_name,
    lastName: record.last_name,
    fullName: `${record.first_name} ${record.last_name}`.trim(),
    teamName: record.team_name,
    email: record.email,
    createdAt: record.created_at
  };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return {
    salt,
    hash: Buffer.from(derivedKey).toString('hex')
  };
}

async function verifyPassword(password, salt, expectedHash) {
  const derivedKey = await scrypt(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  const derivedBuffer = Buffer.from(derivedKey);

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedBuffer);
}

export async function ensureAuthSchema() {
  const connection = await getConnection();

  try {
    await connection.query(`
      IF OBJECT_ID('dbo.app_users', 'U') IS NULL
      BEGIN
        CREATE TABLE dbo.app_users (
          id INT IDENTITY(1,1) PRIMARY KEY,
          first_name NVARCHAR(100) NOT NULL,
          last_name NVARCHAR(100) NOT NULL,
          team_name NVARCHAR(150) NOT NULL,
          email NVARCHAR(255) NOT NULL,
          normalized_email NVARCHAR(255) NOT NULL,
          password_salt NVARCHAR(255) NOT NULL,
          password_hash NVARCHAR(255) NOT NULL,
          created_at DATETIME2 NOT NULL CONSTRAINT DF_app_users_created_at DEFAULT SYSUTCDATETIME(),
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_app_users_updated_at DEFAULT SYSUTCDATETIME()
        );

        CREATE UNIQUE INDEX UX_app_users_normalized_email ON dbo.app_users(normalized_email);
      END
    `);
  } finally {
    await connection.close();
  }
}

export async function signUpUser(input) {
  const firstName = String(input.firstName || '').trim();
  const lastName = String(input.lastName || '').trim();
  const teamName = String(input.teamName || '').trim();
  const email = String(input.email || '').trim();
  const password = String(input.password || '');
  const normalizedEmail = normalizeEmail(email);

  if (!firstName || !lastName || !teamName || !normalizedEmail || !password) {
    const error = new Error('All required fields must be provided.');
    error.statusCode = 400;
    throw error;
  }

  await ensureAuthSchema();
  const connection = await getConnection();

  try {
    const existingUsers = await connection.query(
      'SELECT TOP 1 id FROM dbo.app_users WHERE normalized_email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length) {
      const error = new Error('An account with that email already exists.');
      error.statusCode = 409;
      throw error;
    }

    const { salt, hash } = await hashPassword(password);

    await connection.query(
      `
        INSERT INTO dbo.app_users (
          first_name,
          last_name,
          team_name,
          email,
          normalized_email,
          password_salt,
          password_hash
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [firstName, lastName, teamName, email, normalizedEmail, salt, hash]
    );

    const createdUsers = await connection.query(
      'SELECT TOP 1 id, first_name, last_name, team_name, email, created_at FROM dbo.app_users WHERE normalized_email = ?',
      [normalizedEmail]
    );

    return sanitizeUserRecord(createdUsers[0]);
  } finally {
    await connection.close();
  }
}

export async function signInUser(input) {
  const email = String(input.email || '').trim();
  const password = String(input.password || '');
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    const error = new Error('Email and password are required.');
    error.statusCode = 400;
    throw error;
  }

  await ensureAuthSchema();
  const connection = await getConnection();

  try {
    const users = await connection.query(
      `
        SELECT TOP 1
          id,
          first_name,
          last_name,
          team_name,
          email,
          password_salt,
          password_hash,
          created_at
        FROM dbo.app_users
        WHERE normalized_email = ?
      `,
      [normalizedEmail]
    );

    const user = users[0];

    if (!user) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    const passwordIsValid = await verifyPassword(password, user.password_salt, user.password_hash);

    if (!passwordIsValid) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    return sanitizeUserRecord(user);
  } finally {
    await connection.close();
  }
}
