import React, { useMemo, useCallback } from "react";
import { RichTreeView } from "@mui/x-tree-view";

const collectCheckedIds = (items) => {
  if (!Array.isArray(items)) return [];
  return items.reduce((acc, item) => {
    if (!item) return acc;
    if (item.isCheck) acc.push(item.id);
    if (Array.isArray(item.children) && item.children.length) {
      acc.push(...collectCheckedIds(item.children));
    }
    return acc;
  }, []);
};

const updateCheckedFromIds = (items, ids) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const isChecked = Array.isArray(ids) && ids.includes(item.id);
    return {
      ...item,
      isCheck: isChecked,
      children: item.children
        ? updateCheckedFromIds(item.children, ids)
        : undefined,
    };
  });
};

const CustomTreeView = ({
  menuItems = [],
  selectionPropagation = { parents: true, descendants: true },
  setMenuItems,
}) => {
  const itemsArray = Array.isArray(menuItems) ? menuItems : [];

  const selected = useMemo(() => collectCheckedIds(itemsArray), [itemsArray]);

  const handleSelectedItemsChange = useCallback(
    (event, ids) => {
      if (typeof setMenuItems === "function") {
        // คำนวณ children ที่อัปเดตจาก current itemsArray แล้วส่งกลับเป็นค่าใหม่
        const updatedChildren = updateCheckedFromIds(itemsArray, ids);
        setMenuItems(updatedChildren);
      }
    },
    [setMenuItems, itemsArray]
  );

  return (
    <RichTreeView
      items={itemsArray}
      checkboxSelection
      multiSelect
      selectionPropagation={selectionPropagation}
      defaultExpandedItems={itemsArray.length ? [itemsArray[0].id] : []}
      selectedItems={selected}
      onSelectedItemsChange={handleSelectedItemsChange}
    />
  );
};

export default CustomTreeView;
