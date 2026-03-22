import { getConnection } from "./db.js";

const TRACKED_DOMAIN_SELECT = `
  SELECT id, domain, environment, scan_schedule, monitor_port, issuer_ca, ssl_status, expiry_date,
         last_scan_at, next_scan_at, ip_address, common_name, serial_number, thumbprint,
         signature_algorithm, key_algorithm, key_size_bits, tls_version, certificate_chain_status,
         auto_renew_expected, alert_days_before_expiry, owner_name, owner_email, source_type,
         source_reference, is_active, last_error_message, created_at, updated_at
  FROM dbo.ssl_tracked_domains
`;

const SCHEMA_COLUMNS = [
  ["normalized_domain", "normalized_domain AS LOWER(LTRIM(RTRIM(domain))) PERSISTED"],
  ["environment", "environment NVARCHAR(50) NOT NULL DEFAULT (N'Production')"],
  ["scan_schedule", "scan_schedule NVARCHAR(50) NOT NULL DEFAULT (N'Daily')"],
  ["monitor_port", "monitor_port INT NOT NULL DEFAULT (443)"],
  ["issuer_ca", "issuer_ca NVARCHAR(255) NULL"],
  ["ssl_status", "ssl_status NVARCHAR(50) NOT NULL DEFAULT (N'Pending scan')"],
  ["expiry_date", "expiry_date DATETIME2 NULL"],
  ["last_scan_at", "last_scan_at DATETIME2 NULL"],
  ["next_scan_at", "next_scan_at DATETIME2 NULL"],
  ["ip_address", "ip_address NVARCHAR(64) NULL"],
  ["common_name", "common_name NVARCHAR(255) NULL"],
  ["san_list", "san_list NVARCHAR(MAX) NULL"],
  ["serial_number", "serial_number NVARCHAR(255) NULL"],
  ["thumbprint", "thumbprint NVARCHAR(255) NULL"],
  ["signature_algorithm", "signature_algorithm NVARCHAR(150) NULL"],
  ["key_algorithm", "key_algorithm NVARCHAR(150) NULL"],
  ["key_size_bits", "key_size_bits INT NULL"],
  ["tls_version", "tls_version NVARCHAR(50) NULL"],
  ["certificate_chain_status", "certificate_chain_status NVARCHAR(100) NULL"],
  ["auto_renew_expected", "auto_renew_expected BIT NOT NULL DEFAULT (0)"],
  ["alert_days_before_expiry", "alert_days_before_expiry INT NOT NULL DEFAULT (30)"],
  ["owner_name", "owner_name NVARCHAR(150) NULL"],
  ["owner_email", "owner_email NVARCHAR(255) NULL"],
  ["source_type", "source_type NVARCHAR(50) NOT NULL DEFAULT (N'Manual')"],
  ["source_reference", "source_reference NVARCHAR(255) NULL"],
  ["notes", "notes NVARCHAR(MAX) NULL"],
  ["is_active", "is_active BIT NOT NULL DEFAULT (1)"],
  ["last_error_message", "last_error_message NVARCHAR(1000) NULL"],
  ["created_at", "created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()"],
  ["updated_at", "updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()"],
];

function normalizeDomain(domain) {
  return String(domain || "")
    .trim()
    .toLowerCase();
}

function coerceDomainEntry(entry) {
  if (typeof entry === "string") {
    return { domain: entry };
  }

  return entry && typeof entry === "object" ? entry : { domain: "" };
}

