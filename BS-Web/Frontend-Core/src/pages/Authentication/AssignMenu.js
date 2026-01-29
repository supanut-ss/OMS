import { useState, useEffect } from "react";
import BSFullScreenLoader from "../../contexts/BSFullScreenLoader";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { useMenuContext } from "../../contexts/MenuContext";
import BsAutoComplete from "../../components/BSAutoComplete";
import {
  FormControl,
  Box,
  Button,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
} from "@mui/material";
import CustomTreeView from "../../components/CustomTreeView";
import Logger from "../../utils/logger";
import { useResource } from "../../hooks/useResource";
import { useOutletContext } from "react-router-dom";

const MenuTreeView = (props) => {
  const { permission } = useOutletContext();
  const { getMenuAssign, saveMenuAssign } = useMenuContext();
  const [selectedGroup, setSelectedGroup] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [menuData, setMenuData] = useState([]);
  const [selectionPropagation] = useState({
    parents: true,
    descendants: true,
  });
  const [tabIndex, setTabIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localeId, setLocaleId] = useState(props.lang || "en");
  const { getResourceByGroupAndName } = useResource();
  const getLang = async () => {
    try {
      setLocaleId(props.lang || "en");
    } catch (error) {
      console.error("getResources(AssignMenu) error:", error);
    }
  };

  // โหลด resource ตอน mount และเมื่อ props.lang เปลี่ยน — ตอนนี้จะรีโหลด resource และ rebuild menu tree หากมีการเลือก group+platform อยู่
  useEffect(() => {
    getLang();
  }, [props.lang]);

  const toBool = (v) =>
    v === true || v === 1 || String(v).toUpperCase() === "YES";

  const buildMenuTree = (rows = []) => {
    if (!Array.isArray(rows)) return [];
    const nodes = {};
    const groups = {};

    rows.forEach((r) => {
      const id = String(r.menu_id);
      const parentId = r.parent_menu_id ? String(r.parent_menu_id) : null;
      const groupName = r.menu_group || "Ungrouped";

      const perms = [
        {
          id: `add-${id}`,
          label: "➕ " + getResourceByGroupAndName("AssignMenu", "is_add_view", localeId)?.resource_value || "Add",
          isCheck: toBool(r.is_add_view),
        },
        {
          id: `edit-${id}`,
          label: "✏️ " + getResourceByGroupAndName("AssignMenu", "is_edit_view", localeId)?.resource_value || "Edit",
          isCheck: toBool(r.is_edit_view),
        },
        {
          id: `delete-${id}`,
          label:
            "🗑️ " + getResourceByGroupAndName("AssignMenu", "is_delete_view", localeId)?.resource_value || "Delete",
          isCheck: toBool(r.is_delete_view),
        },
        {
          id: `view-${id}`,
          label: "👁️ " + getResourceByGroupAndName("AssignMenu", "is_view", localeId)?.resource_value || "View",
          isCheck: toBool(r.is_view),
        },
      ];

      nodes[id] = {
        id,
        label:
          getResourceByGroupAndName("Menu", r.menu_name, localeId)?.resource_value ||
          r.menu_name ||
          `menu-${id}`,
        isCheck: toBool(r.is_view),
        parentId,
        groupName,
        groupSequence: Number(r.menu_group_sequence ?? 0),
        sequence: Number(r.menu_sequence ?? 0),
        menuChildren: [],
        permChildren: perms,
      };

      if (!groups[groupName]) {
        groups[groupName] = {
          id: groupName,
          label: groupName,
          roots: [],
          groupSequence: Number(r.menu_group_sequence ?? 0),
        };
      }
      groups[groupName].roots.push(id);
    });

    Object.values(nodes).forEach((node) => {
      if (node.parentId && nodes[node.parentId])
        nodes[node.parentId].menuChildren.push(node);
    });

    const buildNode = (node) => {
      const sortedMenuChildren = (node.menuChildren || []).sort(
        (a, b) => (a.sequence || 0) - (b.sequence || 0)
      );
      const menuChildrenNodes = sortedMenuChildren.map((c) => buildNode(c));
      // ถ้ามีเมนูลูก ให้ไม่สร้าง permission leaves สำหรับเมนูนี้
      const permLeaves =
        node.menuChildren && node.menuChildren.length
          ? []
          : (node.permChildren || []).map((p) => ({
            id: p.id,
            label: p.label,
            isCheck: !!p.isCheck,
          }));
      const children = [...menuChildrenNodes, ...permLeaves];
      return {
        id: node.id,
        label: node.label,
        isCheck: !!node.isCheck,
        children: children.length ? children : undefined,
      };
    };

    return Object.values(groups)
      .sort((a, b) => a.groupSequence - b.groupSequence)
      .map((g) => {
        const rootNodes = (g.roots || [])
          .map((menuId) => nodes[menuId])
          .filter((n) => n && !n.parentId)
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
          .map((n) => buildNode(n));
        return { id: g.id, label: g.label, children: rootNodes };
      });
  };

  // โหลดข้อมูลเมนูเมื่อเลือกทั้ง userGroup และ platform เท่านั้น
  useEffect(() => {
    const fetchMenuRows = async () => {
      if (selectedGroup && selectedPlatform) {
        setLoading(true);
        try {
          const result = await getMenuAssign(
            selectedGroup ?? "",
            selectedPlatform ?? ""
          );
          const tree = buildMenuTree(result?.data || []);
          setMenuData(tree);
          setTabIndex(0);
        } catch (err) {
          setMenuData([]);
          setTabIndex(0);
          BSAlertSwal2.show(
            "error",
            "เกิดข้อผิดพลาดหรือ API ไม่พบข้อมูล (404)"
          );
        } finally {
          setLoading(false);
        }
      } else {
        setMenuData([]);
        setTabIndex(0);
      }
    };
    fetchMenuRows();
  }, [selectedGroup, selectedPlatform, localeId]);

  const updateParentChildren = (parentId, newChildren) => {
    setMenuData((prev) =>
      prev.map((p) => (p.id === parentId ? { ...p, children: newChildren } : p))
    );
  };

  const collectCheckedMenus = (
    items = [],
    platform,
    userGroupId,
    result = []
  ) => {
    // ดึงค่า id ที่ backend ต้องการ
    const userGroupIdValue = userGroupId?.user_group_id
      ? parseInt(userGroupId.user_group_id, 10)
      : parseInt(userGroupId, 10);
    const platformValue =
      platform?.code || platform?.display_member || platform || "";

    items.forEach((item) => {
      if (/^(add|edit|delete|view)-/.test(item.id)) {
        const [type, menuId] = item.id.split("-");
        let rec = result.find((r) => r.menu_id === menuId);
        if (!rec) {
          rec = {
            userGroupId: userGroupIdValue,
            menu_id: menuId,
            platform: platformValue,
            isAddView: "NO",
            isEditView: "NO",
            isDeleteView: "NO",
            isView: "NO",
          };
          result.push(rec);
        }
        if (type === "add") rec.isAddView = item.isCheck ? "YES" : "NO";
        if (type === "edit") rec.isEditView = item.isCheck ? "YES" : "NO";
        if (type === "delete") rec.isDeleteView = item.isCheck ? "YES" : "NO";
        if (type === "view") rec.isView = item.isCheck ? "YES" : "NO";
      }
      if (Array.isArray(item.children) && item.children.length) {
        collectCheckedMenus(item.children, platform, userGroupId, result);
      }
    });
    return result;
  };

  const handleSave = async () => {
    setSaving(true);
    setLoading(true);
    try {
      const checkedMenus = collectCheckedMenus(
        menuData,
        selectedPlatform,
        selectedGroup
      );
      const result = await saveMenuAssign(checkedMenus);
      if (result && result.message_code === "0") {
        BSAlertSwal2.show("success", result.message_text, {
          timer: 2000,
        });
      } else {
        BSAlertSwal2.show(
          "error",
          result?.message_text || "บันทึกข้อมูลไม่สำเร็จ"
        );
      }
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  return (
    <>
      <BSFullScreenLoader open={loading} />
      <Paper sx={{ p: 3, width: "100%" }}>
        <Box display="flex" gap={3} alignItems="center">
          <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
            <BsAutoComplete
              bsMode="single"
              bsTitle={getResourceByGroupAndName("AssignMenu", "user_group_id", localeId)?.resource_value || "User Group"}
              bsPreObj="sec.t_com_"
              bsObj="user_group"
              bsColumes={[
                {
                  field: "user_group_id",
                  display: false,
                  filter: false,
                  key: true,
                },
                { field: "name", display: true, filter: false, key: false },
              ]}
              bsObjBy="name asc"
              bsObjWh=""
              bsValue={selectedGroup} // ค่าเริ่มต้น = code ของ option
              //bsCacheKey="group"
              bsLoadOnOpen={true}
              bsOnChange={(val) => setSelectedGroup(val?.user_group_id ?? "")}
              required={true}
            />
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
            <BsAutoComplete
              bsMode="single"
              bsTitle={getResourceByGroupAndName("AssignMenu", "platform", localeId)?.resource_value || "Platform"}
              bsPreObj="sec.t_com_"
              bsObj="combobox_item"
              bsColumes={[
                {
                  field: "display_member",
                  display: true,
                  filter: false,
                  key: true,
                },
                {
                  field: "group_name",
                  display: false,
                  filter: false,
                  key: false,
                },
              ]}
              bsObjBy=""
              bsObjWh="group_name='platform' AND is_active='YES'"
              bsValue={selectedPlatform} // ค่าเริ่มต้น = code ของ option
              //bsCacheKey="platform"
              bsLoadOnOpen={true}
              bsOnChange={(val) =>
                setSelectedPlatform(val?.display_member ?? "")
              }
              required={true}
            />
          </FormControl>

          <Box sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="success"
              size="large"
              onClick={handleSave}
              disabled={saving || menuData.length === 0} // ปิดปุ่มจนกว่าจะมีข้อมูล
            >
              {saving ? (
                <Box
                  sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}
                >
                  <CircularProgress size={18} color="inherit" />
                  Saving...
                </Box>
              ) : (
                getResourceByGroupAndName("AssignMenu", "save", localeId)?.resource_value || "Save"
              )}
            </Button>
          </Box>
        </Box>

        {menuData.length > 0 && (
          <Box sx={{ mt: 2, p: 1 }}>
            <Tabs
              value={tabIndex}
              onChange={(e, v) => setTabIndex(v)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="menu parents"
            >
              {menuData.map((parent) => (
                <Tab
                  key={parent.id}
                  label={getResourceByGroupAndName("Menu", parent.label, localeId)?.resource_value || parent.label}
                />
              ))}
            </Tabs>

            <Box sx={{ mt: 2 }}>
              {menuData.map((parent, idx) => (
                <div
                  key={parent.id}
                  role="tabpanel"
                  hidden={tabIndex !== idx}
                  aria-labelledby={`tab-${idx}`}
                >
                  {tabIndex === idx && (
                    <CustomTreeView
                      menuItems={parent.children ?? []}
                      selectionPropagation={selectionPropagation}
                      setMenuItems={(newChildren) =>
                        updateParentChildren(parent.id, newChildren)
                      }
                    />
                  )}
                </div>
              ))}
            </Box>
          </Box>
        )}
      </Paper>
    </>
  );
};

export default MenuTreeView;
