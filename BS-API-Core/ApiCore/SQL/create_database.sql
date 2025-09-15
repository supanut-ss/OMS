-- Timesheet Database Creation Script
-- This script can be run with: sqlcmd -S (localdb)\MSSQLLocalDB -i create_database.sql

-- Create the database if it doesn't exist
IF NOT EXISTS (SELECT *
FROM sys.databases
WHERE name = 'TimesheetDB')
BEGIN
    CREATE DATABASE [TimesheetDB]
END
GO

USE [TimesheetDB]
GO

-- Drop existing tables if they exist
IF OBJECT_ID('time_entries', 'U') IS NOT NULL DROP TABLE time_entries;
IF OBJECT_ID('projects', 'U') IS NOT NULL DROP TABLE projects;
IF OBJECT_ID('customers', 'U') IS NOT NULL DROP TABLE customers;
IF OBJECT_ID('t_com_user', 'U') IS NOT NULL DROP TABLE t_com_user;

-- Create Users table
CREATE TABLE [dbo].[t_com_user]
(
    [tran_id] [varchar](40) NOT NULL,
    [user_id] [nvarchar](25) NOT NULL,
    [name] [nvarchar](50) NOT NULL,
    [first_name] [nvarchar](50) NULL,
    [last_name] [nvarchar](50) NULL,
    [password] [nvarchar](50) NULL,
    [locale_id] [varchar](40) NULL,
    [is_active] [nvarchar](3) NOT NULL,
    [department] [nvarchar](30) NULL,
    [supervisor] [nvarchar](30) NULL,
    [email_address] [nvarchar](30) NULL,
    [domain_user_id] [nvarchar](30) NULL,
    [domain] [nvarchar](30) NULL,
    [create_date] [datetime] NOT NULL,
    [create_by] [nvarchar](25) NOT NULL,
    [rowversion] [timestamp] NOT NULL,
    CONSTRAINT [PK_t_com_user] PRIMARY KEY CLUSTERED 
(
    [tran_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO

ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_tran_id]  DEFAULT (newid()) FOR [tran_id]
GO

ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_locale_id]  DEFAULT ((1033)) FOR [locale_id]
GO

ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_is_active]  DEFAULT ('YES') FOR [is_active]
GO

ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_create_date]  DEFAULT (getdate()) FOR [create_date]
GO

-- Create Customers table
CREATE TABLE customers
(
    Id NVARCHAR(40) PRIMARY KEY DEFAULT NEWID(),
    Code NVARCHAR(50) NOT NULL UNIQUE,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    Email NVARCHAR(100) NULL,
    Phone NVARCHAR(50) NULL,
    Address NVARCHAR(200) NULL,
    City NVARCHAR(50) NULL,
    Province NVARCHAR(50) NULL,
    PostalCode NVARCHAR(10) NULL,
    IsActive NVARCHAR(3) NOT NULL DEFAULT 'YES',
    CreateBy NVARCHAR(100) NULL,
    CreateDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdateBy NVARCHAR(100) NULL,
    UpdateDate DATETIME2 NULL
);

-- Create Projects table
CREATE TABLE projects
(
    Id NVARCHAR(40) PRIMARY KEY DEFAULT NEWID(),
    ProjectNo NVARCHAR(50) NOT NULL UNIQUE,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    CustomerId NVARCHAR(40) NOT NULL,
    StartDate DATETIME2 NOT NULL,
    EndDate DATETIME2 NOT NULL,
    ActualEndDate DATETIME2 NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    Budget DECIMAL(18,2) NULL,
    EstimatedHours FLOAT NOT NULL DEFAULT 0,
    ProjectManager NVARCHAR(100) NULL,
    CreateBy NVARCHAR(100) NULL,
    CreateDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdateBy NVARCHAR(100) NULL,
    UpdateDate DATETIME2 NULL,

    CONSTRAINT FK_Projects_Customers FOREIGN KEY (CustomerId) 
        REFERENCES customers(Id) ON DELETE NO ACTION
);

