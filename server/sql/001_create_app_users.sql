SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.app_users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.app_users (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
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
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_app_users_normalized_email'
      AND object_id = OBJECT_ID(N'dbo.app_users')
)
BEGIN
    CREATE UNIQUE INDEX UX_app_users_normalized_email
        ON dbo.app_users(normalized_email);
END
GO

PRINT 'dbo.app_users is ready.';
GO
