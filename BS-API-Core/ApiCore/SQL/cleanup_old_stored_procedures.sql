-- =============================================
-- Cleanup Script: Drop old unused stored procedures
-- Description: Remove legacy stored procedures that are no longer used
-- Created: August 2025
-- Note: These procedures have been replaced with MUI X DataGrid compatible versions
-- =============================================

USE [TimesheetDB]
GO

PRINT 'Starting cleanup of old unused stored procedures...'
GO

-- =============================================
-- Drop sp_GetCustomersList (replaced by sp_GetCustomersListForDataGrid)
-- =============================================
IF OBJECT_ID('sp_GetCustomersList', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE sp_GetCustomersList
    PRINT 'sp_GetCustomersList dropped successfully'
END
ELSE
BEGIN
    PRINT 'sp_GetCustomersList does not exist - skipping'
END
GO

-- =============================================
-- Drop sp_GetProjectsList (replaced by sp_GetProjectsListForDataGrid)
-- =============================================
IF OBJECT_ID('sp_GetProjectsList', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE sp_GetProjectsList
    PRINT 'sp_GetProjectsList dropped successfully'
END
ELSE
BEGIN
    PRINT 'sp_GetProjectsList does not exist - skipping'
END
GO

-- =============================================
-- Drop sp_GetTimeEntriesList (replaced by sp_GetTimeEntriesListForDataGrid)
-- =============================================
IF OBJECT_ID('sp_GetTimeEntriesList', 'P') IS NOT NULL
BEGIN
    DROP PROCEDURE sp_GetTimeEntriesList
    PRINT 'sp_GetTimeEntriesList dropped successfully'
END
ELSE
BEGIN
    PRINT 'sp_GetTimeEntriesList does not exist - skipping'
END
GO

PRINT 'Cleanup completed successfully!'
PRINT 'Old stored procedures have been removed.'
PRINT 'Current active stored procedures:'
PRINT '- sp_GetCustomersListForDataGrid (MUI X DataGrid compatible)'
PRINT '- sp_GetProjectsListForDataGrid (MUI X DataGrid compatible)'
PRINT '- sp_GetTimeEntriesListForDataGrid (MUI X DataGrid compatible)'
GO
