<%@ Page Title="BS Report Viewer" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true"
    CodeBehind="Default.aspx.cs" Inherits="ReportViewer.Default" %>

    <asp:Content ID="HeadContent" ContentPlaceHolderID="HeadContent" runat="server">
    </asp:Content>

    <asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">
        <asp:Panel ID="pnlError" runat="server" Visible="false" CssClass="alert-box">
            <span class="alert-icon">&#x26A0;</span>
            <span class="alert-text">
                <asp:Label ID="lblError" runat="server" />
            </span>
        </asp:Panel>

        <asp:Panel ID="pnlLanding" runat="server" CssClass="landing">
            <h1>&#x1F4CA; BS Report Viewer</h1>
            <p class="subtitle">Web Report Viewer for Crystal Report, RDLC and SSRS</p>

            <div class="report-types">
                <div class="report-card">
                    <div class="card-icon">&#x1F48E;</div>
                    <h3>Crystal Report</h3>
                    <p>View .rpt reports with SAP Crystal Report Viewer</p>
                </div>
                <div class="report-card">
                    <div class="card-icon">&#x1F4CB;</div>
                    <h3>RDLC Report</h3>
                    <p>View .rdlc reports with Microsoft Report Viewer</p>
                </div>
                <div class="report-card">
                    <div class="card-icon">&#x1F310;</div>
                    <h3>SSRS Report</h3>
                    <p>View reports from SQL Server Reporting Services</p>
                </div>
            </div>
        </asp:Panel>
    </asp:Content>