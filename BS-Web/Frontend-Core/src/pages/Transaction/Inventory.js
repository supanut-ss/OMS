import { Box, Paper } from "@mui/material"
import BSDataGrid from "../../components/BSDataGrid";
import { useRef, useState } from "react";

const Inventory = (props) => {
    const [locale_id] = useState(props.lang || "en");
    const gridRef = useRef();
    return <Box>
        <Paper sx={{ padding: 2 }}>
            <BSDataGrid
                ref={gridRef}
                bsLocale={locale_id}
                bsPreObj="rfi"
                bsObj="v_rfi_inventory"
                bsCols="tag_id
                ,item_code
                ,category
                ,status_tag
                ,license_plate
                ,driver_name
                ,last_transaction_code
                ,type
                ,last_mode
                ,create_by
                ,last_transaction"
                bsObjBy="last_transaction desc"
                bsShowDescColumn={false}
                showAdd={false}
                bsVisibleEdit={false}
                bsVisibleDelete={false}
                bsAllowDelete={false}
                bsVisibleView={false}
            />

        </Paper>
    </Box>;
}
export default Inventory;