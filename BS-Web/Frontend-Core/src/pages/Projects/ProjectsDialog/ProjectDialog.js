import { Box, Dialog, DialogActions, DialogContent, DialogTitle, Grid } from "@mui/material"
import BSCloseOutlinedButton from "../../../components/Button/BSCloseOutlinedButton";
import BSSaveOutlinedButton from "../../../components/Button/BSSaveOutlinedButton";
import { useCallback, useEffect, useState } from "react";
import AxiosMaster from "../../../utils/AxiosMaster";
import BSTextField from "../../../components/BSTextField";

const ProjectsDialog = (props) => {
    const [projectHeader, setProjectHeader] = useState(null);
    const handleClose = () => {
        setProjectHeader(null);
        props.onClose(false);
    };
    const fetchProjectHeader = useCallback(async () => {
        if (props.projectID) {
            console.log("Fetching project header for project ID:", props.projectID);
            await AxiosMaster.get(`/projects/${props.projectID}`)
                .then((response) => {
                    setProjectHeader(response.data);
                })
                .catch((error) => {
                    console.error("Error fetching project header:", error);
                });
            // Simulate fetching data
            // setProjectHeader({ projectID: props.projectID, projectName: "Sample Project" });
        } else {
            console.log("Preparing to add a new project");
            setProjectHeader(null);
        }
    }, [props.projectID]);
    useEffect(() => {
        fetchProjectHeader();
    }, [fetchProjectHeader]);
    return (<Dialog fullScreen
        open={props.open}
        onClose={handleClose}>
        <DialogTitle>{props.projectID ? "Edit" : "Add"} {props.title}</DialogTitle>
        <DialogContent>
            <Box sx={{ pl: 3, pr: 3 }}>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <BSTextField
                            label="project_no"
                            value={projectHeader?.project_no || ""}
                            disblsed={true}
                            variant="filled"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                    </Grid>
                </Grid>
            </Box>
            {props.children}
        </DialogContent>
        <DialogActions>
            <BSCloseOutlinedButton autoFocus onClick={handleClose} variant="outlined" className="btn-close-outlined">
                Close
            </BSCloseOutlinedButton>
            <BSSaveOutlinedButton onClick={handleClose} autoFocus variant="outlined">
                Save
            </BSSaveOutlinedButton>
        </DialogActions>
    </Dialog>
    );
};

export default ProjectsDialog;