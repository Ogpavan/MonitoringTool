import dotenv from 'dotenv';
import odbc from 'odbc';

dotenv.config();

const DEFAULT_DRIVER = process.env.SQLSERVER_DRIVER || 'ODBC Driver 18 for SQL Server';
const DEFAULT_DATABASE = process.env.SQLSERVER_DATABASE || 'master';

function parseBool(value, fallback = false) {
  if (value == null || value === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'y'].includes(String(value).trim().toLowerCase());
}

function parseConnectionString(connectionString) {
  const parts = String(connectionString)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  return Object.fromEntries(
    parts.map((part) => {
      const separatorIndex = part.indexOf('=');
      const key = separatorIndex >= 0 ? part.slice(0, separatorIndex).trim().toLowerCase() : part.trim().toLowerCase();
      const value = separatorIndex >= 0 ? part.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '') : '';
      return [key, value];
    })
  );
}

function getRawConnectionString() {
  const raw = process.env.SQLSERVER_CONNECTION_STRING;

  if (!raw) {
    throw new Error('Missing SQLSERVER_CONNECTION_STRING in environment.');
  }

  return raw;
}

export function buildOdbcConnectionString() {
  const raw = getRawConnectionString();
  const parsed = parseConnectionString(raw);
  const server = parsed['data source'] || parsed.server || parsed.address || parsed.addr || parsed['network address'];
  const database = parsed['initial catalog'] || parsed.database || DEFAULT_DATABASE;
  const encrypt = parseBool(parsed.encrypt, true) ? 'Yes' : 'No';
  const trustServerCertificate = parseBool(parsed.trustservercertificate, true) ? 'Yes' : 'No';
  const pooling = parseBool(parsed.pooling, false) ? 'Yes' : 'No';
  const mars = parseBool(parsed.multipleactiveresultsets, false) ? 'Yes' : 'No';
  const integratedSecurity =
    parseBool(parsed['integrated security'], false) ||
    parseBool(parsed['trusted_connection'], false) ||
    parseBool(parsed['trusted connection'], false);
  const userId = parsed.uid || parsed['user id'] || parsed.user || parsed.username;
  const password = parsed.pwd || parsed.password;
  const commandTimeout = parsed['command timeout'];

  if (!server) {
    throw new Error('The connection string must include Data Source or Server.');
  }

  const segments = [
    `Driver={${DEFAULT_DRIVER}}`,
    `Server=${server}`,
    `Database=${database}`,
    `Encrypt=${encrypt}`,
    `TrustServerCertificate=${trustServerCertificate}`,
    `Pooling=${pooling}`,
    `MARS_Connection=${mars}`
  ];

  if (integratedSecurity) {
    segments.push('Trusted_Connection=Yes');
  } else if (userId) {
    segments.push(`UID=${userId}`);
    if (password) {
      segments.push(`PWD=${password}`);
    }
  }

  if (commandTimeout) {
    segments.push(`CommandTimeout=${commandTimeout}`);
  }

  return segments.join(';');
}

export async function getConnection() {
  return odbc.connect(buildOdbcConnectionString());
}

export async function testDatabaseConnection() {
  const connection = await getConnection();

  try {
    const result = await connection.query(`
      SELECT
        @@SERVERNAME AS server_name,
        DB_NAME() AS database_name,
        SUSER_SNAME() AS login_name
    `);

    return result[0] ?? null;
  } finally {
    await connection.close();
  }
}
