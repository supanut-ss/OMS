USE [GTEC];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

IF EXISTS
(
    SELECT [part_id]
    FROM [inv].[t_inv_part_attachment]
    GROUP BY [part_id]
    HAVING COUNT_BIG(*) > 1
)
BEGIN
    THROW 51015, 'Cannot enforce one attachment per Part because duplicate part_id values exist in inv.t_inv_part_attachment.', 1;
END;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.indexes
    WHERE [object_id] = OBJECT_ID(N'inv.t_inv_part_attachment')
      AND [name] = N'UX_t_inv_part_attachment_part_id'
)
BEGIN
    CREATE UNIQUE INDEX [UX_t_inv_part_attachment_part_id]
        ON [inv].[t_inv_part_attachment] ([part_id]);
END;
GO
