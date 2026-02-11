<%@ Page Title="SSRS Report Viewer" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true"
    CodeBehind="SsrsReportViewer.aspx.cs" Inherits="ReportViewer.SsrsReportViewerPage" %>
    <%@ Register
        Assembly="Microsoft.ReportViewer.WebForms, Version=15.0.0.0, Culture=neutral, PublicKeyToken=89845dcd8080cc91"
        Namespace="Microsoft.Reporting.WebForms" TagPrefix="rsweb" %>

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
                <rsweb:ReportViewer ID="SsrsReportViewer1" runat="server" Width="100%" Height="100%"
                    ProcessingMode="Remote" ShowExportControls="true" ShowPrintButton="true" ShowZoomControl="true"
                    ShowFindControls="true" ShowRefreshButton="true" AsyncRendering="false"
                    SizeToReportContent="true" />
            </div>
        </asp:Content>