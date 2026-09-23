-- =============================================
-- Function: sec.usp_get_menu_assign
-- Description: Get menus assigned to a user group with user's favorite status
-- Parameters:
--   in_intUserGroupId - User group ID from JWT claim "Role"
--   in_vchPlatform    - Platform (e.g. 'web')
--   in_vchUserId      - User ID for checking favorites
-- =============================================
CREATE OR REPLACE FUNCTION sec.usp_get_menu_assign(in_int_user_group_id integer, in_vch_platform text, in_vch_user_id text)
 RETURNS TABLE(user_group_id integer, is_add_view boolean, is_edit_view boolean, is_delete_view boolean, is_view boolean, menu_id integer, parent_menu_id integer, menu_name character varying, menu_group character varying, process character varying, menu_group_sequence integer, menu_sequence integer, manu_favorite_id integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        ugm.user_group_id,
        ugm.is_add_view,
        ugm.is_edit_view,
        ugm.is_delete_view,
        ugm.is_view,
        m.menu_id,
        m.parent_menu_id,
        m.menu_name,
        m.menu_group,
        m.process,
        m.menu_group_sequence,
        m.menu_sequence,
        COALESCE(f.manu_favorite_id, 0) AS manu_favorite_id
    FROM sec.t_com_user_group_menu ugm
    JOIN sec.t_com_menu m ON m.menu_id = ugm.menu_id
    LEFT JOIN sec.t_com_menu_favorite f
        ON f.menu_id = m.menu_id
        AND f.user_id = in_vch_user_id
        AND f.is_active = true
    WHERE ugm.user_group_id = in_int_user_group_id
      AND m.platform = in_vch_platform
      AND m.is_active = true
    ORDER BY m.menu_group_sequence, m.menu_sequence;
END;
$function$
;

