import { Paper, Typography } from "@mui/material";
import BSAutoComplete from "../components/BSAutoComplete";
import { useState } from "react";

const BSAutoCompleteExamples = () => {
    const [select, setSelect] = useState("");
    const [single, setSingle] = useState("");
    const [multi, setMulti] = useState("");
    return <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
            1. การใช้งาน Autocomplete Select
        </Typography>
        <BSAutoComplete
            bsMode="select"
            bsTitle="เลือก Item เดียว"
            bsPreObj="sec.t_com_"
            bsObj="combobox_item"
            bsColumes={[
                { field: "combo_box_id", display: false, filter: false, key: true },
                { field: "value_member", display: true, filter: true, key: true },
                { field: "group_name", display: false, filter: true, key: false }
            ]}
            bsObjBy=""
            bsObjWh=""
            bsValue={select} // ค่าเริ่มต้น = code ของ option
            bsCacheKey="select"
            bsOnChange={(val) => {
                setSelect(val);
            }}
            bsLoadOnOpen={true}
        />
        <Typography variant="h6" gutterBottom>
            2. การใช้งาน Autocomplete signle
        </Typography>
        <BSAutoComplete
            bsMode="single"
            bsTitle="เลือก Item เดียว"
            bsPreObj="sec.t_com_"
            bsObj="combobox_item"
            bsColumes={[
                { field: "combo_box_id", display: false, filter: false, key: true },
                { field: "value_member", display: true, filter: true, key: true },
                { field: "group_name", display: false, filter: true, key: false }
            ]}
            bsObjBy=""
            bsObjWh=""
            bsValue={single} // ค่าเริ่มต้น = code ของ option
            bsCacheKey="signle"
            bsOnChange={(val) => {
                setSingle(val)
            }}
            bsLoadOnOpen={true}
        />
        <Typography variant="h6" gutterBottom>
            3. การใช้งาน Autocomplete multi.
        </Typography>
        <BSAutoComplete
            bsMode="multi"
            bsTitle="เลือก Item"
            bsPreObj="sec.t_com_"
            bsObj="combobox_item"
            bsColumes={[
                { field: "combo_box_id", display: false, filter: false, key: true },
                { field: "value_member", display: true, filter: true, key: true },
                { field: "group_name", display: false, filter: true, key: false }
            ]}
            bsObjBy=""
            bsObjWh=""
            bsValue={multi} // ค่าเริ่มต้น = code ของ option
            bsCacheKey="multi"
            bsOnChange={(val) => {
                setMulti(val);
            }}
            bsLoadOnOpen={true}
        />

    </Paper>;
}
export default BSAutoCompleteExamples;