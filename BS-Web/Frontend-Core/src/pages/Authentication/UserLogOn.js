import { useState, useEffect } from "react";
import { Paper, Button } from "@mui/material";
import BSDataGrid from "../../components/BSDataGrid";
import { useResource } from "../../hooks/useResource";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import BSAlertSwal2 from "../../components/BSAlertSwal2";
import AxiosMaster from "../../utils/AxiosMaster";
import { useRef } from "react";

const UserLogOnPage = (props) => {
  const { getResource, getResources } = useResource();
  const [resourceData, setResourceData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const gridRef = useRef();

  const getLang = async () => {
    setResourceData(await getResources("UserLogOn"));
  };

  useEffect(() => {
    getLang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang]);

  const handleClearLogons = async () => {
    if (selectedRows.length === 0) {
      BSAlertSwal2.show(
        "error",
        getResource(resourceData, "please_select_user") ||
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

  return (
    <>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Button
          variant="contained"
          color="info"
          sx={{ height: "6vh", width: "20%" }}
          onClick={async () => {
            await handleClearLogons();
          }}
          startIcon={<PersonRemoveIcon />}
        >
          {getResource(resourceData, "Clear Logged On Users") ||
            "Clear Logged On Users"}
        </Button>

        <BSDataGrid
          ref={gridRef}
          bsLocale={props.lang}
          bsPreObj="sec"
          bsObj="v_com_user_alive"
          bsCols="user_id,status,first_name,last_name,ip_address,refresh_token_expiry,device_info"
          bsObjBy="status DESC, user_id ASC"
          bsBulkEdit={false}
          bsBulkAdd={false}
          bsBulkDelete={false}
          bsShowDescColumn={false}
          showAdd={false}
          readOnly={true}
          onCheckBoxSelected={(rows) => {
            setSelectedRows(rows);
          }}
        />
      </Paper>
    </>
  );
};

export default UserLogOnPage;
