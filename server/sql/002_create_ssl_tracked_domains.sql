SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.ssl_tracked_domains', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ssl_tracked_domains (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        domain NVARCHAR(255) NOT NULL,
        normalized_domain AS LOWER(LTRIM(RTRIM(domain))) PERSISTED,
        environment NVARCHAR(50) NOT NULL,
        scan_schedule NVARCHAR(50) NOT NULL,
        monitor_port INT NOT NULL CONSTRAINT DF_ssl_tracked_domains_monitor_port DEFAULT (443),
        issuer_ca NVARCHAR(255) NULL,
        ssl_status NVARCHAR(50) NOT NULL CONSTRAINT DF_ssl_tracked_domains_ssl_status DEFAULT (N'Pending scan'),
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
        auto_renew_expected BIT NOT NULL CONSTRAINT DF_ssl_tracked_domains_auto_renew_expected DEFAULT (0),
        alert_days_before_expiry INT NOT NULL CONSTRAINT DF_ssl_tracked_domains_alert_days_before_expiry DEFAULT (30),
        owner_name NVARCHAR(150) NULL,
        owner_email NVARCHAR(255) NULL,
        source_type NVARCHAR(50) NOT NULL CONSTRAINT DF_ssl_tracked_domains_source_type DEFAULT (N'Manual'),
        source_reference NVARCHAR(255) NULL,
        notes NVARCHAR(MAX) NULL,
        is_active BIT NOT NULL CONSTRAINT DF_ssl_tracked_domains_is_active DEFAULT (1),
        last_error_message NVARCHAR(1000) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_ssl_tracked_domains_created_at DEFAULT SYSUTCDATETIME(),
        updated_at DATETIME2 NOT NULL CONSTRAINT DF_ssl_tracked_domains_updated_at DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_ssl_tracked_domains_normalized_domain_environment_port'
      AND object_id = OBJECT_ID(N'dbo.ssl_tracked_domains')
)
BEGIN
    CREATE UNIQUE INDEX UX_ssl_tracked_domains_normalized_domain_environment_port
        ON dbo.ssl_tracked_domains(normalized_domain, environment, monitor_port);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_ssl_tracked_domains_status_expiry'
      AND object_id = OBJECT_ID(N'dbo.ssl_tracked_domains')
)
BEGIN
    CREATE INDEX IX_ssl_tracked_domains_status_expiry
        ON dbo.ssl_tracked_domains(ssl_status, expiry_date);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_ssl_tracked_domains_next_scan_at'
      AND object_id = OBJECT_ID(N'dbo.ssl_tracked_domains')
)
BEGIN
    CREATE INDEX IX_ssl_tracked_domains_next_scan_at
        ON dbo.ssl_tracked_domains(next_scan_at);
END
GO

PRINT 'dbo.ssl_tracked_domains is ready.';
GO
