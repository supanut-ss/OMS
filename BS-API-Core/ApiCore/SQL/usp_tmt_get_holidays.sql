-- =============================================
-- Stored Procedure: tmt.usp_tmt_get_holidays
-- Description: Get holidays from t_tmt_holiday table for BSGanttChart
-- Author: BS Platform Team
-- Date: 2026-01-21
-- =============================================

USE [WM3]
GO

-- Drop existing procedure if exists
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[tmt].[usp_tmt_get_holidays]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [tmt].[usp_tmt_get_holidays]
GO

CREATE PROCEDURE [tmt].[usp_tmt_get_holidays]
    @in_dtStartDate DATE = NULL,
    -- Optional: Filter start date
    @in_dtEndDate DATE = NULL,
    -- Optional: Filter end date
    @in_intYear INT = NULL
-- Optional: Filter by year
AS
BEGIN
    SET NOCOUNT ON;

    -- If year is specified, use it to set date range
    IF @in_intYear IS NOT NULL
    BEGIN
        SET @in_dtStartDate = DATEFROMPARTS(@in_intYear, 1, 1);
        SET @in_dtEndDate = DATEFROMPARTS(@in_intYear, 12, 31);
    END

    -- If no date range specified, return all holidays
    SELECT
        h.holiday_id,
        h.holiday_date,
        h.holiday_name,
        h.description,
        h.is_active,
        h.created_date,
        h.modified_date
    FROM [tmt].[t_tmt_holiday] h
    WHERE h.is_active = 1
        AND (@in_dtStartDate IS NULL OR h.holiday_date >= @in_dtStartDate)
        AND (@in_dtEndDate IS NULL OR h.holiday_date <= @in_dtEndDate)
    ORDER BY h.holiday_date ASC;

END
GO

-- Grant execute permission
GRANT EXECUTE ON [tmt].[usp_tmt_get_holidays] TO [public]
GO

PRINT 'Stored procedure [tmt].[usp_tmt_get_holidays] created successfully.'
GO

-- =============================================
-- Alternative: If t_tmt_holiday table doesn't exist, create it
-- =============================================

/*
-- Create holiday table if not exists
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[tmt].[t_tmt_holiday]') AND type in (N'U'))
BEGIN
    CREATE TABLE [tmt].[t_tmt_holiday](
        [holiday_id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [holiday_date] DATE NOT NULL,
        [holiday_name] NVARCHAR(200) NOT NULL,
        [description] NVARCHAR(500) NULL,
        [is_active] BIT NOT NULL DEFAULT 1,
        [created_by] INT NULL,
        [created_date] DATETIME NOT NULL DEFAULT GETDATE(),
        [modified_by] INT NULL,
        [modified_date] DATETIME NULL
    );

    CREATE INDEX IX_t_tmt_holiday_date ON [tmt].[t_tmt_holiday] (holiday_date);
    
    PRINT 'Table [tmt].[t_tmt_holiday] created successfully.'
END
GO

-- Insert sample Thai holidays for 2026
INSERT INTO [tmt].[t_tmt_holiday] (holiday_date, holiday_name, description)
VALUES 
    ('2026-01-01', N'วันขึ้นปีใหม่', N'New Year Day'),
    ('2026-02-26', N'วันมาฆบูชา', N'Makha Bucha Day'),
    ('2026-04-06', N'วันจักรี', N'Chakri Memorial Day'),
    ('2026-04-13', N'วันสงกรานต์', N'Songkran Festival'),
    ('2026-04-14', N'วันสงกรานต์', N'Songkran Festival'),
    ('2026-04-15', N'วันสงกรานต์', N'Songkran Festival'),
    ('2026-05-01', N'วันแรงงานแห่งชาติ', N'National Labour Day'),
    ('2026-05-04', N'วันฉัตรมงคล', N'Coronation Day'),
    ('2026-05-25', N'วันวิสาขบูชา', N'Visakha Bucha Day'),
    ('2026-06-03', N'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ', N'Queen Suthida Birthday'),
    ('2026-07-23', N'วันอาสาฬหบูชา', N'Asanha Bucha Day'),
    ('2026-07-24', N'วันเข้าพรรษา', N'Buddhist Lent Day'),
    ('2026-07-28', N'วันเฉลิมพระชนมพรรษา ร.10', N'King Vajiralongkorn Birthday'),
    ('2026-08-12', N'วันแม่แห่งชาติ', N'Queen Sirikit Birthday'),
    ('2026-10-13', N'วันคล้ายวันสวรรคต ร.9', N'King Bhumibol Memorial Day'),
    ('2026-10-23', N'วันปิยมหาราช', N'Chulalongkorn Day'),
    ('2026-12-05', N'วันพ่อแห่งชาติ', N'King Bhumibol Birthday'),
    ('2026-12-10', N'วันรัฐธรรมนูญ', N'Constitution Day'),
    ('2026-12-31', N'วันสิ้นปี', N'New Year Eve');
GO
*/
