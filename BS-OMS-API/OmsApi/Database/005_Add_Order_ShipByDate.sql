/*
    Add the marketplace Ship By SLA to the OMS order header.
    Run this script against the OMS SQL Server database before deploying the
    API/frontend version that selects oms.t_oms_order.ship_by_date.
*/

USE [OMS];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF COL_LENGTH(N'oms.t_oms_order', N'ship_by_date') IS NULL
BEGIN
    ALTER TABLE oms.t_oms_order
        ADD ship_by_date datetime NULL;
END;
GO

/*
    Previous OMS versions stored Shopee ship_by_date in cancellation_deadline.
    Backfill Shopee only; Lazada/TikTok cancellation fields have different
    meanings and must be populated by the next platform detail sync.
*/
UPDATE oms.t_oms_order
SET ship_by_date = cancellation_deadline
WHERE platform = N'Shopee'
  AND ship_by_date IS NULL
  AND cancellation_deadline IS NOT NULL;
GO

