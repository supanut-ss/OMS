USE [MyInventory]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [ais].[t_ai_favorite_prompts](
    [ai_fav_id] [bigint] IDENTITY(1,1) NOT NULL,
    [process] [nvarchar](200) NOT NULL,
    [user_id] [nvarchar](100) NOT NULL,
    [user_message] [nvarchar](max) NOT NULL,
    [create_date] [datetime] NOT NULL,
    [update_date] [datetime] NULL,
    [is_active] [bit] NULL,
 CONSTRAINT [PK_t_ai_favorite_prompts] PRIMARY KEY CLUSTERED
(
    [ai_fav_id] ASC
) WITH (
    PAD_INDEX = OFF,
    STATISTICS_NORECOMPUTE = OFF,
    IGNORE_DUP_KEY = OFF,
    ALLOW_ROW_LOCKS = ON,
    ALLOW_PAGE_LOCKS = ON,
    OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF
) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

ALTER TABLE [ais].[t_ai_favorite_prompts]
ADD CONSTRAINT [DF_t_ai_favorite_prompts_create_date] DEFAULT (GETDATE()) FOR [create_date]
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'The URL path of the page where the user submitted the AI request, e.g. ''/dashboard''. Used to filter logs by module or page for analytics and troubleshooting.',
    @level0type = N'SCHEMA', @level0name = N'ais',
    @level1type = N'TABLE',  @level1name = N't_ai_favorite_prompts',
    @level2type = N'COLUMN', @level2name = N'process'
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'The identifier of the user who submitted the request, e.g. employee code or username. Used to track per-user AI usage and for access auditing.',
    @level0type = N'SCHEMA', @level0name = N'ais',
    @level1type = N'TABLE',  @level1name = N't_ai_favorite_prompts',
    @level2type = N'COLUMN', @level2name = N'user_id'
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'The raw question or instruction submitted by the user to the AI. Stored exactly as received, before any processing or prompt augmentation.',
    @level0type = N'SCHEMA', @level0name = N'ais',
    @level1type = N'TABLE',  @level1name = N't_ai_favorite_prompts',
    @level2type = N'COLUMN', @level2name = N'user_message'
GO

EXEC sys.sp_addextendedproperty
    @name = N'MS_Description',
    @value = N'The date and time when this record was created. Defaults to the current server date/time (GETDATE()).',
    @level0type = N'SCHEMA', @level0name = N'ais',
    @level1type = N'TABLE',  @level1name = N't_ai_favorite_prompts',
    @level2type = N'COLUMN', @level2name = N'create_date'
GO
