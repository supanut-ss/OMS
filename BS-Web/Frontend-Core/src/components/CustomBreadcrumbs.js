import React, { useEffect, useState } from "react";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { useResource } from "../hooks/useResource";

function CustomBreadcrumbs(props) {
  const [resourceData, setResourceData] = useState();
  const location = useLocation();
  const { getResource, getResources } = useResource();
  const pathnames = location.pathname.split("/").filter((x) => x);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const getLang = async () => {
    setResourceData(await getResources("Menu"));
  }
  useEffect(() => {
    getLang()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.lang])

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2, display: "contents" }}>
      {/* <Link component={RouterLink} underline="hover" color="inherit" to="/">
        {getResource(resourceData, "Dashboard")}
      </Link> */}

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;

        return isLast ? (
          <Typography color="text.primary" key={to}>
            {getResource(resourceData, decodeURIComponent(value).split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
          </Typography>
        ) : (
          <Link
            component={RouterLink}
            underline="hover"
            color="inherit"
            to={to}
            key={to}
          >
            {getResource(resourceData, decodeURIComponent(value).split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '))}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

export default CustomBreadcrumbs;
