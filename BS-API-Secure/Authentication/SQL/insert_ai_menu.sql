-- =============================================
-- Script  : insert_ai_menu.sql
-- Purpose : Insert AI Control Center menus into [sec].[t_com_menu]
--           so that access is controlled via the standard
--           AssignMenu / user-group permission system.
--
-- Steps after running this script:
--   1. Open AssignMenu page in the web app.
--   2. Select the desired user group and platform = WEB.
--   3. Check the AI menus and set permissions (View / Add / Edit / Delete).
--   4. Save, then ask affected users to log out and back in.
--
-- Safe to run multiple times: uses IF NOT EXISTS guards.
-- =============================================

DECLARE @v_parent_id INT;
DECLARE @v_app_id    INT;

-- ── Resolve app_id from existing WEB menus ────────────────────────────
SELECT TOP 1 @v_app_id = [app_id]
FROM   [sec].[t_com_menu]
WHERE  [platform] = 'WEB' AND [is_active] = 1
ORDER  BY [menu_id];

-- ── 1. Insert AI parent menu group (group header) ─────────────────────
--       parent_menu_id = NULL  →  marks this row as a group header
--       process        = ''    →  group headers have no route path
--       menu_sequence  = 90    →  matches menu_group_sequence (convention)
IF NOT EXISTS (
    SELECT 1 FROM [sec].[t_com_menu]
    WHERE [menu_group] = 'AI' AND [platform] = 'WEB' AND [parent_menu_id] IS NULL
)
BEGIN
    INSERT INTO [sec].[t_com_menu]
        ([app_id], [menu_group], [menu_name], [platform], [menu_type], [process],
         [menu_group_sequence], [parent_menu_id], [menu_sequence],
         [is_active], [create_by], [create_date], [update_by], [update_date])
    VALUES
        (@v_app_id, 'AI', 'AI Control Center', 'WEB', NULL, '',
         90, NULL, 90,
         1, 'system', GETDATE(), 'system', GETDATE());

    SET @v_parent_id = SCOPE_IDENTITY();
    PRINT 'AI parent menu inserted, menu_id = ' + CAST(@v_parent_id AS VARCHAR);
END
ELSE
BEGIN
    SELECT @v_parent_id = [menu_id]
    FROM   [sec].[t_com_menu]
    WHERE  [menu_group] = 'AI' AND [platform] = 'WEB' AND [parent_menu_id] IS NULL;

    PRINT 'AI parent menu already exists, menu_id = ' + CAST(@v_parent_id AS VARCHAR);
END;

-- ── 2. Insert AI submenu items ─────────────────────────────────────────
INSERT INTO [sec].[t_com_menu]
    ([app_id], [menu_group], [menu_name], [platform], [menu_type], [process],
     [menu_group_sequence], [parent_menu_id], [menu_sequence],
     [is_active], [create_by], [create_date], [update_by], [update_date])
SELECT
    @v_app_id,
    m.[menu_group], m.[menu_name], m.[platform], m.[menu_type], m.[process],
    m.[menu_group_sequence], @v_parent_id, m.[menu_sequence],
    1, 'system', GETDATE(), 'system', GETDATE()
FROM (VALUES
    ('AI', 'AI Overview',            'WEB', 'MENU', '/ai/overview',            90, 1),
    ('AI', 'Provider Config',        'WEB', 'MENU', '/ai/provider-config',     90, 2),
    ('AI', 'Prompt & Page Config',   'WEB', 'MENU', '/ai/page-config',         90, 3),
    ('AI', 'Knowledge Documents',    'WEB', 'MENU', '/ai/knowledge-documents', 90, 4),
    ('AI', 'Schema Knowledge',       'WEB', 'MENU', '/ai/schema-knowledge',    90, 5),
    ('AI', 'Usage & Retrieval Logs', 'WEB', 'MENU', '/ai/logs',                90, 6)
) AS m([menu_group], [menu_name], [platform], [menu_type], [process], [menu_group_sequence], [menu_sequence])
WHERE NOT EXISTS (
    SELECT 1 FROM [sec].[t_com_menu] ex
    WHERE ex.[process] = m.[process] AND ex.[platform] = 'WEB'
);

PRINT 'AI submenus inserted (skipped if already existed).';

-- ── Verify ────────────────────────────────────────────────────────────────
SELECT [menu_id], [app_id], [menu_group], [menu_name], [process],
       [menu_sequence], [parent_menu_id], [is_active]
FROM   [sec].[t_com_menu]
WHERE  [menu_group] = 'AI' AND [platform] = 'WEB'
ORDER  BY [menu_sequence];
