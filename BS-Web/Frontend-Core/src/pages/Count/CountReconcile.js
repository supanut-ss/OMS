import { Box, Button, Paper, Typography } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import AxiosMaster from "../../utils/AxiosMaster";
const ExportToExcel = async () => {
    // Implement your export to Excel logic here
    console.log("Export to Excel clicked");
    // logic call download excel from backend
    await AxiosMaster.get("/ams/count-reconcile/export-excel", {
        responseType: 'blob', // Important
    }).then((response) => {
        // Create a URL for the blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'count_reconcile.xlsx');
        document.body.appendChild(link);
        link.click();
    }).catch((error) => {
        console.error("Error exporting to Excel:", error);
    });
}
const CountReconcile = () => {
    return <Box>
        <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
                Count Reconcile
            </Typography>
            <hr />
            <Box mt={3}>
                <Box>
                    <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={ExportToExcel}>
                        Export to Excel
                    </Button>
                </Box>
                <BSDataGrid
                    bsLocale="th"
                    bsPreObj="ams"
                    bsObj="v_ams_count_reconcile"
                    bsCols="area_code
	,area_name
	, part_no
	, part_name
	, status
	, count_tag_plan
	, count_tag_actual
	, total_qty_plan
	, total_qty_actual
	, diff"
                    bsObjBy="status asc"
                    bsPinColsLeft=""
                    bsPinColsRight=""
                    //  bsRowPerPage={20}
                    showAdd={false}
                    readOnly={true}
                    bsBulkDelete={false}
                    bsBulkEdit={false}
                    bsBulkAdd={false}
                    bsShowDescColumn={false}

                    //   onCheckBoxSelected={(rows) => {
                    //     console.log("Selected rows:", rows);
                    //    // setSelectedRows(rows);
                    //   }}
                    // onEdit={(row) => console.log("Edit:", row)}
                    //    onDelete={(id) => console.log("Delete:", id)}
                    //  onAdd={() => console.log("Add new record")}
                    height={500}
                />
            </Box>
        </Paper>

    </Box >;
}
export default CountReconcile;