function sanitizeTrackedDomain(record) {
  return {
    id: record.id,
    domain: record.domain,
    environment: record.environment,
    scanSchedule: record.scan_schedule,
    monitorPort: record.monitor_port,
    issuerCa: record.issuer_ca,
    sslStatus: record.ssl_status,
    expiryDate: record.expiry_date,
    lastScanAt: record.last_scan_at,
    nextScanAt: record.next_scan_at,
    ipAddress: record.ip_address,
    commonName: record.common_name,
    sanList: record.san_list ?? null,
    serialNumber: record.serial_number,
    thumbprint: record.thumbprint,
    signatureAlgorithm: record.signature_algorithm,
    keyAlgorithm: record.key_algorithm,
    keySizeBits: record.key_size_bits,
    tlsVersion: record.tls_version,
    certificateChainStatus: record.certificate_chain_status,
    autoRenewExpected: record.auto_renew_expected,
    alertDaysBeforeExpiry: record.alert_days_before_expiry,
    ownerName: record.owner_name,
    ownerEmail: record.owner_email,
    sourceType: record.source_type,
    sourceReference: record.source_reference,
    notes: record.notes ?? null,
    isActive: record.is_active,
    lastErrorMessage: record.last_error_message,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function toSqlDateTime(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function parseRescanTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: 9, minute: 0 };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: 9, minute: 0 };
  }

  return { hour, minute };
}

