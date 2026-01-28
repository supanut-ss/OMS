USE [Timesheet]
GO

/****** Object:  StoredProcedure [tmt].[usp_tmt_dashboard_project_timeline] ******/
-- Description: ดึงข้อมูล Project Timeline สำหรับหน้า ManPower Dashboard
-- Parameters:
--   @in_dtStartDate: วันที่เริ่มต้น (ต้องส่งค่ามาเสมอ)
--   @in_dtEndDate: วันที่สิ้นสุด (ต้องส่งค่ามาเสมอ)
--   @in_vchProjectHeaderID: Project Header ID (optional)
--   @in_xmlUserID: XML list ของ user_id (optional)
-- Modified: 2026-01-28 - แก้ไขให้รองรับ multiple users จาก XML

ALTER PROCEDURE [tmt].[usp_tmt_dashboard_project_timeline]
    (
    @in_dtStartDate        DATE,
    --ต้องส่งค่ามาเสมอ
    @in_dtEndDate          DATE,
    --ต้องส่งค่ามาเสมอ			
    @in_vchProjectHeaderID INT = NULL,
    @in_xmlUserID          XML = NULL
--ส่งค่ามาเป็น list user id

)
AS 
BEGIN
    SET NOCOUNT ON;

    -- ใช้ Table Variable แทน Temp Table เพื่อหลีกเลี่ยงปัญหา query optimization
    DECLARE @tGetDataXML TABLE (user_id NVARCHAR(40));
    DECLARE @hasUserFilter BIT = 0;

    -- Parse XML ถ้ามีค่า
    -- รองรับ 2 formats:
    -- Format 1: <XMLData><data_read>user1</data_read><data_read>user2</data_read></XMLData>
    -- Format 2: <XMLData><data_read>user1</data_read></XMLData><XMLData><data_read>user2</data_read></XMLData>
    IF @in_xmlUserID IS NOT NULL
    BEGIN
        INSERT INTO @tGetDataXML
            (user_id)
        SELECT LTRIM(RTRIM(xmlData.value('.', 'NVARCHAR(40)'))) AS user_id
        FROM @in_xmlUserID.nodes('//data_read') AS N(xmlData)
        WHERE xmlData.value('.', 'NVARCHAR(40)') IS NOT NULL
            AND LTRIM(RTRIM(xmlData.value('.', 'NVARCHAR(40)'))) <> '';

        -- Set flag ถ้ามี user filter
        IF EXISTS (SELECT 1
        FROM @tGetDataXML)
            SET @hasUserFilter = 1;
    END

    -- ใช้ CTE
    ;
    WITH
        tProject
        AS
        (
            SELECT hd.project_header_id 
            , hd.project_no
            , hd.project_name
            , ISNULL(hd.actual_project_start, ISNULL(hd.revise_project_start, hd.plan_project_start)) AS project_start
            , ISNULL(hd.actual_project_end, ISNULL(hd.revise_project_end, hd.plan_project_end)) AS project_end
            , taskMem.user_id AS task_user_id
            , task.project_task_id
            , task.task_no
            , task.task_name
            , task.task_description  
            , task.start_date AS task_start_date 
            , task.end_date AS task_end_date
            , taskMem.manday AS task_plan_manday
            , taskTracking.actual_work
            FROM tmt.t_tmt_project_header hd WITH (NOLOCK)
                INNER JOIN tmt.t_tmt_project_task task WITH (NOLOCK)
                ON hd.project_header_id = task.project_header_id
                INNER JOIN tmt.t_tmt_project_task_member taskMem WITH (NOLOCK)
                ON task.project_task_id = taskMem.project_task_id
                LEFT JOIN (
            SELECT project_task_id
                , assignee
                , SUM(ISNULL(actual_work, 0)) AS actual_work
                FROM tmt.t_tmt_project_task_tracking WITH (NOLOCK)
                GROUP BY project_task_id, assignee
        ) taskTracking
                ON task.project_task_id = taskTracking.project_task_id
                    AND taskMem.user_id = taskTracking.assignee
            WHERE task.start_date <= @in_dtEndDate
                AND task.end_date >= @in_dtStartDate
                -- Filter by user_id: ใช้ @hasUserFilter flag แทน NOT EXISTS
                AND (
                @hasUserFilter = 0
                OR taskMem.user_id IN (SELECT user_id
                FROM @tGetDataXML)
            )
                -- Filter by project_header_id
                AND (hd.project_header_id = @in_vchProjectHeaderID OR @in_vchProjectHeaderID IS NULL)
        )
    ,
        tTaskSummary
        AS
        (
            SELECT project_header_id
            , task_user_id
            , SUM(ISNULL(task_plan_manday, 0)) AS total_task_plan_manday
            , SUM(ISNULL(actual_work, 0)) AS total_actual_work
            FROM tProject
            GROUP BY project_header_id, task_user_id
        )
    ,
        tTaskDateRange
        AS
        (
            SELECT project_header_id
            , task_user_id
            , MIN(task_start_date) AS min_task_start_date
            , MAX(task_end_date) AS max_task_end_date
            FROM tProject
            GROUP BY project_header_id, task_user_id
        )
    SELECT u.user_id
        , u.first_name
        , u.last_name
        , tProject.project_header_id
        , tProject.project_no
        , tProject.project_name 
        , tDateRange.min_task_start_date
        , tDateRange.max_task_end_date
        , tProject.task_user_id
        , tProject.project_task_id
        , tProject.task_no
        , tProject.task_name
        , tProject.task_description  
        , tProject.task_start_date
        , tProject.task_end_date 
        , tProject.task_plan_manday
        , tProject.actual_work
        , tTaskSummary.total_task_plan_manday
        , tTaskSummary.total_actual_work
    FROM tProject
        INNER JOIN sec.t_com_user u WITH (NOLOCK)
        ON u.user_id = tProject.task_user_id
        LEFT JOIN tTaskSummary
        ON tProject.project_header_id = tTaskSummary.project_header_id
            AND tProject.task_user_id = tTaskSummary.task_user_id
        LEFT JOIN tTaskDateRange tDateRange
        ON tProject.project_header_id = tDateRange.project_header_id
            AND tProject.task_user_id = tDateRange.task_user_id
    ORDER BY u.user_id, tProject.project_header_id, tProject.task_start_date, tProject.task_end_date
    OPTION
    (RECOMPILE);
-- บังคับให้ SQL Server สร้าง execution plan ใหม่ทุกครั้ง
END
GO

/*
-- Test: ไม่ส่ง user (ได้ทุกคน)
EXEC tmt.usp_tmt_dashboard_project_timeline 
    @in_dtStartDate = '2026-01-01',
    @in_dtEndDate = '2026-01-31',
    @in_vchProjectHeaderID = NULL,
    @in_xmlUserID = NULL;

-- Test: ส่ง user หลายคน
DECLARE @xml XML = '<XMLData><data_read>kjutathip</data_read><data_read>bkritsada</data_read><data_read>tpongsak</data_read></XMLData>';
EXEC tmt.usp_tmt_dashboard_project_timeline 
    @in_dtStartDate = '2026-01-01',
    @in_dtEndDate = '2026-01-31',
    @in_vchProjectHeaderID = NULL,
    @in_xmlUserID = @xml;
*/
