import { getConnection } from "./db.js";

const DEFAULT_CONFIGURATION = {
  domainAutoRenew: true,
  domainAlertDays: 30,
  domainOwnerEmail: "ops@example.com",
  sslSchedule: "Daily",
  sslRescanTime: "09:00",
  sslBatchSize: 25,
  sslForceOnStartup: false,
  serverHealthWindow: 5,
  serverRetryCount: 2,
  serverNotifyEmail: "infra@example.com",
};

function toBit(value) {
  return value ? 1 : 0;
}

function toBool(value, fallback = false) {
  if (value == null) {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y"].includes(normalized);
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

function toSafeString(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function sanitizeConfiguration(record = {}) {
  return {
    domainAutoRenew: toBool(
      record.domain_auto_renew,
      DEFAULT_CONFIGURATION.domainAutoRenew,
    ),
    domainAlertDays: toInt(
      record.domain_alert_days,
      DEFAULT_CONFIGURATION.domainAlertDays,
    ),
    domainOwnerEmail: toSafeString(
      record.domain_owner_email,
      DEFAULT_CONFIGURATION.domainOwnerEmail,
    ),
    sslSchedule: toSafeString(
      record.ssl_schedule,
      DEFAULT_CONFIGURATION.sslSchedule,
    ),
    sslRescanTime: toSafeString(
      record.ssl_rescan_time,
      DEFAULT_CONFIGURATION.sslRescanTime,
    ),
    sslBatchSize: toInt(record.ssl_batch_size, DEFAULT_CONFIGURATION.sslBatchSize),
    sslForceOnStartup: toBool(
      record.ssl_force_on_startup,
      DEFAULT_CONFIGURATION.sslForceOnStartup,
    ),
    serverHealthWindow: toInt(
      record.server_health_window,
      DEFAULT_CONFIGURATION.serverHealthWindow,
    ),
    serverRetryCount: toInt(
      record.server_retry_count,
      DEFAULT_CONFIGURATION.serverRetryCount,
    ),
    serverNotifyEmail: toSafeString(
      record.server_notify_email,
      DEFAULT_CONFIGURATION.serverNotifyEmail,
    ),
    updatedAt: record.updated_at || null,
  };
}

function normalizeIncomingConfiguration(payload = {}) {
  return {
    domainAutoRenew: toBool(
      payload.domainAutoRenew,
      DEFAULT_CONFIGURATION.domainAutoRenew,
    ),
    domainAlertDays: Math.min(
      365,
      Math.max(
        1,
        toInt(payload.domainAlertDays, DEFAULT_CONFIGURATION.domainAlertDays),
      ),
    ),
    domainOwnerEmail: toSafeString(
      payload.domainOwnerEmail,
      DEFAULT_CONFIGURATION.domainOwnerEmail,
    ),
    sslSchedule: toSafeString(payload.sslSchedule, DEFAULT_CONFIGURATION.sslSchedule),
    sslRescanTime: toSafeString(
      payload.sslRescanTime,
      DEFAULT_CONFIGURATION.sslRescanTime,
    ),
    sslBatchSize: Math.min(
      500,
      Math.max(1, toInt(payload.sslBatchSize, DEFAULT_CONFIGURATION.sslBatchSize)),
    ),
    sslForceOnStartup: toBool(
      payload.sslForceOnStartup,
      DEFAULT_CONFIGURATION.sslForceOnStartup,
    ),
    serverHealthWindow: Math.min(
      120,
      Math.max(
        1,
        toInt(payload.serverHealthWindow, DEFAULT_CONFIGURATION.serverHealthWindow),
      ),
    ),
    serverRetryCount: Math.min(
      10,
      Math.max(0, toInt(payload.serverRetryCount, DEFAULT_CONFIGURATION.serverRetryCount)),
    ),
    serverNotifyEmail: toSafeString(
      payload.serverNotifyEmail,
      DEFAULT_CONFIGURATION.serverNotifyEmail,
    ),
  };
}

export async function ensureMonitoringConfigurationSchema() {
  const connection = await getConnection();

  try {
    await connection.query(`
      IF OBJECT_ID(N'dbo.monitoring_configuration', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.monitoring_configuration (
          id INT NOT NULL CONSTRAINT PK_monitoring_configuration PRIMARY KEY,
          domain_auto_renew BIT NOT NULL CONSTRAINT DF_monitoring_configuration_domain_auto_renew DEFAULT (1),
          domain_alert_days INT NOT NULL CONSTRAINT DF_monitoring_configuration_domain_alert_days DEFAULT (30),
          domain_owner_email NVARCHAR(255) NOT NULL CONSTRAINT DF_monitoring_configuration_domain_owner_email DEFAULT (N'ops@example.com'),
          ssl_schedule NVARCHAR(50) NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_schedule DEFAULT (N'Daily'),
          ssl_rescan_time NVARCHAR(10) NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_rescan_time DEFAULT (N'09:00'),
          ssl_batch_size INT NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_batch_size DEFAULT (25),
          ssl_force_on_startup BIT NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_force_on_startup DEFAULT (0),
          server_health_window INT NOT NULL CONSTRAINT DF_monitoring_configuration_server_health_window DEFAULT (5),
          server_retry_count INT NOT NULL CONSTRAINT DF_monitoring_configuration_server_retry_count DEFAULT (2),
          server_notify_email NVARCHAR(255) NOT NULL CONSTRAINT DF_monitoring_configuration_server_notify_email DEFAULT (N'infra@example.com'),
          updated_at DATETIME2 NOT NULL CONSTRAINT DF_monitoring_configuration_updated_at DEFAULT SYSUTCDATETIME()
        );
      END
    `);

    await connection.query(`
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'domain_auto_renew') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD domain_auto_renew BIT NOT NULL CONSTRAINT DF_monitoring_configuration_domain_auto_renew_2 DEFAULT (1);
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'domain_alert_days') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD domain_alert_days INT NOT NULL CONSTRAINT DF_monitoring_configuration_domain_alert_days_2 DEFAULT (30);
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'domain_owner_email') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD domain_owner_email NVARCHAR(255) NOT NULL CONSTRAINT DF_monitoring_configuration_domain_owner_email_2 DEFAULT (N'ops@example.com');
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'ssl_schedule') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD ssl_schedule NVARCHAR(50) NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_schedule_2 DEFAULT (N'Daily');
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'ssl_rescan_time') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD ssl_rescan_time NVARCHAR(10) NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_rescan_time_2 DEFAULT (N'09:00');
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'ssl_batch_size') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD ssl_batch_size INT NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_batch_size_2 DEFAULT (25);
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'ssl_force_on_startup') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD ssl_force_on_startup BIT NOT NULL CONSTRAINT DF_monitoring_configuration_ssl_force_on_startup_2 DEFAULT (0);
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'server_health_window') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD server_health_window INT NOT NULL CONSTRAINT DF_monitoring_configuration_server_health_window_2 DEFAULT (5);
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'server_retry_count') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD server_retry_count INT NOT NULL CONSTRAINT DF_monitoring_configuration_server_retry_count_2 DEFAULT (2);
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'server_notify_email') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD server_notify_email NVARCHAR(255) NOT NULL CONSTRAINT DF_monitoring_configuration_server_notify_email_2 DEFAULT (N'infra@example.com');
      IF COL_LENGTH(N'dbo.monitoring_configuration', N'updated_at') IS NULL
        ALTER TABLE dbo.monitoring_configuration ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_monitoring_configuration_updated_at_2 DEFAULT SYSUTCDATETIME();
    `);

    await connection.query(
      `
        IF NOT EXISTS (SELECT 1 FROM dbo.monitoring_configuration WHERE id = 1)
        BEGIN
          INSERT INTO dbo.monitoring_configuration (
            id,
            domain_auto_renew,
            domain_alert_days,
            domain_owner_email,
            ssl_schedule,
            ssl_rescan_time,
            ssl_batch_size,
            ssl_force_on_startup,
            server_health_window,
            server_retry_count,
            server_notify_email
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        END
      `,
      [
        1,
        toBit(DEFAULT_CONFIGURATION.domainAutoRenew),
        DEFAULT_CONFIGURATION.domainAlertDays,
        DEFAULT_CONFIGURATION.domainOwnerEmail,
        DEFAULT_CONFIGURATION.sslSchedule,
        DEFAULT_CONFIGURATION.sslRescanTime,
        DEFAULT_CONFIGURATION.sslBatchSize,
        toBit(DEFAULT_CONFIGURATION.sslForceOnStartup),
        DEFAULT_CONFIGURATION.serverHealthWindow,
        DEFAULT_CONFIGURATION.serverRetryCount,
        DEFAULT_CONFIGURATION.serverNotifyEmail,
      ],
    );
  } finally {
    await connection.close();
  }
}

export async function getMonitoringConfiguration() {
  await ensureMonitoringConfigurationSchema();
  const connection = await getConnection();

  try {
    const rows = await connection.query(`
      SELECT TOP 1
        domain_auto_renew,
        domain_alert_days,
        domain_owner_email,
        ssl_schedule,
        ssl_rescan_time,
        ssl_batch_size,
        ssl_force_on_startup,
        server_health_window,
        server_retry_count,
        server_notify_email,
        updated_at
      FROM dbo.monitoring_configuration
      WHERE id = 1
    `);

    return sanitizeConfiguration(rows[0]);
  } finally {
    await connection.close();
  }
}

export async function updateMonitoringConfiguration(payload) {
  const normalized = normalizeIncomingConfiguration(payload);
  await ensureMonitoringConfigurationSchema();
  const connection = await getConnection();

  try {
    await connection.query(
      `
        UPDATE dbo.monitoring_configuration
        SET
          domain_auto_renew = ?,
          domain_alert_days = ?,
          domain_owner_email = ?,
          ssl_schedule = ?,
          ssl_rescan_time = ?,
          ssl_batch_size = ?,
          ssl_force_on_startup = ?,
          server_health_window = ?,
          server_retry_count = ?,
          server_notify_email = ?,
          updated_at = SYSUTCDATETIME()
        WHERE id = 1
      `,
      [
        toBit(normalized.domainAutoRenew),
        normalized.domainAlertDays,
        normalized.domainOwnerEmail,
        normalized.sslSchedule,
        normalized.sslRescanTime,
        normalized.sslBatchSize,
        toBit(normalized.sslForceOnStartup),
        normalized.serverHealthWindow,
        normalized.serverRetryCount,
        normalized.serverNotifyEmail,
      ],
    );

    const rows = await connection.query(`
      SELECT TOP 1
        domain_auto_renew,
        domain_alert_days,
        domain_owner_email,
        ssl_schedule,
        ssl_rescan_time,
        ssl_batch_size,
        ssl_force_on_startup,
        server_health_window,
        server_retry_count,
        server_notify_email,
        updated_at
      FROM dbo.monitoring_configuration
      WHERE id = 1
    `);

    return sanitizeConfiguration(rows[0]);
  } finally {
    await connection.close();
  }
}
