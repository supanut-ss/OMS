import { Box, Paper } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useRef, useState } from "react";
import BSFilterCustom from "../../components/BSFilterCustom";

const TransactionLog = (props) => {
    const [locale_id] = useState(props.lang || "en");
    const gridRef = useRef();
    const [filterValues, setFilterValues] = useState([]);
    const filterFields = [
        {
            field: "transaction_date",
            component: "BSDatepicker",
            bsTitle: "Time Stamp",
            type: "date",
            isDateOnly: true,
            defaultOperator: "isBetween",
            xs: 12,
            sm: 6,
            md: 4,
            lg: 3,
        }
    ];

    return <Box>
        <Paper sx={{ padding: 2 }}>
            <Box sx={{ mb: 0 }}>
                <BSFilterCustom
                    bsFilterField={filterFields}
                    bsFilterValue={filterValues}
                    bsFilterValueOnChanage={(values) => {
                        console.log("🔍 Custom Filter Values:", values);
                        setFilterValues(values);
                    }}
                    bsSearch={true}
                    bsClear={true}
                    spacing={2}
                />
            </Box>
            <BSDataGrid
                ref={gridRef}
                bsLocale={locale_id}
                bsPreObj="rfi"
                bsObj="v_rfi_transaction_log"
                bsCols="transaction_date,event,transaction_code,transaction_type,location,route,tag_id,item_code,license_plate,driver_name,status,mode,create_by"
                bsObjBy="transaction_date desc"
                bsShowDescColumn={false}
                showAdd={false}
                bsVisibleEdit={false}
                bsVisibleDelete={false}
                bsAllowDelete={false}
                bsVisibleView={false}
                // Filtering Configuration
                bsFilterMode="client" // ใช้ client-side filtering
                bsCustomFilters={filterValues} // ส่งค่า filter จาก BSFilterCustom
            />

        </Paper>
    </Box>;

}
export default TransactionLog;