import React from "react";
import { Breadcrumbs, Link, Typography } from "@mui/material";
import { useLocation, Link as RouterLink } from "react-router-dom";

function CustomBreadcrumbs() {
  const location = useLocation();

  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
      <Link component={RouterLink} underline="hover" color="inherit" to="/">
        Dashboard
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join("/")}`;
        const isLast = index === pathnames.length - 1;

        return isLast ? (
          <Typography color="text.primary" key={to}>
            {decodeURIComponent(value).split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </Typography>
        ) : (
          <Link
            component={RouterLink}
            underline="hover"
            color="inherit"
            to={to}
            key={to}
          >
            {decodeURIComponent(value)}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

export default CustomBreadcrumbs;
