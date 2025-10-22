import { Box, Button, Grid, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import BSAutoComplete from "../../components/BSAutoComplete";
import { useState } from "react";
import AxiosMaster from "../../utils/AxiosMaster";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
const CountTag = () => {
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const CallNoti = async () => {
        if (!selectedUser) {
            BSAlertSwal2.show(
                "error",
                "Please select a user to re-count tags."
            );
            return;
        }
        if (selectedRows.length === 0) {
            BSAlertSwal2.show(
                "error",
                "Please select at least one tag to re-count.")
            return;
        }
        console.log("Selected User:", selectedUser);
        console.log("Selected Rows:", selectedRows);
        for (let row of selectedRows) {
            await AxiosMaster.post("/ams/notify/recount-tags", {
                user_id: selectedUser,
                tag_no: row.tag_no
            }).then((response) => {
                BSAlertSwal2.show(
                    "success",
                    `Re-count notification for tag ${row.tag_no} sent to user successfully.`
                );
            }).catch((error) => {
                BSAlertSwal2.show(
                    "error",
                    `Failed to send re-count notification for tag ${row.tag_no}.`
                );
            });
        }
    }

    return <Box>
        <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Count Tag
            </Typography>
            <hr />
            <Box mt={3}>
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Re-Count
                    </Typography>
                    <Grid container spacing={2}>
                        <Grid size={3}>
                            <BSAutoComplete
                                bsMode="single"
                                bsTitle="Select User"
                                bsPreObj="sec.t_com_"
                                bsObj="user"
                                bsColumes={[
                                    {
                                        field: "user_id",
                                        display: true,
                                        filter: false,
                                        key: true,
                                    },
                                    { field: "first_name", display: true, filter: false, key: false },
                                    { field: "last_name", display: true, filter: false, key: false }
                                ]}
                                bsObjBy="user_id asc"
                                bsObjWh="isnull(fcm_token,'')<>''"
                                bsValue={selectedUser} // ค่าเริ่มต้น = code ของ option
                                cacheKey="drive_user_autocomplete"
                                bsLoadOnOpen={true}
                                bsOnChange={(val) => setSelectedUser(val)}
                            /></Grid>
                        <Grid size={3}>
                            <Button variant="contained" color="warning" sx={{ mb: 2, height: '90%' }} onClick={CallNoti} >
                                Re-Count Tags
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
                <BSDataGrid
                    bsLocale="th"
                    bsPreObj="ams"
                    bsObj="tbt_count_tag"
                    bsCols="
      tag_no
      ,area_name
      ,location
      ,part_no
      ,part_name
      ,supplier_name
      ,plan_qty
      ,count_qty
      ,sub_no
      ,method
      ,remark1
      ,remark2
      ,status
      ,create_by
      ,create_date
      ,update_by
      ,update_date"
                    bsObjBy="create_date asc"
                    bsPinColsLeft=""
                    bsPinColsRight=""
                    bsRowPerPage={20}
                    bsBulkEdit={false}
                    bsBulkAdd={false}
                    bsBulkDelete={false}
                    bsShowDescColumn={false}
                    showAdd={false}
                    readOnly={true}
                    onCheckBoxSelected={(rows) => {
                        console.log("Selected rows:", rows);
                        setSelectedRows(rows);
                    }}
                    height={500}
                />
            </Box>
        </Paper >
    </Box >;
}
export default CountTag;