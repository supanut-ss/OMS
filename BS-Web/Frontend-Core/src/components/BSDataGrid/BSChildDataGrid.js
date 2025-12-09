import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import BSDataGrid from "./BSDataGrid";
import Logger from "../../utils/logger";

/**
 * BSChildDataGrid - A wrapper component for child DataGrids in hierarchical data structures
 *
 * This component wraps BSDataGrid and automatically applies foreign key filtering
 * based on the parent record's primary key values.
 *
 * @param {Object} props - Component props
 * @param {string} props.name - Display name for the child grid tab
 * @param {Array<string>} props.foreignKeys - Array of foreign key column names that link to parent
 * @param {Object} props.parentKeyValues - Object containing parent primary key values { key: value }
 * @param {boolean} props.isParentSaved - Whether the parent record has been saved (has valid PK)
 * @param {string} props.bsLocale - Locale for the grid
 * @param {Object} props.localeText - Locale text object for translations
 * @param {Object} props.gridProps - All other BSDataGrid props passed through
 */
const BSChildDataGrid = forwardRef((props, ref) => {
  const {
    name,
    foreignKeys = [],
    parentKeyValues = {},
    isParentSaved = false,
    bsLocale = "en",
    localeText = {},
    ...gridProps
  } = props;
  const childGridRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    refresh: () => {
      if (childGridRef.current?.refreshData) {
        childGridRef.current.refreshData(true);
      }
    },
    getSelectedRows: () => {
      if (childGridRef.current?.getSelectedRows) {
        return childGridRef.current.getSelectedRows();
      }
      return [];
    },
  }));

  // Build WHERE clause from foreign keys and parent key values
  const buildForeignKeyWhere = () => {
    if (!foreignKeys || foreignKeys.length === 0) {
      Logger.warn("⚠️ BSChildDataGrid: No foreignKeys specified");
      return null;
    }

    if (!parentKeyValues || Object.keys(parentKeyValues).length === 0) {
      Logger.warn("⚠️ BSChildDataGrid: No parentKeyValues provided");
      return null;
    }

    const conditions = [];

    foreignKeys.forEach((fk) => {
      // Find matching parent key value
      // foreignKey might be same name as parent PK or different
      const value = parentKeyValues[fk];

      if (value !== undefined && value !== null) {
        // Handle different value types
        if (typeof value === "string") {
          conditions.push(`${fk}='${value}'`);
        } else if (typeof value === "number") {
          conditions.push(`${fk}=${value}`);
        } else {
          conditions.push(`${fk}='${value}'`);
        }
      }
    });

    if (conditions.length === 0) {
      Logger.warn("⚠️ BSChildDataGrid: No valid FK conditions built", {
        foreignKeys,
        parentKeyValues,
      });
      return null;
    }

    const whereClause = conditions.join(" AND ");
    Logger.log("🔗 BSChildDataGrid FK WHERE clause:", whereClause);
    return whereClause;
  };

  // Check if we have valid parent key values
  useEffect(() => {
    const hasValidParentKeys = foreignKeys.every((fk) => {
      const value = parentKeyValues[fk];
      return value !== undefined && value !== null && value !== "";
    });

    setIsReady(isParentSaved && hasValidParentKeys);

    Logger.log("🔍 BSChildDataGrid readiness check:", {
      name,
      foreignKeys,
      parentKeyValues,
      isParentSaved,
      hasValidParentKeys,
      isReady: isParentSaved && hasValidParentKeys,
    });
  }, [foreignKeys, parentKeyValues, isParentSaved, name]);

  // If parent is not saved yet, show placeholder
  if (!isParentSaved) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          p: 4,
          backgroundColor: "grey.50",
          borderRadius: 1,
        }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {localeText.bsChildGridSaveParentFirst ||
            "Please save the parent record first"}
        </Typography>
        <Typography variant="body2" color="text.disabled">
          {localeText.bsChildGridWillShowAfterSave ||
            "Child records will be available after saving"}
        </Typography>
      </Box>
    );
  }

  // If parent is saved but we don't have valid FK values yet
  if (!isReady) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          p: 4,
        }}
      >
        <CircularProgress size={24} sx={{ mr: 2 }} />
        <Typography variant="body2" color="text.secondary">
          {localeText.bsLoadingChildData || "Loading child data..."}
        </Typography>
      </Box>
    );
  }

  // Build the WHERE clause for FK filtering
  const fkWhereClause = buildForeignKeyWhere();

  // Combine with any existing bsObjWh
  let combinedWhere = fkWhereClause;
  if (gridProps.bsObjWh && fkWhereClause) {
    combinedWhere = `(${gridProps.bsObjWh}) AND (${fkWhereClause})`;
  } else if (gridProps.bsObjWh) {
    combinedWhere = gridProps.bsObjWh;
  }

  // Prepare default values for new records with FK values
  const getDefaultFormValues = () => {
    const defaults = {};
    foreignKeys.forEach((fk) => {
      if (parentKeyValues[fk] !== undefined) {
        defaults[fk] = parentKeyValues[fk];
      }
    });
    return defaults;
  };

  Logger.log("🎯 BSChildDataGrid rendering:", {
    name,
    bsObj: gridProps.bsObj,
    combinedWhere,
    parentKeyValues,
    foreignKeys,
    hiddenColumns: foreignKeys, // FK columns will be hidden from grid and form
    bsUniqueFields: gridProps.bsUniqueFields, // Debug: Check if bsUniqueFields is passed
  });

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <BSDataGrid
        ref={childGridRef}
        bsLocale={bsLocale}
        {...gridProps}
        bsObjWh={combinedWhere}
        // Pass FK values as hidden default values for new records
        bsDefaultFormValues={getDefaultFormValues()}
        // Hide FK columns from both grid and form (they are auto-populated)
        bsHiddenColumns={foreignKeys}
        // Ensure child grid has appropriate height
        height={gridProps.height}
      />
    </Box>
  );
});

BSChildDataGrid.displayName = "BSChildDataGrid";

export default BSChildDataGrid;
