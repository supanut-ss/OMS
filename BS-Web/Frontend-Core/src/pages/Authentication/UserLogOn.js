import { useState, useEffect } from "react";
import { Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Box } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import AxiosMaster from "../../utils/AxiosMaster";
import { useRef } from "react";
import { useOutletContext } from "react-router-dom";

const UserLogOnPage = (props) => {
  const { permission } = useOutletContext();
  const { getResourceByGroupAndName } = useResource();
  const [selectedRows, setSelectedRows] = useState([]);
  const [locale_id, setLocale_id] = useState(props.lang || "en");
  const gridRef = useRef();

  // State for map dialog
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPoint, setMapPoint] = useState(null);

  useEffect(() => {
    setLocale_id(props.lang || "en");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const handleClearLogons = async () => {
    if (selectedRows.length === 0) {
      BSAlertSwal2.show(
        "error",
        getResourceByGroupAndName("v_com_user_alive", "please_select_user", locale_id)?.resource_value ||
        "Please select at least one logged on user to clear."
      );
      return;
    }

    for (let row of selectedRows.filter(
      (r) => r.status.toUpperCase() === "ONLINE"
    )) {
      await AxiosMaster.post("/users/clear_logon", {
        userId: row.user_id,
      })
        .then((response) => {
          gridRef.current?.refreshData();
          BSAlertSwal2.show("success", `Logon cleared for user successfully.`);
        })
        .catch((error) => {
          BSAlertSwal2.show("error", error.message || "An error occurred.");
        });
    }
  };
  const handleViewLogonDetails = (row) => {
    // Expecting row.latitude, row.longitude, row.accuracy
    const lat = row?.latitude !== undefined && row.latitude !== null ? parseFloat(row.latitude) : NaN;
    const lon = row?.longitude !== undefined && row.longitude !== null ? parseFloat(row.longitude) : NaN;
    const acc = row?.accuracy !== undefined && row.accuracy !== null ? row.accuracy : null;

    if (!isFinite(lat) || !isFinite(lon)) {
      BSAlertSwal2.show("info", getResourceByGroupAndName("v_com_user_alive", "no_gps_available", locale_id)?.resource_value || "No GPS coordinates available for this user.");
      return;
    }

    setMapPoint({ lat, lon, acc, last_alive_time: row.last_alive_time || null });
    setMapOpen(true);
  };
 

  return (
    <Paper sx={{ p: 2, width: "100%", height: "100%" }}>
      <Button
        variant="contained"
        color="info"
        sx={{ height: "6vh", width: "20%" }}
        onClick={async () => {
          await handleClearLogons();
        }}
        startIcon={<PersonRemoveIcon />}
      >
        {getResourceByGroupAndName("v_com_user_alive", "ClearLoggedOnUsers", locale_id)?.resource_value || "Clear Logged On Users"}
      </Button>
      <Box height={"85vh"}>
        <BSDataGrid
          ref={gridRef}
          bsLocale={locale_id}
          bsPreObj="sec"
          bsObj="v_com_user_alive"
          bsCols="user_id,status,first_name,last_name,ip_address,refresh_token_expiry,device_info,latitude,longitude,accuracy,last_alive_time"
          bsObjBy="status DESC, user_id ASC"
          // bsBulkEdit={false}
          // bsBulkAdd={false}
          // bsBulkDelete={false}
          bsShowDescColumn={false}
          showAdd={false}
          readOnly={false}
          bsVisibleEdit={false}
          bsVisibleDelete={false}
          bsAllowDelete={false}
          bsVisibleView={true}
          onView={(row) => {
            handleViewLogonDetails(row);
          }}
          onCheckBoxSelected={(rows) => {
            setSelectedRows(rows);
          }}
          bsRowConfig={(row) => {
            if (row.status.toUpperCase() === "OFFLINE") {
              return {
                showCheckbox: false,
              };
            }
            return {};
          }}
        />
      </Box>
      <Dialog
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>GPS Location</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" gutterBottom>
            {mapPoint ? `Latitude: ${mapPoint.lat.toFixed(6)}, Longitude: ${mapPoint.lon.toFixed(6)}` : ""}
          </Typography>
          <Typography variant="body2" gutterBottom>
            {mapPoint && mapPoint.acc !== null ? `Accuracy: ${mapPoint.acc}` : ""} {mapPoint && mapPoint.last_alive_time !== null ? `| Last Alive Time: ${mapPoint.last_alive_time}` : ""}
          </Typography>
          <Box style={{ height: 420, width: "100%" }}>
            {mapPoint ? (
              <iframe
                title="user-gps-map"
                width="100%"
                height="100%"
                frameBorder="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${(mapPoint.lon -
                  0.01)},${(mapPoint.lat - 0.01)},${(mapPoint.lon + 0.01)},${(mapPoint.lat + 0.01)}&layer=mapnik&marker=${mapPoint.lat},${mapPoint.lon}`}
                style={{ border: 0 }}
              />
            ) : (
              <Typography variant="body2">No GPS data</Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMapOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default UserLogOnPage;
