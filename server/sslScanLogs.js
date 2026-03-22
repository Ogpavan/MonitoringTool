import { getConnection } from "./db.js";

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

function sanitizeScanLog(record) {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    startedAt: record.started_at,
    finishedAt: record.finished_at,
    runStatus: record.run_status,
    runTrigger: record.run_trigger,
    forceRun: record.force_run,
    scannedCount: record.scanned_count,
    totalCount: record.total_count,
    errorMessage: record.error_message,
    createdAt: record.created_at,
  };
}

export async function ensureSslScanLogsSchema() {
  const connection = await getConnection();

  try {
    await runStatement(
      connection,
      `
      IF OBJECT_ID(N'dbo.ssl_scan_run_logs', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.ssl_scan_run_logs (
          id INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ssl_scan_run_logs PRIMARY KEY,
          started_at DATETIME2 NULL,
          finished_at DATETIME2 NULL,
          run_status NVARCHAR(20) NOT NULL CONSTRAINT DF_ssl_scan_run_logs_run_status DEFAULT (N'Completed'),
          run_trigger NVARCHAR(20) NOT NULL CONSTRAINT DF_ssl_scan_run_logs_run_trigger DEFAULT (N'manual'),
          force_run BIT NOT NULL CONSTRAINT DF_ssl_scan_run_logs_force_run DEFAULT (0),
          scanned_count INT NOT NULL CONSTRAINT DF_ssl_scan_run_logs_scanned_count DEFAULT (0),
          total_count INT NOT NULL CONSTRAINT DF_ssl_scan_run_logs_total_count DEFAULT (0),
          error_message NVARCHAR(MAX) NULL,
          created_at DATETIME2 NOT NULL CONSTRAINT DF_ssl_scan_run_logs_created_at DEFAULT SYSUTCDATETIME()
        );
      END
      `,
      "schema:ensure-ssl-scan-run-logs",
    );
  } finally {
    await connection.close();
  }
}

export async function insertSslScanRunLog(payload = {}) {
  await ensureSslScanLogsSchema();
  const connection = await getConnection();

  try {
    await runStatement(
      connection,
      `
      INSERT INTO dbo.ssl_scan_run_logs (
        started_at,
        finished_at,
        run_status,
        run_trigger,
        force_run,
        scanned_count,
        total_count,
        error_message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      "query:insert-ssl-scan-run-log",
      [
        toSqlDateTime(payload.startedAt),
        toSqlDateTime(payload.finishedAt),
        String(payload.runStatus || "Completed"),
        String(payload.runTrigger || "manual"),
        payload.forceRun ? 1 : 0,
        Math.max(0, Number(payload.scannedCount) || 0),
        Math.max(0, Number(payload.totalCount) || 0),
        payload.errorMessage ? String(payload.errorMessage) : null,
      ],
    );
  } finally {
    await connection.close();
  }
}

export async function getLatestSslScanRunLog() {
  await ensureSslScanLogsSchema();
  const connection = await getConnection();

  try {
    const rows = await runStatement(
      connection,
      `
      SELECT TOP 1
        id,
        started_at,
        finished_at,
        run_status,
        run_trigger,
        force_run,
        scanned_count,
        total_count,
        error_message
      FROM dbo.ssl_scan_run_logs
      ORDER BY id DESC
      `,
      "query:get-latest-ssl-scan-run-log",
    );

    return sanitizeScanLog(rows[0]);
  } finally {
    await connection.close();
  }
}
