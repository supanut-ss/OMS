USE [WM3_Security]
GO
/****** Object:  Table [dbo].[t_com_user]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_user](
	[tran_id] [varchar](40) NOT NULL,
	[user_id] [nvarchar](25) NOT NULL,
	[name] [nvarchar](200) NULL,
	[first_name] [nvarchar](200) NULL,
	[last_name] [nvarchar](200) NULL,
	[password] [nvarchar](200) NULL,
	[locale_id] [varchar](40) NULL,
	[is_active] [nvarchar](12) NULL,
	[department] [nvarchar](120) NULL,
	[supervisor] [nvarchar](120) NULL,
	[email_address] [nvarchar](120) NULL,
	[domain_user_id] [nvarchar](120) NULL,
	[domain] [nvarchar](120) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_user] PRIMARY KEY CLUSTERED 
(
	[tran_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_user_application]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_user_application](
	[tran_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NOT NULL,
	[user_id] [nvarchar](25) NOT NULL,
	[user_group_id] [varchar](40) NOT NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_user_application] PRIMARY KEY CLUSTERED 
(
	[tran_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_com_authenticate]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[v_com_authenticate]
AS
SELECT        dbo.t_com_user_application.app_id, dbo.t_com_user.user_id, dbo.t_com_user.password, dbo.t_com_user.first_name, dbo.t_com_user.last_name, dbo.t_com_user_application.user_group_id, 
                         dbo.t_com_user.is_active
FROM            dbo.t_com_user INNER JOIN
                         dbo.t_com_user_application ON dbo.t_com_user.user_id = dbo.t_com_user_application.user_id
GO
/****** Object:  Table [dbo].[t_com_locale]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_locale](
	[locale_id] [varchar](40) NOT NULL,
	[name] [nvarchar](200) NULL,
	[description] [nvarchar](400) NULL,
	[locale] [varchar](40) NULL,
	[is_active] [nvarchar](12) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_locale] PRIMARY KEY CLUSTERED 
(
	[locale_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [IX_t_com_locale] UNIQUE NONCLUSTERED 
(
	[locale_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_menu]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_menu](
	[menu_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NULL,
	[platform] [nvarchar](120) NULL,
	[menu_group] [nvarchar](200) NULL,
	[menu_group_sequence] [int] NULL,
	[parent_menu_id] [varchar](40) NULL,
	[menu_name] [nvarchar](200) NULL,
	[menu_sequence] [int] NOT NULL,
	[process] [nvarchar](800) NULL,
	[resource_master_id] [varchar](40) NULL,
	[is_active] [nvarchar](3) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](25) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_menu_test] PRIMARY KEY CLUSTERED 
(
	[menu_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_resource_master]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_resource_master](
	[resource_master_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NOT NULL,
	[resource_name] [nvarchar](50) NOT NULL,
	[description] [nvarchar](400) NULL,
	[default_value] [nvarchar](2000) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_resource_master] PRIMARY KEY CLUSTERED 
(
	[resource_master_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_resource_detail]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_resource_detail](
	[resource_detail_id] [varchar](40) NOT NULL,
	[resource_master_id] [varchar](40) NOT NULL,
	[locale_id] [varchar](40) NULL,
	[value] [nvarchar](2000) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_resource_detail] PRIMARY KEY CLUSTERED 
(
	[resource_detail_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_user_group_menu]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_user_group_menu](
	[user_group_id] [varchar](40) NOT NULL,
	[menu_id] [varchar](40) NOT NULL,
	[is_active] [nvarchar](12) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_user_group_menu] PRIMARY KEY CLUSTERED 
(
	[user_group_id] ASC,
	[menu_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_com_get_authen_by_menu_group]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_com_get_authen_by_menu_group]
AS


SELECT 
u_menu.user_group_id, u_menu.is_active,tmp2.platform,tmp2.menu_group, 
tmp2.parent_menu_id,tmp2.menu_group_sequence,tmp2.menu_sequence,tmp2.process, 
tmp2.resource_master_id, tmp2.locale_id , tmp2.display_menu
AS menu_name, tmp2.resource_name,tmp2.menu_id,tmp2.app_id 
FROM t_com_user_group_menu as u_menu
INNER JOIN
(
	SELECT
	tmp.*
	,res_mas.resource_name
	,res_mas.default_value
	,res_det.value
	,isnull(isnull(res_det.value,res_mas.default_value),tmp.menu_name)  as display_menu
	FROM
	(
		select 
		menu.menu_id
		,menu.resource_master_id
		,menu.app_id
		,menu.platform
		,menu.menu_group_sequence
		,menu.menu_sequence
		,menu.parent_menu_id
		,menu.process
		,menu.menu_name
		,menu.menu_group
		,locale.locale_id
		,locale.name

		from t_com_menu as menu,t_com_locale as locale
		where menu.is_active = 'YES'
	) as tmp
	LEFT JOIN t_com_resource_master as res_mas on res_mas.resource_master_id = tmp.resource_master_id
	LEFT JOIN t_com_resource_detail as res_det on res_det.resource_master_id = tmp.resource_master_id and res_det.locale_id = tmp.locale_id
) as tmp2 on u_menu.menu_id = tmp2.menu_id
 
--SELECT     dbo.t_com_user_group_menu.user_group_id, dbo.t_com_user_group_menu.is_active, dbo.t_com_menu.platform, dbo.t_com_menu.menu_group, 
--                      dbo.t_com_menu.parent_menu_id, dbo.t_com_menu.menu_group_sequence, dbo.t_com_menu.menu_sequence, dbo.t_com_menu.process, 
--                      dbo.t_com_menu.resource_master_id, ISNULL(dbo.t_com_resource_detail.locale_id,'1033') as locale_id , ISNULL(dbo.t_com_resource_detail.value, dbo.t_com_menu.menu_name) 
--                      AS menu_name, dbo.t_com_resource_master.resource_name, dbo.t_com_menu.menu_id, dbo.t_com_menu.app_id
--FROM         dbo.t_com_user_group_menu 
--			 INNER JOIN dbo.t_com_menu ON dbo.t_com_user_group_menu.menu_id = dbo.t_com_menu.menu_id AND t_com_menu.is_active = 'YES'
--			 LEFT OUTER JOIN dbo.t_com_resource_master ON dbo.t_com_resource_master.resource_master_id = dbo.t_com_menu.resource_master_id
--			 LEFT OUTER JOIN dbo.t_com_resource_detail ON dbo.t_com_resource_detail.resource_master_id = dbo.t_com_resource_master.resource_master_id 
--where dbo.t_com_menu.app_id='CC3D76CA-71B9-47CB-A933-4B1F1F489AF0' and user_group_id='1BDB9373-1261-4C7E-AF3A-7704038E6246'
--ORDER BY dbo.t_com_menu.menu_group, dbo.t_com_menu.menu_sequence
GO
/****** Object:  View [dbo].[v_com_get_authen_childmenu]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_com_get_authen_childmenu]
AS
SELECT     TOP (100) PERCENT dbo.t_com_menu.menu_id, dbo.t_com_menu.app_id, dbo.t_com_menu.platform, dbo.t_com_menu.menu_group, 
                      dbo.t_com_menu.menu_group_sequence, dbo.t_com_menu.parent_menu_id, dbo.t_com_menu.menu_sequence, dbo.t_com_menu.process, 
                      dbo.t_com_menu.resource_master_id, dbo.t_com_menu.is_active, dbo.t_com_menu.create_date, dbo.t_com_menu.create_by, dbo.t_com_menu.rowversion, 
                      dbo.t_com_resource_detail.locale_id, ISNULL(dbo.t_com_resource_detail.value, dbo.t_com_menu.menu_name) AS menu_name, 
                      dbo.t_com_resource_master.default_value
FROM         dbo.t_com_resource_detail INNER JOIN
                      dbo.t_com_resource_master ON dbo.t_com_resource_detail.resource_master_id = dbo.t_com_resource_master.resource_master_id RIGHT OUTER JOIN
                      dbo.t_com_menu ON dbo.t_com_resource_master.resource_name = dbo.t_com_menu.menu_id
ORDER BY dbo.t_com_menu.menu_group_sequence, dbo.t_com_menu.menu_sequence

GO
/****** Object:  View [dbo].[v_com_get_authen_only_rootmenu]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


CREATE VIEW [dbo].[v_com_get_authen_only_rootmenu]
AS
SELECT     TOP (100) PERCENT dbo.t_com_menu.menu_id, dbo.t_com_menu.app_id, dbo.t_com_menu.platform, dbo.t_com_menu.menu_group, 
                      dbo.t_com_menu.menu_group_sequence, dbo.t_com_menu.parent_menu_id, dbo.t_com_menu.menu_sequence, dbo.t_com_menu.process, 
                      dbo.t_com_menu.resource_master_id, dbo.t_com_menu.is_active, dbo.t_com_menu.create_date, dbo.t_com_menu.create_by, dbo.t_com_menu.rowversion, 
                      ISNULL(dbo.t_com_resource_detail.value, dbo.t_com_menu.menu_name) AS menu_name, dbo.t_com_resource_master.default_value, 
                      dbo.t_com_resource_detail.locale_id
FROM         dbo.t_com_resource_detail LEFT OUTER JOIN
                      dbo.t_com_resource_master ON dbo.t_com_resource_detail.resource_master_id = dbo.t_com_resource_master.resource_master_id RIGHT OUTER JOIN
                      dbo.t_com_menu ON dbo.t_com_resource_master.resource_name = dbo.t_com_menu.menu_id
ORDER BY dbo.t_com_menu.menu_group_sequence, dbo.t_com_menu.menu_sequence
GO
/****** Object:  View [dbo].[v_com_get_menu]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE VIEW [dbo].[v_com_get_menu]
AS
SELECT     dbo.t_com_user_group_menu.user_group_id, dbo.t_com_user_group_menu.menu_id, dbo.t_com_menu.app_id, dbo.t_com_menu.platform, 
                      dbo.t_com_menu.menu_group, dbo.t_com_menu.menu_group_sequence, dbo.t_com_menu.parent_menu_id, dbo.t_com_menu.menu_sequence, 
                      dbo.t_com_menu.process, dbo.t_com_menu.resource_master_id, dbo.t_com_menu.is_active, dbo.t_com_resource_master.default_value, 
                      ISNULL(dbo.t_com_resource_detail.value, dbo.t_com_menu.menu_name) AS menu_name
FROM         dbo.t_com_resource_detail INNER JOIN
                      dbo.t_com_resource_master ON dbo.t_com_resource_detail.resource_master_id = dbo.t_com_resource_master.resource_master_id RIGHT OUTER JOIN
                      dbo.t_com_user_group_menu INNER JOIN
                      dbo.t_com_menu ON dbo.t_com_user_group_menu.menu_id = dbo.t_com_menu.menu_id ON dbo.t_com_resource_master.resource_name = dbo.t_com_menu.menu_id

GO
/****** Object:  Table [dbo].[t_com_application]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_application](
	[app_id] [varchar](40) NOT NULL,
	[application_name] [nvarchar](400) NULL,
	[description] [nvarchar](400) NULL,
	[license_type] [nvarchar](40) NULL,
	[number_of_users] [nvarchar](200) NULL,
	[is_active] [nvarchar](12) NULL,
	[app_version] [nvarchar](120) NULL,
	[date_installed] [nvarchar](200) NULL,
	[expiry_date] [nvarchar](200) NULL,
	[maintenance_support_date] [nvarchar](200) NULL,
	[db_server_name] [nvarchar](400) NULL,
	[db_name] [nvarchar](400) NULL,
	[db_user] [nvarchar](100) NULL,
	[db_password] [nvarchar](100) NULL,
	[db_connectionstring] [nvarchar](2000) NULL,
	[environment] [nvarchar](200) NULL,
	[security_mode] [nvarchar](400) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
	[use_expirydate] [nvarchar](200) NULL,
 CONSTRAINT [PK_t_com_application] PRIMARY KEY CLUSTERED 
(
	[app_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_user_device]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_user_device](
	[tran_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NOT NULL,
	[user_id] [nvarchar](25) NOT NULL,
	[device] [nvarchar](50) NOT NULL,
	[is_active] [nvarchar](12) NULL,
	[logon_datetime] [datetime] NOT NULL,
	[last_alive_time] [datetime] NULL,
	[logout_datetime] [datetime] NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_user_device] PRIMARY KEY CLUSTERED 
(
	[tran_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  View [dbo].[v_com_user_logon]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE VIEW [dbo].[v_com_user_logon]
AS
SELECT     dbo.t_com_user_device.tran_id, dbo.t_com_user_device.app_id, dbo.t_com_application.application_name, dbo.t_com_user_device.user_id, dbo.t_com_user.name, 
                      dbo.t_com_user.first_name, dbo.t_com_user.last_name, dbo.t_com_user_device.device, dbo.t_com_user_device.logon_datetime, dbo.t_com_user_device.is_active, 
                      0 AS [Select]
FROM         dbo.t_com_user RIGHT OUTER JOIN
                      dbo.t_com_user_device ON dbo.t_com_user.user_id = dbo.t_com_user_device.user_id LEFT OUTER JOIN
                      dbo.t_com_application ON dbo.t_com_user_device.app_id = dbo.t_com_application.app_id
WHERE     (dbo.t_com_user_device.is_active = N'YES')
GO
/****** Object:  Table [dbo].[t_com_combobox_item]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_combobox_item](
	[ComboBoxItemID] [int] NOT NULL,
	[group_name] [varchar](50) NULL,
	[value_member] [varchar](25) NULL,
	[display_member] [nvarchar](200) NULL,
	[description] [nvarchar](1020) NULL,
	[locale_id] [varchar](40) NULL,
	[display_sequence] [int] NULL,
	[is_active] [nvarchar](12) NULL,
	[create_by] [nvarchar](40) NULL,
	[create_datetime] [datetime] NOT NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_combobox_item] PRIMARY KEY CLUSTERED 
(
	[ComboBoxItemID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_config]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_config](
	[config_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NOT NULL,
	[platform] [varchar](10) NULL,
	[config_code] [varchar](40) NULL,
	[value] [nvarchar](120) NULL,
	[sequence] [int] NOT NULL,
	[is_active] [nvarchar](12) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](100) NULL,
 CONSTRAINT [pk_t_com_config] PRIMARY KEY NONCLUSTERED 
(
	[config_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_country]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_country](
	[country_id] [varchar](40) NOT NULL,
	[country_code] [nvarchar](40) NOT NULL,
	[country_name] [nvarchar](200) NOT NULL,
	[country_abbr] [nvarchar](160) NULL,
	[country_std_code] [nvarchar](40) NULL,
	[is_active] [nvarchar](12) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_country] PRIMARY KEY CLUSTERED 
(
	[country_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [IX_t_com_country] UNIQUE NONCLUSTERED 
(
	[country_code] ASC,
	[country_name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_process_log]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_process_log](
	[process_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NULL,
	[log_type] [nvarchar](200) NULL,
	[warehouse] [nvarchar](100) NULL,
	[device] [nvarchar](200) NULL,
	[process] [nvarchar](200) NULL,
	[process_datetime] [datetime] NOT NULL,
	[data_1] [nvarchar](4000) NULL,
	[data_2] [nvarchar](4000) NULL,
	[data_3] [nvarchar](4000) NULL,
	[data_4] [nvarchar](4000) NULL,
	[message] [nvarchar](400) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_process_log] PRIMARY KEY CLUSTERED 
(
	[process_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_report_manager]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_report_manager](
	[report_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NULL,
	[form_name] [nvarchar](400) NULL,
	[report_name] [nvarchar](400) NULL,
	[report_seq] [nvarchar](40) NULL,
	[report_file_name] [nvarchar](400) NULL,
	[report_type] [nvarchar](400) NULL,
	[is_active] [nvarchar](12) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_report_manager] PRIMARY KEY CLUSTERED 
(
	[report_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_report_mapping_para]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_report_mapping_para](
	[para_id] [varchar](40) NOT NULL,
	[report_id] [varchar](40) NULL,
	[report_para_name] [nvarchar](200) NULL,
	[program_para_name] [nvarchar](200) NULL,
	[is_active] [varchar](3) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_report_mapping_para] PRIMARY KEY CLUSTERED 
(
	[para_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_temp]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_temp](
	[tra_id] [varchar](40) NOT NULL,
	[cash_id] [nvarchar](160) NULL,
	[app_id] [varchar](40) NOT NULL,
	[platform] [nvarchar](40) NULL,
	[create_by] [nvarchar](100) NULL,
	[create_date] [datetime] NOT NULL,
 CONSTRAINT [PK_t_com_temp] PRIMARY KEY CLUSTERED 
(
	[tra_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_tran_log]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_tran_log](
	[tran_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NULL,
	[tran_type] [nvarchar](80) NULL,
	[sub_tran_type] [nvarchar](80) NULL,
	[app_name] [nvarchar](400) NULL,
	[description] [nvarchar](400) NULL,
	[start_tran_datetime] [datetime] NOT NULL,
	[end_tran_datetime] [datetime] NULL,
	[warehouse] [nvarchar](100) NULL,
	[to_warehouse] [nvarchar](100) NULL,
	[location_id] [nvarchar](200) NULL,
	[to_location_id] [nvarchar](200) NULL,
	[owner] [nvarchar](200) NULL,
	[to_owner] [nvarchar](200) NULL,
	[item_number] [nvarchar](200) NULL,
	[quantity] [float] NOT NULL,
	[quantity_uom] [nvarchar](40) NULL,
	[after_quantity] [float] NULL,
	[after_quantity_uom] [nvarchar](40) NULL,
	[lot_number] [nvarchar](200) NULL,
	[after_lot_number] [nvarchar](200) NULL,
	[expiry_date] [datetime] NULL,
	[after_expiry_date] [datetime] NULL,
	[serial_number] [nvarchar](200) NULL,
	[user_id] [nvarchar](40) NULL,
	[reference_number] [nvarchar](200) NULL,
	[control_number] [nvarchar](200) NULL,
	[lpn] [nvarchar](100) NULL,
	[after_lpn] [nvarchar](100) NULL,
	[status] [nvarchar](40) NULL,
	[after_status] [nvarchar](40) NULL,
	[zone] [nvarchar](200) NULL,
	[order_number] [nvarchar](160) NULL,
	[line_number] [nvarchar](40) NULL,
	[control_value_1] [nvarchar](400) NULL,
	[control_value_2] [nvarchar](400) NULL,
	[reason_code] [nvarchar](80) NULL,
	[udf_1] [nvarchar](400) NULL,
	[udf_2] [nvarchar](400) NULL,
	[udf_3] [nvarchar](400) NULL,
	[udf_4] [nvarchar](400) NULL,
	[udf_datetime_1] [datetime] NULL,
	[udf_datetime_2] [datetime] NULL,
	[udf_datetime_3] [datetime] NULL,
	[device] [nvarchar](200) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_tran_log] PRIMARY KEY CLUSTERED 
(
	[tran_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_user_group]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_user_group](
	[user_group_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NOT NULL,
	[name] [nvarchar](30) NOT NULL,
	[description] [nvarchar](200) NULL,
	[is_active] [nvarchar](12) NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_user_group] PRIMARY KEY CLUSTERED 
(
	[user_group_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY],
 CONSTRAINT [IX_t_com_user_group] UNIQUE NONCLUSTERED 
(
	[name] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[t_com_user_logon]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[t_com_user_logon](
	[tran_id] [varchar](40) NOT NULL,
	[app_id] [varchar](40) NOT NULL,
	[tran_type] [nvarchar](40) NULL,
	[description] [nvarchar](200) NULL,
	[logon_start_datetime] [datetime] NOT NULL,
	[logon_end_datetime] [datetime] NULL,
	[user_id] [nvarchar](25) NOT NULL,
	[device] [nvarchar](50) NOT NULL,
	[logon_time] [int] NULL,
	[create_date] [datetime] NOT NULL,
	[create_by] [nvarchar](40) NULL,
	[rowversion] [timestamp] NOT NULL,
 CONSTRAINT [PK_t_com_user_logon] PRIMARY KEY CLUSTERED 
(
	[tran_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[t_com_application] ADD  CONSTRAINT [DF_t_com_application_app_id]  DEFAULT (newid()) FOR [app_id]
GO
ALTER TABLE [dbo].[t_com_application] ADD  CONSTRAINT [DF_t_com_application_is_active]  DEFAULT ('YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_application] ADD  CONSTRAINT [DF_t_com_application_environment]  DEFAULT (N'DEV') FOR [environment]
GO
ALTER TABLE [dbo].[t_com_application] ADD  CONSTRAINT [DF_t_com_application_security_mode]  DEFAULT ('SIMPLE') FOR [security_mode]
GO
ALTER TABLE [dbo].[t_com_application] ADD  CONSTRAINT [DF_t_com_application_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_application] ADD  CONSTRAINT [DF_t_com_application_date_expiry]  DEFAULT (N'NO') FOR [use_expirydate]
GO
ALTER TABLE [dbo].[t_com_combobox_item] ADD  CONSTRAINT [DF_t_com_combobox_item_is_active]  DEFAULT (N'YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_combobox_item] ADD  CONSTRAINT [DF_t_com_ComboBoxItem_CreateDatetime]  DEFAULT (getdate()) FOR [create_datetime]
GO
ALTER TABLE [dbo].[t_com_config] ADD  CONSTRAINT [DF_t_com_config_config_id]  DEFAULT (newid()) FOR [config_id]
GO
ALTER TABLE [dbo].[t_com_config] ADD  CONSTRAINT [DF_t_com_config_platform]  DEFAULT (N'PC') FOR [platform]
GO
ALTER TABLE [dbo].[t_com_config] ADD  CONSTRAINT [DF_t_com_config_sequence]  DEFAULT ((1)) FOR [sequence]
GO
ALTER TABLE [dbo].[t_com_config] ADD  CONSTRAINT [DF_t_com_config_is_active]  DEFAULT ('YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_config] ADD  CONSTRAINT [DF_t_com_config_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_country] ADD  CONSTRAINT [DF_t_com_country_country_id]  DEFAULT (newid()) FOR [country_id]
GO
ALTER TABLE [dbo].[t_com_country] ADD  CONSTRAINT [DF_t_com_country_is_active]  DEFAULT (N'YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_country] ADD  CONSTRAINT [DF_t_com_country_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_locale] ADD  CONSTRAINT [DF_t_com_locale_locale_id]  DEFAULT (newid()) FOR [locale_id]
GO
ALTER TABLE [dbo].[t_com_locale] ADD  CONSTRAINT [DF_t_com_locale_description]  DEFAULT (N'Long description') FOR [description]
GO
ALTER TABLE [dbo].[t_com_locale] ADD  CONSTRAINT [DF_t_com_locale_is_active]  DEFAULT ('YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_locale] ADD  CONSTRAINT [DF_t_com_locale_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_menu] ADD  CONSTRAINT [DF_t_com_menu_test_menu_id]  DEFAULT (newid()) FOR [menu_id]
GO
ALTER TABLE [dbo].[t_com_menu] ADD  CONSTRAINT [DF_t_com_menu_process]  DEFAULT ('') FOR [process]
GO
ALTER TABLE [dbo].[t_com_menu] ADD  CONSTRAINT [DF_t_com_menu_test_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_process_log] ADD  CONSTRAINT [DF_t_com_process_log_process_id]  DEFAULT (newid()) FOR [process_id]
GO
ALTER TABLE [dbo].[t_com_process_log] ADD  CONSTRAINT [DF_t_com_process_log_process_datetime]  DEFAULT (getdate()) FOR [process_datetime]
GO
ALTER TABLE [dbo].[t_com_process_log] ADD  CONSTRAINT [DF_t_com_process_log_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_report_manager] ADD  CONSTRAINT [DF_t_com_report_manager_report_id]  DEFAULT (newid()) FOR [report_id]
GO
ALTER TABLE [dbo].[t_com_report_manager] ADD  CONSTRAINT [DF_t_com_report_manager_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_report_mapping_para] ADD  CONSTRAINT [DF_t_com_report_mapping_para_para_id]  DEFAULT (newid()) FOR [para_id]
GO
ALTER TABLE [dbo].[t_com_report_mapping_para] ADD  CONSTRAINT [DF_t_com_report_mapping_para_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_resource_detail] ADD  CONSTRAINT [DF_t_com_resource_detail_resource_detail_id]  DEFAULT (newid()) FOR [resource_detail_id]
GO
ALTER TABLE [dbo].[t_com_resource_detail] ADD  CONSTRAINT [DF_t_com_resource_detail_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_resource_detail] ADD  CONSTRAINT [DF_t_com_resource_detail_create_by]  DEFAULT (N'OGA') FOR [create_by]
GO
ALTER TABLE [dbo].[t_com_resource_master] ADD  CONSTRAINT [DF_t_com_resource_master_resource_master_id]  DEFAULT (newid()) FOR [resource_master_id]
GO
ALTER TABLE [dbo].[t_com_resource_master] ADD  CONSTRAINT [DF_t_com_resource_master_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_resource_master] ADD  CONSTRAINT [DF_t_com_resource_master_create_by]  DEFAULT (N'OGA') FOR [create_by]
GO
ALTER TABLE [dbo].[t_com_temp] ADD  CONSTRAINT [DF_t_com_temp_tra_id]  DEFAULT (newid()) FOR [tra_id]
GO
ALTER TABLE [dbo].[t_com_temp] ADD  CONSTRAINT [DF_t_com_temp_platform]  DEFAULT (N'PC') FOR [platform]
GO
ALTER TABLE [dbo].[t_com_temp] ADD  CONSTRAINT [DF_t_com_temp_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_tran_log] ADD  CONSTRAINT [DF_t_com_tran_log_tran_id]  DEFAULT (newid()) FOR [tran_id]
GO
ALTER TABLE [dbo].[t_com_tran_log] ADD  CONSTRAINT [DF_t_com_tran_log_quantity]  DEFAULT ((0)) FOR [quantity]
GO
ALTER TABLE [dbo].[t_com_tran_log] ADD  CONSTRAINT [DF_t_com_tran_log_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_tran_id]  DEFAULT (newid()) FOR [tran_id]
GO
ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_locale_id]  DEFAULT ((1033)) FOR [locale_id]
GO
ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_is_active]  DEFAULT ('YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_user] ADD  CONSTRAINT [DF_t_com_user_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_user_application] ADD  CONSTRAINT [DF_t_com_user_application_tran_id]  DEFAULT (newid()) FOR [tran_id]
GO
ALTER TABLE [dbo].[t_com_user_application] ADD  CONSTRAINT [DF_t_com_user_application_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_user_device] ADD  CONSTRAINT [DF_t_com_user_device_tran_id]  DEFAULT (newid()) FOR [tran_id]
GO
ALTER TABLE [dbo].[t_com_user_device] ADD  CONSTRAINT [DF_t_com_user_device_is_active]  DEFAULT ('YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_user_device] ADD  CONSTRAINT [DF_t_com_user_device_logon_datetime]  DEFAULT (getdate()) FOR [logon_datetime]
GO
ALTER TABLE [dbo].[t_com_user_device] ADD  CONSTRAINT [DF_t_com_user_device_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_user_group] ADD  CONSTRAINT [DF_t_com_user_group_user_group_id]  DEFAULT (newid()) FOR [user_group_id]
GO
ALTER TABLE [dbo].[t_com_user_group] ADD  CONSTRAINT [DF_t_com_user_group_is_active]  DEFAULT ('YES') FOR [is_active]
GO
ALTER TABLE [dbo].[t_com_user_group] ADD  CONSTRAINT [DF_t_com_user_group_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_user_group_menu] ADD  CONSTRAINT [DF_t_com_user_group_menu_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_user_logon] ADD  CONSTRAINT [DF_t_com_user_logon_tran_id]  DEFAULT (newid()) FOR [tran_id]
GO
ALTER TABLE [dbo].[t_com_user_logon] ADD  CONSTRAINT [DF_t_com_user_logon_logon_start_datetime]  DEFAULT (getdate()) FOR [logon_start_datetime]
GO
ALTER TABLE [dbo].[t_com_user_logon] ADD  CONSTRAINT [DF_t_com_user_logon_create_date]  DEFAULT (getdate()) FOR [create_date]
GO
ALTER TABLE [dbo].[t_com_config]  WITH CHECK ADD  CONSTRAINT [FK_t_com_config_t_com_application] FOREIGN KEY([app_id])
REFERENCES [dbo].[t_com_application] ([app_id])
GO
ALTER TABLE [dbo].[t_com_config] CHECK CONSTRAINT [FK_t_com_config_t_com_application]
GO
ALTER TABLE [dbo].[t_com_resource_detail]  WITH CHECK ADD  CONSTRAINT [FK_t_com_resource_detail_t_com_resource_master] FOREIGN KEY([resource_master_id])
REFERENCES [dbo].[t_com_resource_master] ([resource_master_id])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[t_com_resource_detail] CHECK CONSTRAINT [FK_t_com_resource_detail_t_com_resource_master]
GO
ALTER TABLE [dbo].[t_com_temp]  WITH CHECK ADD  CONSTRAINT [FK_t_com_temp_t_com_application] FOREIGN KEY([app_id])
REFERENCES [dbo].[t_com_application] ([app_id])
GO
ALTER TABLE [dbo].[t_com_temp] CHECK CONSTRAINT [FK_t_com_temp_t_com_application]
GO
ALTER TABLE [dbo].[t_com_user_application]  WITH CHECK ADD  CONSTRAINT [FK_t_com_application] FOREIGN KEY([app_id])
REFERENCES [dbo].[t_com_application] ([app_id])
GO
ALTER TABLE [dbo].[t_com_user_application] CHECK CONSTRAINT [FK_t_com_application]
GO
ALTER TABLE [dbo].[t_com_user_application]  WITH CHECK ADD  CONSTRAINT [FK_t_com_user_group] FOREIGN KEY([user_group_id])
REFERENCES [dbo].[t_com_user_group] ([user_group_id])
GO
ALTER TABLE [dbo].[t_com_user_application] CHECK CONSTRAINT [FK_t_com_user_group]
GO
ALTER TABLE [dbo].[t_com_user_device]  WITH CHECK ADD  CONSTRAINT [FK_t_com_user_device_t_com_application] FOREIGN KEY([app_id])
REFERENCES [dbo].[t_com_application] ([app_id])
GO
ALTER TABLE [dbo].[t_com_user_device] CHECK CONSTRAINT [FK_t_com_user_device_t_com_application]
GO
ALTER TABLE [dbo].[t_com_user_group]  WITH CHECK ADD  CONSTRAINT [FK_t_com_user_group_t_com_application] FOREIGN KEY([app_id])
REFERENCES [dbo].[t_com_application] ([app_id])
GO
ALTER TABLE [dbo].[t_com_user_group] CHECK CONSTRAINT [FK_t_com_user_group_t_com_application]
GO
ALTER TABLE [dbo].[t_com_user_group_menu]  WITH CHECK ADD  CONSTRAINT [FK_menu_id] FOREIGN KEY([menu_id])
REFERENCES [dbo].[t_com_menu] ([menu_id])
ON UPDATE CASCADE
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[t_com_user_group_menu] CHECK CONSTRAINT [FK_menu_id]
GO
ALTER TABLE [dbo].[t_com_user_logon]  WITH CHECK ADD  CONSTRAINT [FK_t_com_user_logon_t_com_application1] FOREIGN KEY([app_id])
REFERENCES [dbo].[t_com_application] ([app_id])
GO
ALTER TABLE [dbo].[t_com_user_logon] CHECK CONSTRAINT [FK_t_com_user_logon_t_com_application1]
GO
/****** Object:  StoredProcedure [dbo].[usp_get_resource_to_text_value]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE procedure [dbo].[usp_get_resource_to_text_value]
(  
    @in_vchApplicationID VARCHAR(40),  
    @in_vchResourceName  NVARCHAR(50),  
    @in_intLocaleID   VARCHAR(40)  
)  
AS  
BEGIN  
    DECLARE  
    -- Local Variables  
    @v_vchTextValue             NVARCHAR(100)  
      
    -------------------------------------------------------------------------  
 --  Set Resource based on detail in the Resource Detail table  
 -------------------------------------------------------------------------  
    SELECT @v_vchTextValue = RSD.value  
 FROM t_com_resource_detail RSD, t_com_resource_master RSM  
 WHERE RSM.resource_master_id = RSD.resource_master_id  
 AND RSM.resource_name = @in_vchResourceName  
 AND RSD.locale_id = @in_intLocaleID  
 AND RSM.app_id = @in_vchApplicationID  
   
 -------------------------------------------------------------------------  
 --  No Detail Records so set by Default in Master Record  
 -------------------------------------------------------------------------  
 IF @v_vchTextValue IS NULL  
 BEGIN  
   SELECT @v_vchTextValue = default_value  
  FROM t_com_resource_master RSM  
  WHERE RSM.resource_name = @in_vchResourceName  
 END  
   
 -------------------------------------------------------------------------  
 --  No Value in Master Record or No Master so Set a Default   
 -------------------------------------------------------------------------  
 IF @v_vchTextValue IS NULL  
 BEGIN  
  SELECT @v_vchTextValue = '['+ @in_vchResourceName +'] No resource configued.' 
 END  
  
-----------------------------------------------------------------------------------  
--                            Exit the Process  
-----------------------------------------------------------------------------------  
EXIT_LABEL:  
  
    -- Always leave from here.  
    select @v_vchTextValue AS value  
END
GO
/****** Object:  StoredProcedure [dbo].[usp_resource_ins_menu]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[usp_resource_ins_menu]   
(    
	 @resourceName	varchar(500),    
	 @valueEng		varchar(500),    
	 @valueThai		varchar(250),
	 @description	nvarchar(100),
	 @default		nvarchar(100)
)    
AS    
BEGIN
    
DECLARE @resourceMasterID VARCHAR(40)    
SET @resourceMasterID = NEWID()    
    
IF EXISTS (SELECT * FROM t_com_resource_master WHERE resource_name = @resourceName)
BEGIN      
	 DELETE FROM t_com_resource_detail WHERE resource_master_id in (SELECT resource_master_id FROM t_com_resource_master where resource_name = @resourceName)        
	 DELETE FROM t_com_resource_master WHERE resource_name = @resourceName        
END    
   
INSERT INTO [t_com_resource_master]    
           ([resource_master_id]    
           ,[app_id]
           ,[resource_name]    
           ,[description]    
           ,[default_value]    
           ,[create_date]    
           ,[create_by])    
     VALUES    
           (@resourceMasterID    
           ,'CC3D76CA-71B9-47CB-A933-4B1F1F489AF0'
           ,@resourceName    
           ,@description    
           ,@default    
           ,getdate()    
           ,'OGA')    
    
    
--ENG    
INSERT INTO [t_com_resource_detail]    
           ([resource_detail_id]    
           ,[resource_master_id]    
           ,[locale_id]    
           ,[value]    
           ,[create_date]    
           ,[create_by])    
     VALUES    
           (NEWID()    
           ,@resourceMasterID    
           ,'1033'    
           ,@valueEng    
           ,getdate()    
           ,'OGA')    
    
      
--THAI    
INSERT INTO [t_com_resource_detail]    
           ([resource_detail_id]    
           ,[resource_master_id]    
           ,[locale_id]    
           ,[value]    
           ,[create_date]    
           ,[create_by])    
     VALUES    
           (NEWID()    
           ,@resourceMasterID    
           ,'1054'    
           ,@valueThai    
           ,getdate()    
           ,'OGA')      
    
END    
GO
/****** Object:  StoredProcedure [dbo].[usp_resource_interface_ins]    Script Date: 08/08/2025 11:10:41 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[usp_resource_interface_ins]    
(    
 @resourceName varchar(500),    
 @valueEng varchar(500),    
 @valueThai varchar(250)    
)    
AS    
BEGIN    
    
DECLARE @resourceMasterID VARCHAR(40)    
SET @resourceMasterID = NEWID()    
    
IF((SELECT COUNT(*) FROM t_com_resource_master WHERE resource_name = @resourceName) > 0)          
BEGIN           
 DELETE FROM t_com_resource_detail WHERE resource_master_id in (SELECT resource_master_id FROM t_com_resource_master where resource_name = @resourceName)        
 DELETE FROM t_com_resource_master WHERE resource_name = @resourceName        
END    
    
INSERT INTO [t_com_resource_master]    
           ([resource_master_id]    
           ,[app_id]    
           ,[resource_name]    
           ,[description]    
           ,[default_value]    
           ,[create_date]    
           ,[create_by])    
     VALUES    
           (@resourceMasterID    
           ,'2A14C878-2292-44B0-9CE6-F791C7E9870A'    
           ,@resourceName    
           ,@valueEng    
           ,@valueEng    
           ,getdate()    
           ,'OGA')    
    
    
--ENG    
INSERT INTO [t_com_resource_detail]    
           ([resource_detail_id]    
           ,[resource_master_id]    
           ,[locale_id]    
           ,[value]    
           ,[create_date]    
           ,[create_by])    
     VALUES    
           (NEWID()    
           ,@resourceMasterID    
           ,'1033'    
           ,@valueEng    
           ,getdate()    
           ,'OGA')    
    
      
--THAI    
INSERT INTO [t_com_resource_detail]    
           ([resource_detail_id]    
           ,[resource_master_id]    
           ,[locale_id]    
           ,[value]    
           ,[create_date]    
           ,[create_by])    
     VALUES    
           (NEWID()    
           ,@resourceMasterID    
           ,'1054'    
           ,@valueThai    
           ,getdate()    
           ,'OGA')      
    
END
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Application identifier (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'app_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Application name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'application_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Long description' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'description'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Type of license for the application.  Valid Values are (SITE, USERS, ALL)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'license_type'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Number of licensed concurrent users if the license_type is USERS' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'number_of_users'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are:
YES : Active
NO : InActive
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Version number of application.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'app_version'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Datetime that install application.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'date_installed'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'security mode that has an expiry date or add expiry date to all of the security modes with an option for perpetual date.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'expiry_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Maintenance and Support Date.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'maintenance_support_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Database Server name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'db_server_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Database name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'db_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Database name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'db_user'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Database name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'db_password'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that created the record' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change the record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ON/OFF function expiry-date of license type.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_application', @level2type=N'COLUMN',@level2name=N'use_expirydate'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are :
YES : Active, 
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_combobox_item', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Version of the row. This is used for concurrency control and managing updates to the record.
Last system timestamp after change record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_combobox_item', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are :
YES : Active, 
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_country', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date and Time the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_country', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that create the record.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_country', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Version of the row. This is used for concurrency control and managing updates to the record.
Last system timestamp after change record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_country', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Stores information countries that are used for drop down lists.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_country'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Locale identifier (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'locale_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Locale name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Long description' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'description'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Global locale code. Such as 1033 equals the English (United States) locale.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'locale'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are:
YES : Active
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that created the record' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change the record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_locale', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Menu identifier (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'menu_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Application identifier (GUID) relating to t_com_application (GUID).
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'app_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Program plantform : PC, HH, WEB' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'platform'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Grouping of menu' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'menu_group'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Menu group sequence for sort' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'menu_group_sequence'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The menu id (GUID) that is parent for this menu' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'parent_menu_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Menu Name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'menu_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Menu sequence for sort' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'menu_sequence'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Execute process after access this menu' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'process'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Resource Master indentifier (GUID) relating to table t_com_resource_master. For manage menu language display.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'resource_master_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are:
YES : Active
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that created the record' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change the record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The menu table is used to list all the menus, indentifiers and their respective processes' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_menu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'primary key for  identifier' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'tran_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Employee ID number (Used to login)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'user_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Employee Name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Employee first name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'first_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Employee last name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'last_name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Password for login' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'password'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Used to set the locale for an employee. The locale determines language and decimal separator as well as date and time formats. The default value 1033 equals the English (United States) locale.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'locale_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are:
YES : Active
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Department name.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'department'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Employee’s supervisor.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'supervisor'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Employee email' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'email_address'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'This is the user’s Windows NT Domain log-in name. It is used if Windows Security is required by the customer.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'domain_user_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'This is the name of the user’s Windows NT domain.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'domain'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that created the record' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Transaction identifier (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'tran_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Application identifier (GUID) relating to t_com_application (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'app_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID relating to t_com_user' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'user_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'The Group of User' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'user_group_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that created the record' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change the record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Stores user applications that the user is allowed to access' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_application'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User Group identifier (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group', @level2type=N'COLUMN',@level2name=N'user_group_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Application identifier (GUID) relating to table :  t_com_application (GUID)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group', @level2type=N'COLUMN',@level2name=N'app_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User Group Name' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group', @level2type=N'COLUMN',@level2name=N'name'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Long description' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group', @level2type=N'COLUMN',@level2name=N'description'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are:
YES : Active
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change the record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User Group ID (GUID) relating to table : t_com_user_group' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu', @level2type=N'COLUMN',@level2name=N'user_group_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Menu ID (GUID) from table : t_com_menu
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu', @level2type=N'COLUMN',@level2name=N'menu_id'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valid values are:
YES : Active
NO : InActive' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu', @level2type=N'COLUMN',@level2name=N'is_active'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu', @level2type=N'COLUMN',@level2name=N'create_date'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID of the person that created the record' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu', @level2type=N'COLUMN',@level2name=N'create_by'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Last system timestamp after change the record data.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu', @level2type=N'COLUMN',@level2name=N'rowversion'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Stores relating data between User Group and working function for this Group' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N't_com_user_group_menu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ใช้สำหรับตรวจสอบสิทธิ์ของ User' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_authenticate'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[31] 4[34] 2[3] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "t_com_user"
            Begin Extent = 
               Top = 13
               Left = 117
               Bottom = 222
               Right = 273
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_user_application"
            Begin Extent = 
               Top = 6
               Left = 339
               Bottom = 212
               Right = 607
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
      Begin ColumnWidths = 9
         Width = 284
         Width = 1500
         Width = 1500
         Width = 3330
         Width = 1500
         Width = 3285
         Width = 1500
         Width = 1500
         Width = 1500
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1920
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_authenticate'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_authenticate'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[22] 4[19] 2[18] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = -96
         Left = 0
      End
      Begin Tables = 
         Begin Table = "t_com_resource_detail"
            Begin Extent = 
               Top = 23
               Left = 809
               Bottom = 216
               Right = 993
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_resource_master"
            Begin Extent = 
               Top = 14
               Left = 515
               Bottom = 133
               Right = 699
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_user_group_menu"
            Begin Extent = 
               Top = 6
               Left = 38
               Bottom = 211
               Right = 198
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_menu"
            Begin Extent = 
               Top = 17
               Left = 267
               Bottom = 180
               Right = 468
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
      Begin ColumnWidths = 16
         Width = 284
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 3345
         Width = 1500
         Width = 1500
         Width = 8040
         Width = 8040
         Width = 1500
         Width = 2085
         Width = 2085
         Width = 1500
         Width = 1500
         Width = 1500
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 3540
         Alias = 1560
         Table = 2055
         Output = 720
         Append' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_by_menu_group'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane2', @value=N' = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_by_menu_group'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=2 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_by_menu_group'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[40] 4[20] 2[20] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "t_com_resource_detail"
            Begin Extent = 
               Top = 21
               Left = 624
               Bottom = 189
               Right = 808
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_resource_master"
            Begin Extent = 
               Top = 7
               Left = 328
               Bottom = 190
               Right = 512
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_menu"
            Begin Extent = 
               Top = 6
               Left = 38
               Bottom = 125
               Right = 239
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
      Begin ColumnWidths = 17
         Width = 284
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 2775
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_childmenu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_childmenu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[42] 4[22] 2[7] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = -96
         Left = 0
      End
      Begin Tables = 
         Begin Table = "t_com_resource_detail"
            Begin Extent = 
               Top = 41
               Left = 837
               Bottom = 182
               Right = 1021
            End
            DisplayFlags = 280
            TopColumn = 2
         End
         Begin Table = "t_com_resource_master"
            Begin Extent = 
               Top = 10
               Left = 440
               Bottom = 198
               Right = 711
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_menu"
            Begin Extent = 
               Top = 6
               Left = 38
               Bottom = 216
               Right = 239
            End
            DisplayFlags = 280
            TopColumn = 2
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
      Begin ColumnWidths = 18
         Width = 284
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 1500
         Width = 2145
         Width = 1500
         Width = 8040
         Width = 1500
         Width = 1500
         Width = 1995
         Width = 1500
         Width = 1965
         Width = 1500
         Width = 1500
         Width = 1500
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1905
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_only_rootmenu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_authen_only_rootmenu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ใช้สำหรับดึง Menu ตาม User Group' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_menu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[43] 4[15] 2[9] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = -96
         Left = 0
      End
      Begin Tables = 
         Begin Table = "t_com_user_group_menu"
            Begin Extent = 
               Top = 13
               Left = 126
               Bottom = 214
               Right = 387
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_menu"
            Begin Extent = 
               Top = 2
               Left = 503
               Bottom = 219
               Right = 696
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_resource_master"
            Begin Extent = 
               Top = 4
               Left = 803
               Bottom = 136
               Right = 987
            End
            DisplayFlags = 280
            TopColumn = 1
         End
         Begin Table = "t_com_resource_detail"
            Begin Extent = 
               Top = 40
               Left = 1049
               Bottom = 194
               Right = 1233
            End
            DisplayFlags = 280
            TopColumn = 0
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
      Begin ColumnWidths = 13
         Width = 284
         Width = 3405
         Width = 3405
         Width = 3285
         Width = 1500
         Width = 1500
         Width = 1875
         Width = 3330
         Width = 1500
         Width = 1500
         Width = 5295
         Width = 3405
         Width = 1500
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 2505
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
        ' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_menu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane2', @value=N' SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_menu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=2 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_get_menu'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPane1', @value=N'[0E232FF0-B466-11cf-A24F-00AA00A3EFFF, 1.00]
Begin DesignProperties = 
   Begin PaneConfigurations = 
      Begin PaneConfiguration = 0
         NumPanes = 4
         Configuration = "(H (1[34] 4[27] 2[21] 3) )"
      End
      Begin PaneConfiguration = 1
         NumPanes = 3
         Configuration = "(H (1 [50] 4 [25] 3))"
      End
      Begin PaneConfiguration = 2
         NumPanes = 3
         Configuration = "(H (1 [50] 2 [25] 3))"
      End
      Begin PaneConfiguration = 3
         NumPanes = 3
         Configuration = "(H (4 [30] 2 [40] 3))"
      End
      Begin PaneConfiguration = 4
         NumPanes = 2
         Configuration = "(H (1 [56] 3))"
      End
      Begin PaneConfiguration = 5
         NumPanes = 2
         Configuration = "(H (2 [66] 3))"
      End
      Begin PaneConfiguration = 6
         NumPanes = 2
         Configuration = "(H (4 [50] 3))"
      End
      Begin PaneConfiguration = 7
         NumPanes = 1
         Configuration = "(V (3))"
      End
      Begin PaneConfiguration = 8
         NumPanes = 3
         Configuration = "(H (1[56] 4[18] 2) )"
      End
      Begin PaneConfiguration = 9
         NumPanes = 2
         Configuration = "(H (1 [75] 4))"
      End
      Begin PaneConfiguration = 10
         NumPanes = 2
         Configuration = "(H (1[66] 2) )"
      End
      Begin PaneConfiguration = 11
         NumPanes = 2
         Configuration = "(H (4 [60] 2))"
      End
      Begin PaneConfiguration = 12
         NumPanes = 1
         Configuration = "(H (1) )"
      End
      Begin PaneConfiguration = 13
         NumPanes = 1
         Configuration = "(V (4))"
      End
      Begin PaneConfiguration = 14
         NumPanes = 1
         Configuration = "(V (2))"
      End
      ActivePaneConfig = 0
   End
   Begin DiagramPane = 
      Begin Origin = 
         Top = 0
         Left = 0
      End
      Begin Tables = 
         Begin Table = "t_com_application"
            Begin Extent = 
               Top = 2
               Left = 362
               Bottom = 121
               Right = 548
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_user_device"
            Begin Extent = 
               Top = 3
               Left = 26
               Bottom = 219
               Right = 189
            End
            DisplayFlags = 280
            TopColumn = 0
         End
         Begin Table = "t_com_user"
            Begin Extent = 
               Top = 122
               Left = 363
               Bottom = 276
               Right = 547
            End
            DisplayFlags = 280
            TopColumn = 10
         End
      End
   End
   Begin SQLPane = 
   End
   Begin DataPane = 
      Begin ParameterDefaults = ""
      End
   End
   Begin CriteriaPane = 
      Begin ColumnWidths = 11
         Column = 1440
         Alias = 900
         Table = 1170
         Output = 720
         Append = 1400
         NewValue = 1170
         SortType = 1350
         SortOrder = 1410
         GroupBy = 1350
         Filter = 1350
         Or = 1350
         Or = 1350
         Or = 1350
      End
   End
End
' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_user_logon'
GO
EXEC sys.sp_addextendedproperty @name=N'MS_DiagramPaneCount', @value=1 , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'VIEW',@level1name=N'v_com_user_logon'
GO
