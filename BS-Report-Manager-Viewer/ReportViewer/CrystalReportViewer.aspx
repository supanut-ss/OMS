<%@ Page Title="Crystal Report Viewer" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true"
    CodeBehind="CrystalReportViewer.aspx.cs" Inherits="ReportViewer.CrystalReportViewerPage" %>
    <%@ Register Assembly="CrystalDecisions.Web, Version=13.0.4000.0, Culture=neutral, PublicKeyToken=692fbea5521e1304"
        Namespace="CrystalDecisions.Web" TagPrefix="CR" %>

        <asp:Content ID="HeadContent" ContentPlaceHolderID="HeadContent" runat="server">
        </asp:Content>

        <asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">
            <asp:Panel ID="pnlError" runat="server" Visible="false" CssClass="alert-box">
                <span class="alert-icon">&#x26A0;</span>
                <span class="alert-text">
                    <asp:Label ID="lblError" runat="server" ForeColor="Red" />
                </span>
            </asp:Panel>

            <div class="report-container">
                <CR:CrystalReportViewer ID="CrystalReportViewer1" runat="server" AutoDataBind="true"
                    HasCrystalLogo="false" HasDrillUpButton="true" HasToggleGroupTreeButton="true"
                    HasToggleParameterPanelButton="true" HasViewList="true" HasExportButton="true" HasPrintButton="true"
                    HasRefreshButton="true" HasZoomFactorList="true" ToolPanelView="None" Width="100%" Height="100%"
                    EnableDatabaseLogonPrompt="false" EnableParameterPrompt="false" PrintMode="ActiveX" />
            </div>
        </asp:Content>