import { Paper, Typography } from "@mui/material";
import BsAutoComplete from "../components/BsAutoComplete";
import { useState } from "react";

const BSAutoCompleteExamples = () => {
    const [select, setSelect] = useState("");
    const [single, setSingle] = useState("");
    const [multi, setMulti] = useState("");
    return <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
            1. การใช้งาน Autocomplete Select
        </Typography>
        <BsAutoComplete
            bsModel="select"
            bsTitle="เลือก Platform"
            bsPreObj="combo_box_id"
            bsObj="sec.t_com_combobox_item"
            bsColumes={[
                { field: "combo_box_id", display: false },
                { field: "value_member", display: true, order_by: "ASC" },
                { field: "group_name", display: false }
            ]}
            bsFilters={[{ field: "group_name", op: "=", value: "platform" }]}
            bsValue={select} // ค่าเริ่มต้น = code ของ option
            cacheKey="select"
            loadOnOpen={true}
            bsOnChange={(val) => setSelect(val)}
        />
        <Typography variant="h6" gutterBottom>
            2. การใช้งาน Autocomplete signle
        </Typography>
        <BsAutoComplete
            bsModel="single"
            bsTitle="เลือก Item เดียว"
            bsPreObj="combo_box_id"
            bsObj="sec.t_com_combobox_item"
            bsColumes={[
                { field: "combo_box_id", display: false },
                { field: "value_member", display: true, order_by: "ASC" },
                { field: "group_name", display: false }
            ]}
            bsFilters={[{ field: "group_name", op: "=", value: "platform" }]}
            bsValue={single} // ค่าเริ่มต้น = code ของ option
            cacheKey="signle"
            bsOnChange={(val) => setSingle(val)}
        />
        <Typography variant="h6" gutterBottom>
            3. การใช้งาน Autocomplete multi.
        </Typography>
        <BsAutoComplete
            bsModel="multi"
            bsTitle="เลือกหลายค่า"
            bsPreObj="combo_box_id"
            bsObj="sec.t_com_combobox_item"
            bsColumes={[
                { field: "combo_box_id", display: false },
                { field: "value_member", display: true, order_by: "ASC" },
                { field: "group_name", display: false }
            ]}
            bsFilters={[{ field: "group_name", op: "=", value: "platform" }]}
            bsValue={multi} // ค่าเริ่มต้น = array ของ code
            cacheKey="multi"
            bsOnChange={(val) => setMulti(val)}
        />

    </Paper>;
}
export default BSAutoCompleteExamples;