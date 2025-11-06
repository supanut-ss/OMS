import React, { useState } from "react";
import BSFilterCustom from "../components/BSFilterCustom";

export default function BSFilterCustomExamples() {
  const [value, setValue] = useState([]);

  const filterFields = [
    {
      field: "item_name",
      component: "BSTextField",
      bsTitle: "ชื่อสินค้า",
      type: "string",
      grid: { md: 4, lg: 3 }
    },
    {
      field: "item_start",
      component: "BSDatepicker",
      bsTitle: "วันที่เริ่มต้น",
      type: "date",
      grid: { md: 4, lg: 4 },
    },
    {
      field: "item_end",
      component: "BSDatepicker",
      bsTitle: "วันที่สิ้นสุด",
      type: "date",
      grid: { md: 4, lg: 4 }
    },
    {
      field: "item_price",
      component: "BSTextField",
      bsTitle: "ราคา",
      type: "float",
      decimals: 2,
      grid: { md: 4, lg: 4 }
    },
    {
      field: "combobox",
      component: "BSAutoComplete",
      bsMode: "single",
      bsTitle: "เลือก Item เดียว",
      bsPreObj: "sec.t_com_",
      bsObj: "combobox_item",
      bsColumes:
        [
          { field: "combo_box_id", display: false, filter: false, key: true },
          { field: "value_member", display: true, filter: true, key: true },
          { field: "group_name", display: false, filter: true, key: false }
        ],
      bsObjBy: "",
      bsObjWh: "",
      bsLoadOnOpen: true,
      grid: { md: 4, lg: 4 }
    }
  ];

  const handleSearch = () => {
    console.log("🔍 ค้นหา:", value);
  };

  const handleClear = () => {
  };

  return (
    <div style={{ padding: 20 }}>
      <BSFilterCustom
        bsFilterField={filterFields}
        bsFilterValue={value}
        bsFilterValueOnChanage={setValue}
        bsOnSearch={handleSearch}
        bsOnClear={handleClear}
      />
    </div>
  );
}
