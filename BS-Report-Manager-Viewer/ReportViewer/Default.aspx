<%@ Page Title="BS Report Viewer" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true"
    CodeBehind="Default.aspx.cs" Inherits="ReportViewer.Default" %>

    <asp:Content ID="HeadContent" ContentPlaceHolderID="HeadContent" runat="server">
        <style>
            /* File Manager Styles */
            .file-manager {
                max-width: 1200px;
                margin: 30px auto;
                padding: 0 20px;
            }

            .file-manager h2 {
                font-size: 22px;
                color: #1a237e;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .section-tabs {
                display: flex;
                gap: 0;
                margin-bottom: 0;
            }

            .section-tab-wrap {
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .section-tab {
                display: inline-block;
                padding: 10px 24px;
                background: #e8eaf6;
                color: #3949ab;
                font-weight: 600;
                font-size: 14px;
                border: 1px solid #c5cae9;
                border-bottom: none;
                border-radius: 8px 8px 0 0;
                cursor: pointer;
                transition: background 0.2s;
                text-decoration: none;
            }

            .section-tab:hover {
                background: #c5cae9;
            }

            .section-tab.active {
                background: #fff;
                color: #1a237e;
                border-bottom: 2px solid #fff;
                margin-bottom: -1px;
                z-index: 1;
            }

            .tab-content {
                background: #fff;
                border: 1px solid #c5cae9;
                border-radius: 0 8px 8px 8px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            }

            .file-table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }

            .file-table th {
                background: #e8eaf6;
                color: #283593;
                font-weight: 600;
                padding: 10px 12px;
                text-align: left;
                border-bottom: 2px solid #c5cae9;
                white-space: nowrap;
            }

            .file-table td {
                padding: 8px 12px;
                border-bottom: 1px solid #f0f0f0;
                vertical-align: middle;
            }

            .file-table tr:hover td {
                background: #f5f7ff;
            }

            .file-table .col-name {
                min-width: 250px;
            }

            .file-table .col-ext {
                width: 80px;
                text-align: center;
            }

            .file-table .col-size {
                width: 100px;
                text-align: right;
            }

            .file-table .col-date {
                width: 160px;
            }

            .file-table .col-action {
                width: 140px;
                text-align: center;
            }

            .file-icon {
                margin-right: 6px;
            }

            .btn-download,
            .btn-upload-trigger {
                display: inline-block;
                padding: 5px 14px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                border: none;
                transition: all 0.2s;
            }

            .btn-download {
                background: #e3f2fd;
                color: #1565c0;
                border: 1px solid #90caf9;
            }

            .btn-download:hover {
                background: #bbdefb;
            }

            .ext-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
            }

            .ext-rpt {
                background: #e8f5e9;
                color: #2e7d32;
            }

            .ext-rdlc {
                background: #e3f2fd;
                color: #1565c0;
            }

            /* Upload Section */
            .upload-section {
                margin-top: 16px;
                padding: 16px;
                background: #fafafa;
                border: 2px dashed #c5cae9;
                border-radius: 8px;
                text-align: center;
            }

            .upload-section p {
                font-size: 13px;
                color: #666;
                margin-bottom: 10px;
            }

            .btn-upload {
                display: inline-block;
                padding: 8px 20px;
                background: linear-gradient(135deg, #1a237e, #3949ab);
                color: #fff;
                border: none;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-upload:hover {
                opacity: 0.9;
                transform: translateY(-1px);
            }

            .upload-result {
                margin-top: 10px;
                font-size: 13px;
                padding: 8px;
                border-radius: 4px;
            }

            .upload-success {
                background: #e8f5e9;
                color: #2e7d32;
            }

            .upload-error {
                background: #ffebee;
                color: #c62828;
            }

            .empty-state {
                text-align: center;
                padding: 30px;
                color: #999;
                font-size: 14px;
            }

            .empty-state .empty-icon {
                font-size: 40px;
                margin-bottom: 10px;
            }

            .file-count {
                font-size: 12px;
                color: #999;
                font-weight: 400;
                margin-left: 8px;
            }
        </style>
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

        <!-- Report File Manager -->
        <asp:Panel ID="pnlFileManager" runat="server" Visible="false">
            <div class="file-manager">
                <h2>&#x1F4C1; Report File Manager</h2>

                <div class="section-tabs">
                    <asp:LinkButton ID="tabRpt" runat="server" CssClass="section-tab active" OnClick="tabRpt_Click"
                        CausesValidation="false" />
                    <asp:LinkButton ID="tabRdlc" runat="server" CssClass="section-tab" OnClick="tabRdlc_Click"
                        CausesValidation="false" />
                </div>

                <!-- RPT Tab -->
                <asp:Panel ID="pnlRptTab" runat="server" CssClass="tab-content">
                    <asp:Repeater ID="rptRptFiles" runat="server">
                        <HeaderTemplate>
                            <table class="file-table">
                                <thead>
                                    <tr>
                                        <th class="col-name">File Name</th>
                                        <th class="col-ext">Type</th>
                                        <th class="col-size">Size</th>
                                        <th class="col-date">Last Modified</th>
                                        <th class="col-action">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                        </HeaderTemplate>
                        <ItemTemplate>
                            <tr>
                                <td class="col-name">
                                    <span class="file-icon">&#x1F4C4;</span>
                                    <%# Eval("Name") %>
                                </td>
                                <td class="col-ext">
                                    <span class="ext-badge ext-rpt">
                                        <%# Eval("Extension") %>
                                    </span>
                                </td>
                                <td class="col-size">
                                    <%# Eval("SizeDisplay") %>
                                </td>
                                <td class="col-date">
                                    <%# Eval("LastModified", "{0:dd/MM/yyyy HH:mm}" ) %>
                                </td>
                                <td class="col-action">
                                    <a class="btn-download"
                                        href='ReportFileHandler.ashx?action=download&type=rpt&file=<%# HttpUtility.UrlEncode(Eval("Name").ToString()) %>'>
                                        &#x2B07; Download
                                    </a>
                                </td>
                            </tr>
                        </ItemTemplate>
                        <FooterTemplate>
                            </tbody>
                            </table>
                        </FooterTemplate>
                    </asp:Repeater>
                    <asp:Panel ID="pnlRptEmpty" runat="server" Visible="false" CssClass="empty-state">
                        <div class="empty-icon">&#x1F4C2;</div>
                        <p>No .rpt files found in the report folder</p>
                    </asp:Panel>

                    <!-- Upload RPT -->
                    <div class="upload-section">
                        <p>Upload .rpt file to server (will replace if file with same name exists)</p>
                        <asp:FileUpload ID="fuRptUpload" runat="server" accept=".rpt" />
                        <asp:Button ID="btnUploadRpt" runat="server" Text="&#x2B06; Upload RPT" CssClass="btn-upload"
                            OnClick="btnUploadRpt_Click" CausesValidation="false" />
                        <asp:Panel ID="pnlRptUploadResult" runat="server" Visible="false">
                            <asp:Label ID="lblRptUploadResult" runat="server" />
                        </asp:Panel>
                    </div>
                </asp:Panel>

                <!-- RDLC Tab -->
                <asp:Panel ID="pnlRdlcTab" runat="server" CssClass="tab-content" Visible="false">
                    <asp:Repeater ID="rptRdlcFiles" runat="server">
                        <HeaderTemplate>
                            <table class="file-table">
                                <thead>
                                    <tr>
                                        <th class="col-name">File Name</th>
                                        <th class="col-ext">Type</th>
                                        <th class="col-size">Size</th>
                                        <th class="col-date">Last Modified</th>
                                        <th class="col-action">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                        </HeaderTemplate>
                        <ItemTemplate>
                            <tr>
                                <td class="col-name">
                                    <span class="file-icon">&#x1F4C4;</span>
                                    <%# Eval("Name") %>
                                </td>
                                <td class="col-ext">
                                    <span class="ext-badge ext-rdlc">
                                        <%# Eval("Extension") %>
                                    </span>
                                </td>
                                <td class="col-size">
                                    <%# Eval("SizeDisplay") %>
                                </td>
                                <td class="col-date">
                                    <%# Eval("LastModified", "{0:dd/MM/yyyy HH:mm}" ) %>
                                </td>
                                <td class="col-action">
                                    <a class="btn-download"
                                        href='ReportFileHandler.ashx?action=download&type=rdlc&file=<%# HttpUtility.UrlEncode(Eval("Name").ToString()) %>'>
                                        &#x2B07; Download
                                    </a>
                                </td>
                            </tr>
                        </ItemTemplate>
                        <FooterTemplate>
                            </tbody>
                            </table>
                        </FooterTemplate>
                    </asp:Repeater>
                    <asp:Panel ID="pnlRdlcEmpty" runat="server" Visible="false" CssClass="empty-state">
                        <div class="empty-icon">&#x1F4C2;</div>
                        <p>No .rdlc files found in the report folder</p>
                    </asp:Panel>

                    <!-- Upload RDLC -->
                    <div class="upload-section">
                        <p>Upload .rdlc file to server (will replace if file with same name exists)</p>
                        <asp:FileUpload ID="fuRdlcUpload" runat="server" accept=".rdlc" />
                        <asp:Button ID="btnUploadRdlc" runat="server" Text="&#x2B06; Upload RDLC" CssClass="btn-upload"
                            OnClick="btnUploadRdlc_Click" CausesValidation="false" />
                        <asp:Panel ID="pnlRdlcUploadResult" runat="server" Visible="false">
                            <asp:Label ID="lblRdlcUploadResult" runat="server" />
                        </asp:Panel>
                    </div>
                </asp:Panel>
            </div>
        </asp:Panel>
    </asp:Content>