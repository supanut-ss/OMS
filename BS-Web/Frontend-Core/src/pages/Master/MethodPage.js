import React from "react";
import {
    Typography,
    Paper,
} from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";

const MethodPage = () => {





    return (
        <>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Master Method
                </Typography>
                {/* ตารางข้อมูล */}
                {/* <BSDataGrid
                    bsLocale="en"
                    bsPreObj="ams"
                    bsObj="tbm_method"
                    bsCols="method,create_by,create_date,update_by,update_date"
                    bsAllowAdd={true}
                    bsAllowEdit={true}
                    bsAllowDelete={true}
                /> */}

                <BSDataGrid
                    // Enhanced Stored Procedure Configuration
                    bsStoredProcedure="usp_tbm_method"
                    bsStoredProcedureSchema="ams"
                    bsShowRowNumber={true}
                    bsCols="method,create_by,create_date,update_by,update_date"
                    // showAdd={false}
                    bsLocale="en"
                    bsAllowAdd={true}
                    bsAllowEdit={true}
                    bsAllowDelete={true}
                    bsPageSize={25}
                />
            </Paper>
        </>
    );
};

export default MethodPage;
