export const AI_MENU_PERMISSION = {
  is_view: true,
  is_add: true,
  is_edit: true,
  is_delete: true,
};

export const AI_MENU_ITEMS = [
  { text: "AI Overview", path: "/ai/overview" },
  { text: "Provider Config", path: "/ai/provider-config" },
  { text: "Admin Chat", path: "/ai/admin-chat" },
  { text: "Prompt & Page Config", path: "/ai/page-config" },
  { text: "Knowledge Documents", path: "/ai/knowledge-documents" },
  { text: "Schema Knowledge", path: "/ai/schema-knowledge" },
  { text: "Usage & Retrieval Logs", path: "/ai/logs" },
].map((item, index) => ({
  ...AI_MENU_PERMISSION,
  ...item,
  menu_id: 9000 + index,
  menu_name: item.text,
  menu_path: item.path,
  menu_sequence: index + 1,
  parent_menu_id: 9000,
  favorite: false,
}));

export const AI_MENU_GROUP = {
  menu_group_name: "AI",
  menu_group_path: "/ai",
  menu_group_sequence: 90,
  text: "AI",
  path: "/ai",
  submenu: AI_MENU_ITEMS,
  ...AI_MENU_PERMISSION,
};

export const mergeAiMenuGroup = (menu = []) => {
  const list = Array.isArray(menu) ? menu : Object.values(menu || {});
  const hasAi = list.some((group) => group?.menu_group_path === "/ai" || group?.path === "/ai");
  return hasAi ? list : [...list, AI_MENU_GROUP];
};
