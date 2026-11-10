/*
    Add normalized buyer invoice fields used by the OMS -> WM3 interface.
    The guards make this safe to run in databases where the columns were
    already added manually.
*/

USE [OMS];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF COL_LENGTH(N'oms.t_oms_order', N'buyer_tax_id') IS NULL
BEGIN
    ALTER TABLE oms.t_oms_order
        ADD buyer_tax_id nvarchar(100) NULL;
END;
GO

IF COL_LENGTH(N'oms.t_oms_order', N'buyer_invoice_name') IS NULL
BEGIN
    ALTER TABLE oms.t_oms_order
        ADD buyer_invoice_name nvarchar(100) NULL;
END;
GO

IF COL_LENGTH(N'oms.t_oms_order', N'buyer_invoice_address') IS NULL
BEGIN
    ALTER TABLE oms.t_oms_order
        ADD buyer_invoice_address nvarchar(500) NULL;
END;
GO

