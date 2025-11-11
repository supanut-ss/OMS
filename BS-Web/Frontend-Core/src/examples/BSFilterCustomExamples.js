import React, { useState } from "react";
import BSFilterCustom from "../components/BSFilterCustom";

export default function BSFilterCustomExamples() {
  const [valueFilter, setValueFilter] = useState([]);

  const filterFields = [
    {
      field: "item_name",
      component: "BSTextField",
      bsTitle: "ชื่อสินค้า",
      type: "string",
      defaultOperator: "LIKE"

    },
    {
      field: "item_start",
      component: "BSDatepicker",
      bsTitle: "วันที่เริ่มต้น",
      type: "date",
      defaultOperator: ">="
    },
    {
      field: "item_end",
      component: "BSDatepicker",
      bsTitle: "วันที่สิ้นสุด",
      type: "date",
      defaultOperator: "<="
    },
    {
      field: "item_price",
      component: "BSTextField",
      bsTitle: "ราคา",
      type: "float",
      defaultOperator: "="
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
      defaultOperator: "=",
      type: "dropdown",
    }
  ];

  return (
    <div style={{ padding: 20 }}>
      <BSFilterCustom
        bsFilterField={filterFields}
        bsFilterValue={valueFilter}
        bsFilterValueOnChanage={(e) => {
          setValueFilter(e)
          console.log(e)
        }
        }
        bsSearch={true}
        bsClear={true}
      />
    </div>
  );
}