function setLocalTime(date, hour, minute) {
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function advanceToNextWeekday(date) {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while ([0, 6].includes(next.getDay()));
  return next;
}

function buildNextScanAt(scanSchedule, options = {}) {
  const { fromDate = new Date(), rescanTime = "09:00", includeToday = true } =
    options;
  const base = new Date(fromDate);
  const { hour, minute } = parseRescanTime(rescanTime);
  const schedule = String(scanSchedule || "Daily").trim();

  if (schedule === "Hourly") {
    base.setHours(base.getHours() + 1, base.getMinutes(), 0, 0);
    return toSqlDateTime(base);
  }

  if (schedule === "Twice daily") {
    const firstSlotMinutes = hour * 60 + minute;
    const secondSlotMinutes = (firstSlotMinutes + 12 * 60) % (24 * 60);
    const slots = [firstSlotMinutes, secondSlotMinutes].sort((a, b) => a - b);
    const currentMinutes = base.getHours() * 60 + base.getMinutes();
    const nextSlot = slots.find((slot) =>
      includeToday ? slot > currentMinutes : slot >= currentMinutes,
    );

    if (nextSlot !== undefined) {
      return toSqlDateTime(
        setLocalTime(
          base,
          Math.floor(nextSlot / 60),
          Number(nextSlot % 60),
        ),
      );
    }

    const tomorrow = new Date(base);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return toSqlDateTime(
      setLocalTime(tomorrow, Math.floor(slots[0] / 60), Number(slots[0] % 60)),
    );
  }

  const candidateToday = setLocalTime(base, hour, minute);

  if (schedule === "Weekly") {
    if (includeToday && candidateToday > base) {
      return toSqlDateTime(candidateToday);
    }
    const nextWeek = setLocalTime(base, hour, minute);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return toSqlDateTime(nextWeek);
  }

  if (schedule === "Weekdays") {
    const todayIsWeekday = ![0, 6].includes(base.getDay());
    if (includeToday && todayIsWeekday && candidateToday > base) {
      return toSqlDateTime(candidateToday);
    }
    return toSqlDateTime(
      setLocalTime(advanceToNextWeekday(base), hour, minute),
    );
  }

  if (includeToday && candidateToday > base) {
    return toSqlDateTime(candidateToday);
  }

  const tomorrow = setLocalTime(base, hour, minute);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toSqlDateTime(tomorrow);
}

async function runStatement(connection, sql, label, params = []) {
  try {
    const hasParams = Array.isArray(params) && params.length > 0;
    return hasParams
      ? await connection.query(sql, params)
      : await connection.query(sql);
  } catch (error) {
    error.message = `${error.message} [${label}]`;
    throw error;
  }
}

async function tableExists(connection) {
  const rows = await runStatement(
    connection,
    `SELECT OBJECT_ID(N'dbo.ssl_tracked_domains', N'U') AS table_id`,
    "schema:check-table",
  );

  return Boolean(rows[0]?.table_id);
}

async function getColumnSet(connection) {
  const rows = await runStatement(
    connection,
    `SELECT c.name
     FROM sys.columns c
     WHERE c.object_id = OBJECT_ID(N'dbo.ssl_tracked_domains')`,
    "schema:list-columns",
  );

  return new Set(rows.map((row) => String(row.name || "").toLowerCase()));
}

async function indexExists(connection, indexName) {
  const rows = await runStatement(
    connection,
    `SELECT 1 AS has_index
     FROM sys.indexes
     WHERE name = ?
       AND object_id = OBJECT_ID(N'dbo.ssl_tracked_domains')`,
    `schema:check-index:${indexName}`,
    [indexName],
  );

  return rows.length > 0;
}

async function createBaseTable(connection) {
  await runStatement(
    connection,
    `CREATE TABLE dbo.ssl_tracked_domains (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        domain NVARCHAR(255) NOT NULL,
        normalized_domain AS LOWER(LTRIM(RTRIM(domain))) PERSISTED,
        environment NVARCHAR(50) NOT NULL DEFAULT (N'Production'),
        scan_schedule NVARCHAR(50) NOT NULL DEFAULT (N'Daily'),
        monitor_port INT NOT NULL DEFAULT (443),
        issuer_ca NVARCHAR(255) NULL,
        ssl_status NVARCHAR(50) NOT NULL DEFAULT (N'Pending scan'),
        expiry_date DATETIME2 NULL,
        last_scan_at DATETIME2 NULL,
        next_scan_at DATETIME2 NULL,
        ip_address NVARCHAR(64) NULL,
        common_name NVARCHAR(255) NULL,
        san_list NVARCHAR(MAX) NULL,
        serial_number NVARCHAR(255) NULL,
        thumbprint NVARCHAR(255) NULL,
        signature_algorithm NVARCHAR(150) NULL,
        key_algorithm NVARCHAR(150) NULL,
        key_size_bits INT NULL,
        tls_version NVARCHAR(50) NULL,
        certificate_chain_status NVARCHAR(100) NULL,
        auto_renew_expected BIT NOT NULL DEFAULT (0),
        alert_days_before_expiry INT NOT NULL DEFAULT (30),
        owner_name NVARCHAR(150) NULL,
        owner_email NVARCHAR(255) NULL,
        source_type NVARCHAR(50) NOT NULL DEFAULT (N'Manual'),
        source_reference NVARCHAR(255) NULL,
        notes NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL DEFAULT (1),
        last_error_message NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
    )`,
    "schema:create-table",
  );
}

async function ensureSchemaColumns(connection) {
  const columns = await getColumnSet(connection);

  for (const [columnName, definition] of SCHEMA_COLUMNS) {
    if (columns.has(columnName)) {
      continue;
    }

    await runStatement(
      connection,
      `ALTER TABLE dbo.ssl_tracked_domains ADD ${definition}`,
      `schema:add-column:${columnName}`,
    );

    columns.add(columnName);
  }
}

async function ensureSchemaIndexes(connection) {
  if (
    !(await indexExists(
      connection,
      "UX_ssl_tracked_domains_normalized_domain_environment_port",
    ))
  ) {
    await runStatement(
      connection,
      `CREATE UNIQUE INDEX UX_ssl_tracked_domains_normalized_domain_environment_port
       ON dbo.ssl_tracked_domains(normalized_domain, environment, monitor_port)`,
      "schema:create-index:unique-domain-env-port",
    );
  }

  if (!(await indexExists(connection, "IX_ssl_tracked_domains_status_expiry"))) {
    await runStatement(
      connection,
      `CREATE INDEX IX_ssl_tracked_domains_status_expiry
       ON dbo.ssl_tracked_domains(ssl_status, expiry_date)`,
      "schema:create-index:status-expiry",
    );
  }

  if (!(await indexExists(connection, "IX_ssl_tracked_domains_next_scan_at"))) {
    await runStatement(
      connection,
      `CREATE INDEX IX_ssl_tracked_domains_next_scan_at
       ON dbo.ssl_tracked_domains(next_scan_at)`,
      "schema:create-index:next-scan",
    );
  }
}

export async function ensureSslTrackedDomainsSchema() {
  const connection = await getConnection();

  try {
    if (!(await tableExists(connection))) {
      await createBaseTable(connection);
    }

    await ensureSchemaColumns(connection);
    await ensureSchemaIndexes(connection);
  } finally {
    await connection.close();
  }
}

export async function getAllTrackedDomains() {
  await ensureSslTrackedDomainsSchema();
  const connection = await getConnection();

  try {
    const results = await runStatement(
      connection,
      `${TRACKED_DOMAIN_SELECT}
       WHERE is_active = 1`,
      "query:get-all-tracked-domains",
    );

    return results.map(sanitizeTrackedDomain);
  } finally {
    await connection.close();
  }
}

export async function getTrackedDomainsDueForScan(limit = 50) {
  await ensureSslTrackedDomainsSchema();
  const connection = await getConnection();

  try {
    const safeLimit = Math.max(1, Number(limit) || 50);
    const results = await runStatement(
      connection,
      `SELECT TOP ${safeLimit}
          id, domain, environment, scan_schedule, monitor_port, issuer_ca, ssl_status, expiry_date,
          last_scan_at, next_scan_at, ip_address, common_name, serial_number, thumbprint,
          signature_algorithm, key_algorithm, key_size_bits, tls_version, certificate_chain_status,
          auto_renew_expected, alert_days_before_expiry, owner_name, owner_email, source_type,
          source_reference, is_active, last_error_message, created_at, updated_at
        FROM dbo.ssl_tracked_domains
        WHERE is_active = 1
          AND (
            last_scan_at IS NULL
            OR ssl_status = N'Pending scan'
            OR next_scan_at IS NULL
            OR next_scan_at <= SYSUTCDATETIME()
          )
        ORDER BY
          CASE
            WHEN last_scan_at IS NULL OR ssl_status = N'Pending scan' THEN 0
            WHEN next_scan_at IS NULL THEN 1
            ELSE 2
          END,
          next_scan_at ASC,
          id ASC`,
      "query:get-domains-due-for-scan",
    );

    return results.map(sanitizeTrackedDomain);
  } finally {
    await connection.close();
  }
}

export async function getNextScheduledScanAt() {
  await ensureSslTrackedDomainsSchema();
  const connection = await getConnection();

  try {
    const rows = await runStatement(
      connection,
      `SELECT TOP 1
         CASE
           WHEN last_scan_at IS NULL
             OR ssl_status = N'Pending scan'
             OR next_scan_at IS NULL
             OR next_scan_at <= SYSUTCDATETIME()
             THEN SYSUTCDATETIME()
           ELSE next_scan_at
         END AS next_scan_at
       FROM dbo.ssl_tracked_domains
       WHERE is_active = 1
       ORDER BY
         CASE
           WHEN last_scan_at IS NULL
             OR ssl_status = N'Pending scan'
             OR next_scan_at IS NULL
             OR next_scan_at <= SYSUTCDATETIME()
             THEN 0
           ELSE 1
         END,
         next_scan_at ASC,
         id ASC`,
      "query:get-next-scan-at",
    );

    return rows[0]?.next_scan_at ?? null;
  } finally {
    await connection.close();
  }
}

export async function saveSslScanResult(domainId, scanResult) {
  await ensureSslTrackedDomainsSchema();
  const connection = await getConnection();

  try {
    await runStatement(
      connection,
      `UPDATE dbo.ssl_tracked_domains
       SET
         issuer_ca = ?,
         ssl_status = ?,
         expiry_date = ?,
         last_scan_at = ?,
         next_scan_at = ?,
         ip_address = ?,
         common_name = ?,
         san_list = ?,
         serial_number = ?,
         thumbprint = ?,
         signature_algorithm = ?,
         key_algorithm = ?,
         key_size_bits = ?,
         tls_version = ?,
         certificate_chain_status = ?,
         last_error_message = ?,
         updated_at = SYSUTCDATETIME()
       WHERE id = ?`,
      "query:save-ssl-scan-result:update",
      [
        scanResult.issuerCa ?? null,
        scanResult.sslStatus ?? "Pending scan",
        toSqlDateTime(scanResult.expiryDate),
        toSqlDateTime(scanResult.lastScanAt),
        toSqlDateTime(scanResult.nextScanAt),
        scanResult.ipAddress ?? null,
        scanResult.commonName ?? null,
        scanResult.sanList ?? null,
        scanResult.serialNumber ?? null,
        scanResult.thumbprint ?? null,
        scanResult.signatureAlgorithm ?? null,
        scanResult.keyAlgorithm ?? null,
        scanResult.keySizeBits ?? null,
        scanResult.tlsVersion ?? null,
        scanResult.certificateChainStatus ?? null,
        scanResult.lastErrorMessage ?? null,
        domainId,
      ],
    );

    const updated = await runStatement(
      connection,
      `${TRACKED_DOMAIN_SELECT}
       WHERE id = ?`,
      "query:save-ssl-scan-result:select",
      [domainId],
    );

    return updated[0] ? sanitizeTrackedDomain(updated[0]) : null;
  } finally {
    await connection.close();
  }
}

export async function bulkInsertTrackedDomains(payload) {
  const sharedEnvironment =
    String(payload.environment || "Production").trim() || "Production";
  const sharedScanSchedule =
    String(payload.scanSchedule || "Daily").trim() || "Daily";
  const sharedMonitorPort = Number(payload.monitorPort || 443);
  const sharedOwnerName = payload.ownerName
    ? String(payload.ownerName).trim()
    : null;
  const sharedOwnerEmail = payload.ownerEmail
    ? String(payload.ownerEmail).trim()
    : null;
  const sharedSourceType = payload.sourceType
    ? String(payload.sourceType).trim()
    : "Manual";
  const sharedSourceReference = payload.sourceReference
    ? String(payload.sourceReference).trim()
    : null;
  const sharedNotes = payload.notes ? String(payload.notes).trim() : null;
  const rawDomains = Array.isArray(payload.domains) ? payload.domains : [];

  if (!rawDomains.length) {
    const error = new Error(
      "Provide at least one domain in the domains array.",
    );
    error.statusCode = 400;
    throw error;
  }

  const normalizedEntries = rawDomains
    .map(coerceDomainEntry)
    .map((entry) => {
      const domain = String(entry.domain || "").trim();
      const environment =
        String(entry.environment || sharedEnvironment).trim() ||
        sharedEnvironment;
      const scanSchedule =
        String(entry.scanSchedule || sharedScanSchedule).trim() ||
        sharedScanSchedule;
      const monitorPort = Number(entry.monitorPort || sharedMonitorPort || 443);
      const ownerName = entry.ownerName
        ? String(entry.ownerName).trim()
        : sharedOwnerName;
      const ownerEmail = entry.ownerEmail
        ? String(entry.ownerEmail).trim()
        : sharedOwnerEmail;
      const sourceType = entry.sourceType
        ? String(entry.sourceType).trim()
        : sharedSourceType;
      const sourceReference = entry.sourceReference
        ? String(entry.sourceReference).trim()
        : sharedSourceReference;
      const notes = entry.notes ? String(entry.notes).trim() : sharedNotes;

      return {
        domain,
        normalizedDomain: normalizeDomain(domain),
        environment,
        scanSchedule,
        monitorPort,
        ownerName,
        ownerEmail,
        sourceType,
        sourceReference,
        notes,
        nextScanAt: buildNextScanAt(scanSchedule),
      };
    })
    .filter((entry) => entry.domain);

  if (!normalizedEntries.length) {
    const error = new Error("No valid domains were provided.");
    error.statusCode = 400;
    throw error;
  }

  const uniqueEntries = [];
  const seenKeys = new Set();

  for (const entry of normalizedEntries) {
    const dedupeKey = `${entry.normalizedDomain}|${entry.environment}|${entry.monitorPort}`;
    if (!seenKeys.has(dedupeKey)) {
      seenKeys.add(dedupeKey);
      uniqueEntries.push(entry);
    }
  }

  await ensureSslTrackedDomainsSchema();
  const connection = await getConnection();
  const inserted = [];
  const skipped = [];

  try {
    for (const entry of uniqueEntries) {
      const existing = await runStatement(
        connection,
        `SELECT TOP 1 id, domain, environment, scan_schedule, monitor_port, issuer_ca, ssl_status, expiry_date,
                last_scan_at, next_scan_at, ip_address, owner_name, owner_email, source_type, is_active,
                created_at, updated_at
         FROM dbo.ssl_tracked_domains
         WHERE normalized_domain = ? AND environment = ? AND monitor_port = ?`,
        "query:bulk-insert:check-existing",
        [entry.normalizedDomain, entry.environment, entry.monitorPort],
      );

      if (existing.length) {
        skipped.push({
          domain: entry.domain,
          environment: entry.environment,
          monitorPort: entry.monitorPort,
          reason: "Already tracked",
        });
        continue;
      }

      await runStatement(
        connection,
        `INSERT INTO dbo.ssl_tracked_domains (
           domain,
           environment,
           scan_schedule,
           monitor_port,
           owner_name,
           owner_email,
           source_type,
           source_reference,
           notes,
           next_scan_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        "query:bulk-insert:insert",
        [
          entry.domain,
          entry.environment,
          entry.scanSchedule,
          entry.monitorPort,
          entry.ownerName,
          entry.ownerEmail,
          entry.sourceType,
          entry.sourceReference,
          entry.notes,
          entry.nextScanAt,
        ],
      );

      const created = await runStatement(
        connection,
        `SELECT TOP 1 id, domain, environment, scan_schedule, monitor_port, issuer_ca, ssl_status, expiry_date,
                last_scan_at, next_scan_at, ip_address, owner_name, owner_email, source_type, is_active,
                created_at, updated_at
         FROM dbo.ssl_tracked_domains
         WHERE normalized_domain = ? AND environment = ? AND monitor_port = ?
         ORDER BY id DESC`,
        "query:bulk-insert:fetch-created",
        [entry.normalizedDomain, entry.environment, entry.monitorPort],
      );

      inserted.push(sanitizeTrackedDomain(created[0]));
    }

    return {
      inserted,
      skipped,
      summary: {
        requested: rawDomains.length,
        processed: uniqueEntries.length,
        inserted: inserted.length,
        skipped: skipped.length,
      },
    };
  } finally {
    await connection.close();
  }
}

export async function applyGlobalSslScanSchedule(scanSchedule, rescanTime) {
  await ensureSslTrackedDomainsSchema();
  const connection = await getConnection();
  const safeSchedule = String(scanSchedule || "Daily").trim() || "Daily";
  const safeRescanTime = String(rescanTime || "09:00").trim() || "09:00";
  const nextScanAt = buildNextScanAt(safeSchedule, {
    fromDate: new Date(),
    rescanTime: safeRescanTime,
    includeToday: true,
  });

  try {
    await runStatement(
      connection,
      `UPDATE dbo.ssl_tracked_domains
       SET
         scan_schedule = ?,
         next_scan_at = ?,
         updated_at = SYSUTCDATETIME()
       WHERE is_active = 1`,
      "query:apply-global-ssl-scan-schedule",
      [safeSchedule, nextScanAt],
    );
  } finally {
    await connection.close();
  }
}
