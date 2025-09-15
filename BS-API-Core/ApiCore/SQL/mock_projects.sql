-- Mockup data for projects (200 records)
-- Run this script after creating the projects and customers tables

USE [TimesheetDB]
GO

-- Project data will be randomly distributed across available customers
DECLARE @CustomerIds TABLE (Id NVARCHAR(40),
    RowNum INT IDENTITY(1,1));
INSERT INTO @CustomerIds
    (Id)
SELECT Id
FROM customers
ORDER BY Code;

DECLARE @CustomerCount INT = (SELECT COUNT(*)
FROM @CustomerIds);
DECLARE @ProjectTypes TABLE (TypeName NVARCHAR(100));
INSERT INTO @ProjectTypes
VALUES
    (N'เว็บไซต์'),
    (N'แอปพลิเคชัน'),
    (N'ระบบจัดการ'),
    (N'อีคอมเมิร์ซ'),
    (N'ระบบบัญชี'),
    (N'ระบบ HR'),
    (N'ระบบคลังสินค้า'),
    (N'ระบบ CRM'),
    (N'แดชบอร์ด'),
    (N'ระบบรายงาน'),
    (N'ระบบจองออนไลน์'),
    (N'ระบบชำระเงิน'),
    (N'ระบบสมาชิก'),
    (N'ระบบแจ้งเตือน'),
    (N'ระบบสำรองข้อมูล'),
    (N'ระบบรักษาความปลอดภัย'),
    (N'ระบบตรวจสอบ'),
    (N'ระบบวิเคราะห์'),
    (N'ระบบประเมิน'),
    (N'ระบบจัดส่ง');

DECLARE @StatusList TABLE (StatusName NVARCHAR(20));
INSERT INTO @StatusList
VALUES
    (N'DRAFT'),
    (N'PLANNING'),
    (N'ACTIVE'),
    (N'COMPLETED'),
    (N'ON_HOLD');

DECLARE @i INT = 1;
DECLARE @CustomerId NVARCHAR(40);
DECLARE @ProjectType NVARCHAR(100);
DECLARE @Status NVARCHAR(20);
DECLARE @StartDate DATETIME2;
DECLARE @EndDate DATETIME2;
DECLARE @Budget DECIMAL(18,2);
DECLARE @Hours FLOAT;

WHILE @i <= 200
BEGIN
    -- Select random customer
    SELECT @CustomerId = Id
    FROM @CustomerIds
    WHERE RowNum = ((@i - 1) % @CustomerCount) + 1;

    -- Select random project type
    SELECT TOP 1
        @ProjectType = TypeName
    FROM @ProjectTypes
    ORDER BY NEWID();

    -- Select random status
    SELECT TOP 1
        @Status = StatusName
    FROM @StatusList
    ORDER BY NEWID();

    -- Generate random dates
    SET @StartDate = DATEADD(DAY, -RAND() * 365, GETDATE());
    SET @EndDate = DATEADD(DAY, RAND() * 365 + 30, @StartDate);

    -- Generate random budget and hours
    SET @Budget = 50000 + (RAND() * 500000);
    SET @Hours = 40 + (RAND() * 960);
    -- 40-1000 hours

    INSERT INTO projects
        (
        Id, ProjectNo, Title, Description, CustomerId, StartDate, EndDate,
        Status, Budget, EstimatedHours, ProjectManager, CreateBy,CreateDate
        )
    VALUES
        (
            NEWID(),
            CONCAT(N'PRJ', RIGHT(N'000' + CAST(@i + 3 AS NVARCHAR), 3)),
            CONCAT(N'โปรเจกต์', @ProjectType, N' #', @i),
            CONCAT(N'โปรเจกต์พัฒนา', @ProjectType, N' สำหรับลูกค้าในการดำเนินธุรกิจให้มีประสิทธิภาพมากขึ้น โปรเจกต์หมายเลข ', @i),
            @CustomerId,
            @StartDate,
            @EndDate,
            @Status,
            @Budget,
            @Hours,
            CASE 
            WHEN @i % 10 = 1 THEN N'นายสมชาย จันทร์เพ็ญ'
            WHEN @i % 10 = 2 THEN N'นางสาวพิมพ์ใจ สุขสันต์'
            WHEN @i % 10 = 3 THEN N'นายวิชัย ดีใจ'
            WHEN @i % 10 = 4 THEN N'นางสุดใจ รักงาน'
            WHEN @i % 10 = 5 THEN N'นายเทพ ชาญกิจ'
            WHEN @i % 10 = 6 THEN N'นางสาวมานี ใฝ่รู้'
            WHEN @i % 10 = 7 THEN N'นายสมศักดิ์ มั่นคง'
            WHEN @i % 10 = 8 THEN N'นางปรีดา ซื่อสัตย์'
            WHEN @i % 10 = 9 THEN N'นายไกรยา ขยันเก็บ'
            ELSE N'นางสาวจิรา มุ่งมั่น'
        END,
            'System',
            GETDATE()
    );

    SET @i = @i + 1;
END

PRINT 'Inserted 200 project records successfully!';
GO
