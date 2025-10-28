import React from "react";
import {
    Typography,
    Paper,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const SubPage = () => {


    return (
        <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Master Sub
            </Typography>

            {/* ตารางข้อมูล */}
            {/* <BSDataGrid
                bsLocale="en"
                bsPreObj="ams"
                bsObj="tbm_sub"
                bsCols="sub_no,part_no,part_name,supplier_name,create_by,create_date,update_by,update_date"
                showAdd={false}
            /> */}

            <BSDataGrid
                // Enhanced Stored Procedure Configuration
                bsStoredProcedure="usp_tbm_sub"
                bsStoredProcedureSchema="ams"
                bsShowRowNumber={true}
                showAdd={false}
                bsLocale="en"
                bsAllowAdd={true}
                bsAllowEdit={true}
                bsAllowDelete={true}
                bsPageSize={25}
            />
        </Paper>
    );
};

export default SubPage;