-- Create Time Entries table
CREATE TABLE time_entries
(
    Id NVARCHAR(40) PRIMARY KEY DEFAULT NEWID(),
    ProjectId NVARCHAR(40) NOT NULL,
    WorkDate DATE NOT NULL,
    Hours DECIMAL(5,2) NOT NULL CHECK (Hours > 0 AND Hours <= 24),
    TaskName NVARCHAR(200) NOT NULL,
    TaskDescription NVARCHAR(MAX) NULL,
    TaskType NVARCHAR(50) NULL,
    Status NVARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    AssignedTo NVARCHAR(100) NULL,
    CreateBy NVARCHAR(100) NULL,
    CreateDate DATETIME2 NOT NULL DEFAULT GETDATE(),
    UpdateBy NVARCHAR(100) NULL,
    UpdateDate DATETIME2 NULL,

    CONSTRAINT FK_TimeEntries_Projects FOREIGN KEY (ProjectId) 
        REFERENCES projects(Id) ON DELETE NO ACTION
);

-- Create Indexes for better performance
CREATE INDEX IX_Customers_Code ON customers(Code);
CREATE INDEX IX_Customers_IsActive ON customers(IsActive);
CREATE INDEX IX_Projects_ProjectNo ON projects(ProjectNo);
CREATE INDEX IX_Projects_CustomerId ON projects(CustomerId);
CREATE INDEX IX_Projects_Status ON projects(Status);
CREATE INDEX IX_TimeEntries_ProjectId ON time_entries(ProjectId);
CREATE INDEX IX_TimeEntries_WorkDate ON time_entries(WorkDate);
CREATE INDEX IX_TimeEntries_Status ON time_entries(Status);
CREATE INDEX IX_Users_UserId ON t_com_user(user_id);
CREATE INDEX IX_Users_Email ON t_com_user(email_address);
CREATE INDEX IX_Users_IsActive ON t_com_user(is_active);

-- Insert sample data
INSERT INTO t_com_user
    (tran_id, user_id, name, first_name, last_name, password, email_address, department, create_by)
VALUES
    (NEWID(), 'admin', 'System Administrator', 'Admin', 'User', 'admin123', 'admin@timesheet.com', 'IT', 'System'),
    (NEWID(), 'testuser', 'Test User', 'Test', 'User', 'test123', 'test@timesheet.com', 'Development', 'System'),
    (NEWID(), 'johndoe', 'John Doe', 'John', 'Doe', 'john123', 'john@timesheet.com', 'Project Management', 'System');

INSERT INTO customers
    (Id, Code, Name, Description, Email, Phone, Address, City, Province, PostalCode, CreateBy)
VALUES
    (NEWID(), 'CUST001', 'ABC Company', 'Primary customer for development projects', 'contact@abc.com', '02-123-4567', '123 Business St', 'Bangkok', 'Bangkok', '10100', 'System'),
    (NEWID(), 'CUST002', 'XYZ Corporation', 'Secondary customer for consulting', 'info@xyz.com', '02-765-4321', '456 Corporate Ave', 'Bangkok', 'Bangkok', '10200', 'System');

DECLARE @CustomerId1 NVARCHAR(40), @CustomerId2 NVARCHAR(40);
SELECT @CustomerId1 = Id
FROM customers
WHERE Code = 'CUST001';
SELECT @CustomerId2 = Id
FROM customers
WHERE Code = 'CUST002';

INSERT INTO projects
    (Id, ProjectNo, Title, Description, CustomerId, StartDate, EndDate, Status, Budget, EstimatedHours, ProjectManager, CreateBy)
VALUES
    (NEWID(), 'PRJ001', 'Website Development', 'Develop new company website', @CustomerId1, '2025-01-01', '2025-03-31', 'ACTIVE', 150000.00, 300, 'John Doe', 'System'),
    (NEWID(), 'PRJ002', 'Mobile App', 'Create mobile application', @CustomerId1, '2025-02-01', '2025-05-31', 'PLANNING', 250000.00, 500, 'Jane Smith', 'System'),
    (NEWID(), 'PRJ003', 'System Integration', 'Integrate legacy systems', @CustomerId2, '2025-01-15', '2025-04-15', 'ACTIVE', 100000.00, 200, 'Bob Johnson', 'System');

PRINT 'Database TimesheetDB created successfully with sample data!';
GO
