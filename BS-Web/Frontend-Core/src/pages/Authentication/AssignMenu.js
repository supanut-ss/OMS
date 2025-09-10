import React, { useState, useEffect } from "react";
import BSFullScreenLoader from "../../contexts/BSFullScreenLoader";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import { useMenuContext } from "../../contexts/MenuContext";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Button,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
} from "@mui/material";
import CustomTreeView from "../../components/CustomTreeView";

const MenuTreeView = () => {
  const {
    getMenuAssign,
    saveMenuAssign,
    getComboboxPlatform,
    getGroupCombobox,
  } = useMenuContext();
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

  const userGroups = [
    { user_group_id: 20, user_group_name: "Admin" },
    { user_group_id: 21, user_group_name: "User" },
  ];

  const platforms = [
    { app_id: "WEB", app_name: "WEB" },
    { app_id: "PDA", app_name: "PDA" },
  ];

  //   const [userGroups, setUserGroups] = useState([]);
  //   const [platforms, setPlatforms] = useState([]);

  //   // โหลด combobox data ตอน mount
  //   useEffect(() => {
  //     const fetchComboboxData = async () => {
  //       try {
  //         const groupRes = await getGroupCombobox();
  //         setUserGroups(groupRes?.data || []);
  //         const platformRes = await getComboboxPlatform();
  //         setPlatforms(platformRes?.data || []);
  //       } catch (err) {
  //         BSAlertSwal2.show("error", "โหลดข้อมูล combobox ไม่สำเร็จ");
  //       }
  //     };
  //     fetchComboboxData();
  //   }, []);

  const toBool = (v) =>
    v === true || v === 1 || String(v).toUpperCase() === "YES";

  const buildMenuTree = (rows = []) => {
    if (!Array.isArray(rows)) return [];
    const nodes = {};
    const groups = {};

    rows.forEach((r) => {
      const id = String(r.menuId);
      const parentId = r.parentMenuId ? String(r.parentMenuId) : null;
      const groupName = r.menuGroup || "Ungrouped";

      const perms = [
        { id: `add-${id}`, label: "Add", isCheck: toBool(r.isAddView) },
        { id: `edit-${id}`, label: "Edit", isCheck: toBool(r.isEditView) },
        {
          id: `delete-${id}`,
          label: "Delete",
          isCheck: toBool(r.isDeleteView),
        },
        { id: `view-${id}`, label: "View", isCheck: toBool(r.isView) },
      ];

      nodes[id] = {
        id,
        label: r.menuName ?? `menu-${id}`,
        isCheck: toBool(r.isView),
        parentId,
        groupName,
        groupSequence: Number(r.menuGroupSequence ?? 0),
        sequence: Number(r.menuSequence ?? 0),
        menuChildren: [],
        permChildren: perms,
      };

      if (!groups[groupName]) {
        groups[groupName] = {
          id: groupName,
          label: groupName,
          roots: [],
          groupSequence: Number(r.menuGroupSequence ?? 0),
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
          const result = await getMenuAssign(selectedGroup, selectedPlatform);
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
  }, [selectedGroup, selectedPlatform]);

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
    items.forEach((item) => {
      // เฉพาะ permission leaf เท่านั้น (id รูปแบบ add-xxx, edit-xxx, ...)
      if (/^(add|edit|delete|view)-/.test(item.id)) {
        // แยก menuId จาก id
        const [type, menuId] = item.id.split("-");
        // หา record ใน result ที่ตรง menuId อยู่แล้วหรือยัง
        let rec = result.find((r) => r.menu_id === menuId);
        if (!rec) {
          rec = {
            userGroupId,
            menu_id: menuId,
            platform,
            isAddView: "NO",
            isEditView: "NO",
            isDeleteView: "NO",
            isView: "NO",
          };
          result.push(rec);
        }
        // เซ็ต flag ตาม type
        if (type === "add") rec.isAddView = item.isCheck ? "YES" : "NO";
        if (type === "edit") rec.isEditView = item.isCheck ? "YES" : "NO";
        if (type === "delete") rec.isDeleteView = item.isCheck ? "YES" : "NO";
        if (type === "view") rec.isView = item.isCheck ? "YES" : "NO";
      }
      // recursive children
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
      console.log("saveMenuAssign result", result);
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
      <Paper sx={{ p: 3 }}>
        <Box display="flex" gap={3} alignItems="center">
          <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
            <InputLabel id="user-group-label">User Group</InputLabel>
            <Select
              labelId="user-group-label"
              label="User Group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {userGroups.map((ug) => (
                <MenuItem key={ug.user_group_id} value={ug.user_group_id}>
                  {ug.user_group_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }} variant="outlined">
            <InputLabel id="platform-label">Platform</InputLabel>
            <Select
              labelId="platform-label"
              label="Platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              {platforms.map((pf) => (
                <MenuItem key={pf.app_id} value={pf.app_id}>
                  {pf.app_name}
                </MenuItem>
              ))}
            </Select>
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
                "Save"
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
                <Tab key={parent.id} label={parent.label} />
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
