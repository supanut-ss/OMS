import React from "react";
import { Container, Typography, Box, Paper } from "@mui/material";
import { BSDataGridClient } from "../../components/BSDataGrid";

const BSDataGridClientExample = () => {
  // Sample data
  const sampleData = [
    {
      id: 1,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "081-234-5678",
      age: 30,
      salary: 50000,
      isActive: true,
      department: "Engineering",
      joinDate: "2023-01-15",
      lastLogin: "2024-10-22T10:30:00Z",
    },
    {
      id: 2,
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "082-345-6789",
      age: 28,
      salary: 55000,
      isActive: true,
      department: "Marketing",
      joinDate: "2023-03-20",
      lastLogin: "2024-10-22T09:15:00Z",
    },
    {
      id: 3,
      name: "Bob Johnson",
      email: "bob.johnson@example.com",
      phone: "083-456-7890",
      age: 35,
      salary: 60000,
      isActive: false,
      department: "Sales",
      joinDate: "2022-11-10",
      lastLogin: "2024-10-20T14:45:00Z",
    },
    {
      id: 4,
      name: "Alice Brown",
      email: "alice.brown@example.com",
      phone: "084-567-8901",
      age: 32,
      salary: 52000,
      isActive: true,
      department: "Engineering",
      joinDate: "2023-06-01",
      lastLogin: "2024-10-22T11:20:00Z",
    },
    {
      id: 5,
      name: "Charlie Wilson",
      email: "charlie.wilson@example.com",
      phone: "085-678-9012",
      age: 29,
      salary: 48000,
      isActive: true,
      department: "HR",
      joinDate: "2023-09-15",
      lastLogin: "2024-10-22T08:30:00Z",
    },
  ];

  // Column definitions
  const columnDefs = [
    {
      field: "name",
      headerName: "Full Name",
      width: 150,
      type: "string",
    },
    {
      field: "email",
      headerName: "Email Address",
      width: 200,
      type: "string",
    },
    {
      field: "phone",
      headerName: "Phone Number",
      width: 140,
      type: "string",
    },
    {
      field: "age",
      headerName: "Age",
      width: 80,
      type: "number",
    },
    {
      field: "salary",
      headerName: "Salary",
      width: 120,
      type: "currency",
      format: "currency",
    },
    {
      field: "isActive",
      headerName: "Active Status",
      width: 120,
      type: "boolean",
    },
    {
      field: "department",
      headerName: "Department",
      width: 130,
      type: "string",
    },
    {
      field: "joinDate",
      headerName: "Join Date",
      width: 120,
      type: "date",
    },
    {
      field: "lastLogin",
      headerName: "Last Login",
      width: 160,
      type: "datetime",
    },
  ];

  const handleRowClick = (row) => {
    console.log("Row clicked:", row);
    alert(`Clicked on: ${row.name}`);
  };

  const handleView = (row) => {
    console.log("View row:", row);
    alert(
      `View details for: ${row.name}\nEmail: ${row.email}\nDepartment: ${row.department}`
    );
  };

  const handleRowSelection = (selectedRows) => {
    console.log("Selected rows:", selectedRows);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        BSDataGridClient Examples
      </Typography>

      <Typography variant="body1" paragraph>
        BSDataGridClient is a client-side only DataGrid component for displaying
        JSON data. It supports filtering, sorting, and searching without
        requiring a backend server.
      </Typography>

      {/* Example 1: Basic usage with auto-generated columns */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          1. Basic Usage - Auto-generated Columns
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Pass data array and let the component auto-detect column types and
          formatting.
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <BSDataGridClient
          data={sampleData}
          height="400px"
          bsLocale="th"
          onRowClick={handleRowClick}
        />
      </Paper>

      {/* Example 2: With custom column definitions */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          2. Custom Column Definitions
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Define custom column properties including width, type, and formatting.
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <BSDataGridClient
          data={sampleData}
          columns={columnDefs}
          height="400px"
          bsLocale="th"
          onView={handleView}
        />
      </Paper>

      {/* Example 3: With column filtering and selection */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          3. Column Filtering & Row Selection
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Show only specific columns and enable row selection with checkbox.
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <BSDataGridClient
          data={sampleData}
          columns={columnDefs}
          bsCols="name,email,department,salary,isActive"
          bsShowCheckbox={true}
          height="400px"
          bsLocale="th"
          onCheckBoxSelected={handleRowSelection}
        />
      </Paper>

      {/* Example 4: With pinned columns */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          4. Column Pinning
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Pin important columns to left or right side for better visibility.
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <BSDataGridClient
          data={sampleData}
          columns={columnDefs}
          bsPinColsLeft="name,email"
          bsPinColsRight="isActive"
          height="400px"
          bsLocale="th"
          bsRowPerPage={10}
        />
      </Paper>

      {/* Example 5: Minimal setup without row numbers and toolbar */}
      <Box sx={{ mt: 4, mb: 2 }}>
        <Typography variant="h5" gutterBottom>
          5. Minimal Setup
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Clean layout without row numbers and toolbar for embedded usage.
        </Typography>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <BSDataGridClient
          data={sampleData}
          columns={columnDefs}
          bsCols="name,email,department,salary"
          bsShowRowNumber={false}
          showToolbar={false}
          height="300px"
          bsLocale="th"
        />
      </Paper>

      <Box sx={{ mt: 4, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Key Features:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ m: 0 }}>
          <li>✅ Client-side filtering and sorting</li>
          <li>✅ View-only mode (no edit/delete)</li>
          <li>✅ Auto-generated or custom column definitions</li>
          <li>✅ Row number column with pagination awareness</li>
          <li>✅ Column filtering with bsCols</li>
          <li>✅ Column pinning (left/right)</li>
          <li>✅ Row selection with checkbox</li>
          <li>✅ Quick search functionality</li>
          <li>✅ Header filters toggle</li>
          <li>✅ Thai/English localization</li>
          <li>✅ Responsive design</li>
          <li>✅ Custom cell formatting (currency, date, boolean)</li>
        </Typography>
      </Box>
    </Container>
  );
};

export default BSDataGridClientExample;
