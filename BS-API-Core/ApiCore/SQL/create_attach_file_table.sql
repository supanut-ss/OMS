-- =============================================
-- Create Attach File Table for Project Close Document
-- Table: tmt.t_tmt_project_close_document_attach_file
-- =============================================

USE [Timesheet]
GO

-- Drop existing table if you want to recreate (uncomment if needed)
-- WARNING: This will delete all data!
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[tmt].[t_tmt_project_close_document_attach_file]') AND type in (N'U'))
BEGIN
    DROP TABLE [tmt].[t_tmt_project_close_document_attach_file]
    PRINT 'Dropped existing table tmt.t_tmt_project_close_document_attach_file'
END
GO

-- Create table
CREATE TABLE [tmt].[t_tmt_project_close_document_attach_file]
(
    [project_close_attach_file_id] [int] IDENTITY(1,1) NOT NULL,
    [project_close_doc_id] [int] NOT NULL,
    [project_header_id] [int] NOT NULL,
    [file_name] [nvarchar](500) NOT NULL,
    [path_file] [nvarchar](1000) NOT NULL,
    [file_size] [bigint] NULL,
    [file_type] [nvarchar](100) NULL,
    [description] [nvarchar](500) NULL,
    [create_by] [nvarchar](40) NOT NULL,
    [create_date] [datetime] NOT NULL DEFAULT GETDATE(),
    [update_by] [nvarchar](40) NULL,
    [update_date] [datetime] NULL,
    [rowversion] [timestamp] NOT NULL,
    CONSTRAINT [PK_t_tmt_project_close_document_attach_file] PRIMARY KEY CLUSTERED 
    (
        [project_close_attach_file_id] ASC
    )
)
GO

PRINT 'Table tmt.t_tmt_project_close_document_attach_file created successfully.'
GO

-- Add foreign key constraint (optional - uncomment if needed)
-- ALTER TABLE [tmt].[t_tmt_project_close_document_attach_file]
-- ADD CONSTRAINT [FK_attach_file_project_close_doc] 
-- FOREIGN KEY ([project_close_doc_id]) 
-- REFERENCES [tmt].[t_tmt_project_close_document] ([project_close_doc_id])
-- GO

-- Add extended properties for column descriptions
EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Primary key - Auto increment ID', 
    @level0type=N'SCHEMA', @level0name=N'tmt', 
    @level1type=N'TABLE', @level1name=N't_tmt_project_close_document_attach_file', 
    @level2type=N'COLUMN', @level2name=N'project_close_attach_file_id'
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Foreign key to project close document', 
    @level0type=N'SCHEMA', @level0name=N'tmt', 
    @level1type=N'TABLE', @level1name=N't_tmt_project_close_document_attach_file', 
    @level2type=N'COLUMN', @level2name=N'project_close_doc_id'
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Foreign key to project header', 
    @level0type=N'SCHEMA', @level0name=N'tmt', 
    @level1type=N'TABLE', @level1name=N't_tmt_project_close_document_attach_file', 
    @level2type=N'COLUMN', @level2name=N'project_header_id'
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'Original file name', 
    @level0type=N'SCHEMA', @level0name=N'tmt', 
    @level1type=N'TABLE', @level1name=N't_tmt_project_close_document_attach_file', 
    @level2type=N'COLUMN', @level2name=N'file_name'
GO

EXEC sys.sp_addextendedproperty 
    @name=N'MS_Description', 
    @value=N'File path on server', 
    @level0type=N'SCHEMA', @level0name=N'tmt', 
    @level1type=N'TABLE', @level1name=N't_tmt_project_close_document_attach_file', 
    @level2type=N'COLUMN', @level2name=N'path_file'
GO

PRINT 'Extended properties added successfully.'
GO
