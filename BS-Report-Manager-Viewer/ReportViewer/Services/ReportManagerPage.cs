namespace ReportViewer.Services
{
    public static class ReportManagerPage
    {
        public static string Html => """
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BS Report Viewer</title>
  <style>
    :root {
      color-scheme: dark;
      --bg-a: #050b19;
      --bg-b: #071125;
      --panel: rgba(14, 25, 54, .82);
      --panel-2: rgba(8, 17, 39, .74);
      --surface: rgba(8, 16, 36, .70);
      --line: rgba(132, 165, 255, .22);
      --line-strong: rgba(91, 124, 255, .72);
      --text: #f7f8ff;
      --muted: #aeb9d4;
      --purple: #8158ff;
      --blue: #39a9ff;
      --green: #35d86d;
      --danger: #ff5a7a;
      --shadow: rgba(0, 0, 0, .30);
    }
    body.light {
      color-scheme: light;
      --bg-a: #f5f7ff;
      --bg-b: #eaf0ff;
      --panel: rgba(255, 255, 255, .86);
      --panel-2: rgba(255, 255, 255, .82);
      --surface: rgba(246, 248, 255, .92);
      --line: rgba(63, 84, 130, .18);
      --line-strong: rgba(83, 102, 210, .55);
      --text: #111827;
      --muted: #59657f;
      --shadow: rgba(30, 41, 59, .13);
    }
    * { box-sizing: border-box; }
    
    /* Custom Scrollbar Styles */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.02);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(129, 88, 255, 0.22);
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.2s ease;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(129, 88, 255, 0.42);
      border-color: rgba(255, 255, 255, 0.1);
    }
    ::-webkit-scrollbar-thumb:active {
      background: var(--purple);
    }
    
    /* Firefox scrollbar compatibility */
    * {
      scrollbar-width: thin;
      scrollbar-color: rgba(129, 88, 255, 0.22) rgba(255, 255, 255, 0.02);
    }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at 78% 20%, rgba(129, 88, 255, .24), transparent 28%),
        radial-gradient(circle at 14% 88%, rgba(57, 169, 255, .16), transparent 30%),
        linear-gradient(180deg, var(--bg-a) 0%, var(--bg-b) 56%, var(--bg-a) 100%);
      color: var(--text);
      min-height: 100vh;
    }
    button, input, select { font: inherit; }
    .icon { width: 20px; height: 20px; display: inline-block; vertical-align: middle; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .icon.fill { fill: currentColor; stroke: none; }
    .topbar {
      height: 78px;
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      background: color-mix(in srgb, var(--bg-a) 72%, transparent);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 2;
    }
    .brand { display: flex; align-items: center; gap: 16px; font-weight: 800; font-size: 22px; }
    .logo, .square-icon, .hero-icon, .upload-icon, .pkg-icon, .file-dot {
      display: grid;
      place-items: center;
      flex: 0 0 auto;
    }
    .logo {
      width: 42px; height: 42px; border-radius: 9px;
      background: linear-gradient(135deg, #6f4bff, #2d6bff);
      box-shadow: 0 14px 30px rgba(86, 69, 255, .35);
      color: white;
    }
    .top-actions { display: flex; gap: 10px; align-items: center; }
    .shell { width: min(1380px, calc(100% - 56px)); margin: 0 auto; }
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(340px, .85fr);
      gap: 44px;
      align-items: center;
      padding: 56px 0 28px;
    }
    h1 { margin: 0; font-size: clamp(40px, 5vw, 64px); line-height: 1; letter-spacing: 0; }
    h1 span { color: #9b6cff; }
    .subtitle { color: var(--muted); font-size: 18px; margin: 18px 0 28px; }
    .hero-link {
      width: min(480px, 100%);
      display: flex; align-items: center; gap: 20px;
      border: 1px solid var(--line-strong);
      background: linear-gradient(135deg, rgba(38, 67, 140, .32), rgba(14, 24, 57, .30));
      box-shadow: 0 0 34px rgba(72, 91, 255, .16);
      border-radius: 12px;
      padding: 22px;
    }
    .hero-icon, .upload-icon {
      width: 58px; height: 58px; border-radius: 12px;
      background: linear-gradient(135deg, rgba(57, 169, 255, .28), rgba(129, 88, 255, .34));
      color: var(--green);
    }
    .hero-art {
      min-height: 270px;
      position: relative;
      border-radius: 16px;
      background:
        linear-gradient(160deg, rgba(31, 48, 94, .64), rgba(16, 26, 57, .38)),
        radial-gradient(circle at 64% 28%, rgba(132, 84, 255, .30), transparent 30%);
      border: 1px solid rgba(137, 161, 255, .22);
      box-shadow: 0 26px 80px var(--shadow);
      overflow: hidden;
      transform: perspective(900px) rotateY(-8deg) rotateX(2deg);
    }
    body.light .hero-art { background: linear-gradient(160deg, rgba(230, 236, 255, .95), rgba(216, 226, 255, .72)); }
    
    /* Mockup window styles */
    .window-bar {
      height: 32px;
      border-bottom: 1px solid rgba(139, 161, 255, .1);
      background: rgba(8, 17, 39, .6);
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
      position: relative;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot.close { background: #ff5f56; }
    .dot.minimize { background: #ffbd2e; }
    .dot.maximize { background: #27c93f; }
    .window-title {
      font-size: 11px;
      color: var(--muted);
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .dash-grid {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      height: calc(100% - 32px);
    }
    .dash-chart-card {
      height: 110px;
      border-radius: 10px;
      border: 1px solid rgba(139, 161, 255, .15);
      background: var(--surface);
      overflow: hidden;
      padding: 10px;
      position: relative;
    }
    .dash-svg {
      width: 100%;
      height: 100%;
    }
    .dash-bottom {
      display: grid;
      grid-template-columns: 1fr 1.25fr;
      gap: 16px;
    }
    .dash-card {
      height: 84px;
      border-radius: 10px;
      border: 1px solid rgba(139, 161, 255, .15);
      background: var(--surface);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }
    .dash-card-label {
      font-size: 10px;
      color: var(--muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .dash-card-val {
      font-size: 20px;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .dash-trend {
      font-size: 11px;
      color: var(--green);
      font-weight: 700;
    }
    .dash-card-spark {
      margin-top: 2px;
    }
    .dash-card.donut-card {
      flex-direction: row;
      align-items: center;
      gap: 14px;
      padding: 10px 16px;
    }
    .donut-container {
      position: relative;
      width: 52px;
      height: 52px;
      flex-shrink: 0;
    }
    .donut-svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .donut-text {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 800;
      color: var(--text);
    }
    .donut-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .dash-status {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      display: inline-block;
      animation: pulse 1.8s infinite alternate;
    }
    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.6; }
      100% { transform: scale(1.2); opacity: 1; }
    }
    
    /* Layout */
    .main-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 380px;
      gap: 28px;
      margin-bottom: 28px;
      align-items: start;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 18px 60px var(--shadow);
      padding: 26px;
    }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
    .title { display: flex; align-items: center; gap: 14px; }
    .title h2 { margin: 0; font-size: 22px; }
    .title p { margin: 4px 0 0; color: var(--muted); }
    .toolbar { display: flex; gap: 12px; align-items: center; }
    .search, .filter {
      height: 46px; border-radius: 10px; color: var(--text);
      border: 1px solid var(--line);
      background: var(--surface);
      padding: 0 14px;
    }
    .search { width: 200px; }
    .filter { min-width: 120px; }

    /* Summary Bar */
    .list-summary-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 16px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 16px;
    }
    .list-summary {
      font-size: 14px;
      color: var(--muted);
    }
    .list-summary span {
      color: var(--text);
      font-weight: 700;
    }
    .list-summary-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .list-summary-actions .btn.active {
      background: rgba(129, 88, 255, 0.15);
      border-color: var(--purple);
      color: var(--text);
    }

    /* Grid View styling */
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
      margin-bottom: 16px;
    }
    .pkg-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel-2);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 4px 20px var(--shadow);
      transition: all 0.2s ease;
    }
    .pkg-card:hover {
      border-color: var(--line-strong);
      transform: translateY(-2px);
    }
    .pkg-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .pkg-card-icon {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6f4bff, #4127b9);
      color: white;
      display: grid;
      place-items: center;
    }
    .pkg-card-body {
      flex: 1;
    }
    .pkg-card-name {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: 800;
      color: var(--text);
      text-overflow: ellipsis;
      overflow: hidden;
      white-space: nowrap;
    }
    .pkg-card-meta {
      margin: 0;
      font-size: 13px;
      color: var(--muted);
    }
    .pkg-card-date {
      margin: 8px 0 0;
      font-size: 11px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pkg-card-actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
    }
    .pkg-card-actions .btn {
      flex: 1;
      height: 38px;
      min-height: 38px;
      padding: 0 10px;
      font-size: 13px;
    }

    /* Quick Actions */
    .quick-actions-title {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text);
    }
    .quick-actions-card {
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-shadow: 0 18px 60px var(--shadow);
    }
    .quick-actions-header {
      display: flex;
      gap: 14px;
      align-items: center;
    }
    .quick-actions-icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(129, 88, 255, 0.15);
      color: var(--purple);
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }
    .quick-actions-subtitle {
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
    }
    .quick-actions-desc {
      font-size: 12px;
      color: var(--muted);
      margin: 4px 0 0;
      line-height: 1.4;
    }
    
    .upload-box {
      border: 1px dashed rgba(129, 88, 255, 0.5);
      border-radius: 10px;
      background: rgba(8, 17, 39, 0.4);
      padding: 32px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    .upload-box.drag {
      border-color: var(--green);
      background: rgba(53, 216, 109, 0.08);
    }
    .upload-box input {
      display: none;
    }
    .upload-box-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(129, 88, 255, 0.1);
      color: var(--text);
      display: grid;
      place-items: center;
    }
    .upload-box-text {
      font-size: 13px;
      color: var(--text);
      font-weight: 500;
    }
    .upload-box-divider {
      display: flex;
      align-items: center;
      text-align: center;
      width: 100%;
      color: var(--muted);
      font-size: 11px;
    }
    .upload-box-divider::before, .upload-box-divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--line);
    }
    .upload-box-divider:not(:empty)::before {
      margin-right: .8em;
    }
    .upload-box-divider:not(:empty)::after {
      margin-left: .8em;
    }
    .quick-actions-footer {
      font-size: 11px;
      color: var(--muted);
      text-align: center;
    }

    .package {
      border: 1px solid var(--line-strong);
      border-radius: 12px;
      background: var(--panel-2);
      margin-bottom: 16px;
      overflow: hidden;
    }
    .package-top {
      display: grid;
      grid-template-columns: 36px 58px minmax(0, 1fr) minmax(180px, auto) auto;
      gap: 16px; align-items: center;
      padding: 18px 26px;
    }
    .date { white-space: nowrap; }
    .chev { width: 36px; height: 36px; border: 0; background: transparent; color: var(--text); cursor: pointer; display: grid; place-items: center; }
    .pkg-icon, .square-icon {
      width: 58px; height: 58px; border-radius: 12px;
      background: linear-gradient(135deg, #6f4bff, #4127b9);
      color: white;
    }
    .square-icon { width: 42px; height: 42px; border-radius: 9px; }
    .pkg-name { font-size: 18px; font-weight: 800; }
    .pkg-meta { color: var(--muted); margin-top: 6px; }
    .label { color: var(--muted); font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .actions { display: flex; gap: 10px; justify-content: flex-end; }
    .btn {
      min-height: 40px; border-radius: 9px; border: 1px solid var(--line);
      background: var(--surface);
      color: var(--text);
      padding: 0 15px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn.icon-only { width: 42px; padding: 0; }
    .btn.primary { background: linear-gradient(135deg, #6446ff, #3d54ff); border-color: transparent; color: white; font-weight: 700; }
    .btn.danger { color: #ffdbe3; border-color: rgba(255, 90, 122, .38); }
    body.light .btn.danger { color: #b42342; }
    .files { margin: 0 26px 18px; border: 1px solid rgba(139, 161, 255, .14); border-radius: 12px; overflow-x: auto; overflow-y: hidden; }
    .row { display: grid; grid-template-columns: minmax(280px, 1.2fr) 100px minmax(150px, 1fr) 90px 310px; min-width: 1000px; gap: 16px; align-items: center; padding: 14px 24px; border-top: 1px solid rgba(139, 161, 255, .12); }
    .row:first-child { border-top: 0; }
    .head { color: var(--muted); font-size: 12px; text-transform: uppercase; background: rgba(255,255,255,.035); }
    body.light .head { background: rgba(30, 41, 59, .035); }
    .file-name { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .file-text { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; flex: 1; min-width: 0; }
    .file-dot { width: 34px; height: 34px; border-radius: 8px; background: rgba(53, 216, 109, .15); color: var(--green); flex: 0 0 auto; }
    .file-size { color: var(--muted); text-align: right; white-space: nowrap; padding-right: 10px; }
    .file-actions { min-width: 0; justify-content: flex-start; }
    .file-actions .btn { flex: 0 0 auto; }
    .badge { display: inline-flex; justify-content: center; min-width: 82px; padding: 7px 12px; border-radius: 8px; border: 1px solid rgba(57, 169, 255, .38); color: #63c1ff; font-weight: 800; font-size: 12px; }
    .badge.JRXML { color: #b189ff; border-color: rgba(177, 137, 255, .38); }
    .badge.JSON { color: #35d86d; border-color: rgba(53, 216, 109, .38); }
    body.light .badge.JSON { color: #12813e; }
    
    .toast {
      position: fixed; right: 22px; bottom: 22px;
      max-width: 460px; border-radius: 10px;
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 14px 16px;
      box-shadow: 0 18px 50px var(--shadow);
      display: none;
      z-index: 5;
    }
    .empty { color: var(--muted); padding: 30px; text-align: center; }
    
    @media (max-width: 1024px) {
      .main-layout { grid-template-columns: 1fr; }
    }

    @media (max-width: 980px) {
      .hero { grid-template-columns: 1fr; }
      .hero-art { display: none; }
      .panel-head, .toolbar { flex-direction: column; align-items: stretch; }
      .search { width: 100%; }
      .package-top { grid-template-columns: 36px 56px 1fr; }
      .package-top .date, .package-top .actions { grid-column: 3; justify-content: flex-start; }
      .row { grid-template-columns: 1fr; min-width: 0; }
      .head { display: none; }
      .list-summary-bar { flex-direction: column; align-items: flex-start; }
    }
  </style>
</head>

<body>
  <svg aria-hidden="true" width="0" height="0" style="position:absolute">
    <symbol id="i-bar-chart" viewBox="0 0 24 24"><rect x="4" y="10" width="3" height="8" rx="1"/><rect x="10.5" y="5" width="3" height="13" rx="1"/><rect x="17" y="8" width="3" height="10" rx="1"/></symbol>
    <symbol id="i-leaf" viewBox="0 0 24 24"><path d="M5 20c7-1 13-7 14-15C11 6 5 12 5 20Z"/><path d="M5 20 15 10"/></symbol>
    <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></symbol>
    <symbol id="i-package" viewBox="0 0 24 24"><path d="m3 7 9 5 9-5"/><path d="M12 22V12"/><path d="M21 7v10l-9 5-9-5V7l9-5Z"/></symbol>
    <symbol id="i-file" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h6"/></symbol>
    <symbol id="i-upload" viewBox="0 0 24 24"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16.5A4.5 4.5 0 0 1 15.5 21h-7A5.5 5.5 0 0 1 7 10.2"/></symbol>
    <symbol id="i-refresh" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.4 6.4"/><path d="M3 12A9 9 0 0 1 18.4 5.6"/><path d="M18 2v4h4"/><path d="M6 22v-4H2"/></symbol>
    <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></symbol>
    <symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></symbol>
    <symbol id="i-chevron-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
    <symbol id="i-chevron-right" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
    <symbol id="i-eye" viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></symbol>
    <symbol id="i-download" viewBox="0 0 24 24"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/></symbol>
    <symbol id="i-bolt" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></symbol>
    <symbol id="i-upload-small" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></symbol>
    <symbol id="i-list-view" viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></symbol>
    <symbol id="i-grid-view" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></symbol>
  </svg>

  <div class="topbar">
    <div class="brand"><div class="logo"><svg class="icon fill"><use href="#i-bar-chart"></use></svg></div> BS Report Viewer</div>
    <div class="top-actions">
      <button id="themeButton" class="btn icon-only" onclick="toggleTheme()" title="Switch theme"><svg class="icon"><use href="#i-sun"></use></svg></button>
    </div>
  </div>
  
  <main class="shell">
    <section class="hero">
      <div>
        <h1>BS Report <span>Viewer</span></h1>
        <p class="subtitle">Manage Jasper report packages and JSON mapping files</p>
        <div class="hero-link">
          <div class="hero-icon"><svg class="icon"><use href="#i-leaf"></use></svg></div>
          <div>
            <strong>Jasper Reports</strong>
            <div class="pkg-meta">View, manage and upload Jasper report packages with JSON mapping files</div>
          </div>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <!-- Mac Window Topbar -->
        <div class="window-bar">
          <span class="dot close"></span>
          <span class="dot minimize"></span>
          <span class="dot maximize"></span>
          <span class="window-title">Report Analysis</span>
        </div>
        
        <!-- Main Dashboard Mockup Grid -->
        <div class="dash-grid">
          <!-- Top Area: Chart -->
          <div class="dash-chart-card">
            <svg class="dash-svg" viewBox="0 0 320 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chart-glow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#8158ff" />
                  <stop offset="50%" stop-color="#39a9ff" />
                  <stop offset="100%" stop-color="#35d86d" />
                </linearGradient>
                <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(129, 88, 255, 0.28)" />
                  <stop offset="100%" stop-color="rgba(129, 88, 255, 0.0)" />
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              <line x1="0" y1="20" x2="320" y2="20" stroke="rgba(255, 255, 255, 0.04)" stroke-dasharray="2" />
              <line x1="0" y1="40" x2="320" y2="40" stroke="rgba(255, 255, 255, 0.04)" stroke-dasharray="2" />
              <line x1="0" y1="60" x2="320" y2="60" stroke="rgba(255, 255, 255, 0.04)" stroke-dasharray="2" />
              <line x1="0" y1="80" x2="320" y2="80" stroke="rgba(255, 255, 255, 0.04)" stroke-dasharray="2" />
              <!-- Area Fill -->
              <path d="M 0 90 Q 40 40, 80 60 T 160 30 T 240 70 T 320 20 L 320 100 L 0 100 Z" fill="url(#chart-fill)" />
              <!-- Glow Wavy Line -->
              <path d="M 0 90 Q 40 40, 80 60 T 160 30 T 240 70 T 320 20" fill="none" stroke="url(#chart-glow)" stroke-width="3" />
              <!-- Glowing Data Points -->
              <circle cx="80" cy="60" r="4" fill="#39a9ff" stroke="rgba(57,169,255,0.4)" stroke-width="4" />
              <circle cx="160" cy="30" r="5" fill="#f7f8ff" stroke="rgba(129,88,255,0.6)" stroke-width="6" />
              <circle cx="240" cy="70" r="4" fill="#35d86d" stroke="rgba(53,216,109,0.4)" stroke-width="4" />
            </svg>
          </div>
          
          <!-- Bottom Area: Mini Grid -->
          <div class="dash-bottom">
            <!-- Left Mini Card: Info -->
            <div class="dash-card">
              <div class="dash-card-label">Active Packages</div>
              <div class="dash-card-val">05 <span class="dash-trend">+20%</span></div>
              <div class="dash-card-spark">
                <svg width="100%" height="16">
                  <path d="M 0 12 L 20 8 L 40 14 L 60 4 L 80 10 L 100 2" fill="none" stroke="var(--green)" stroke-width="1.5" />
                </svg>
              </div>
            </div>
            
            <!-- Right Mini Card: Donut -->
            <div class="dash-card donut-card">
              <div class="donut-container">
                <svg viewBox="0 0 36 36" class="donut-svg">
                  <!-- Gray Background circle -->
                  <path class="donut-ring" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="3.5" />
                  <!-- Colored foreground donut circle -->
                  <path class="donut-segment" stroke-dasharray="84, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#8158ff" stroke-width="3.5" stroke-linecap="round" />
                </svg>
                <div class="donut-text">84%</div>
              </div>
              <div class="donut-info">
                <div class="dash-card-label" style="margin: 0;">Optimization</div>
                <div class="dash-status"><span class="pulse-dot"></span> Online</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="main-layout">
      <!-- Left Column: Package Manager -->
      <section class="panel">
        <div class="panel-head">
          <div class="title">
            <div class="square-icon"><svg class="icon"><use href="#i-folder"></use></svg></div>
            <div>
              <h2>Report Package Manager</h2>
              <p>Manage your Jasper report packages and files</p>
            </div>
          </div>
          <div class="toolbar">
            <input id="search" class="search" placeholder="Search packages or files..." oninput="render()" />
            <select id="typeFilter" class="filter" onchange="render()">
              <option value="">All Packages</option>
              <option value="JASPER">Has JASPER</option>
              <option value="JRXML">Has JRXML</option>
              <option value="JSON">Has JSON</option>
            </select>
            <button class="btn primary" onclick="document.getElementById('fileInput').click()">
              <svg class="icon"><use href="#i-upload"></use></svg> Upload Package
            </button>
          </div>
        </div>

        <div class="list-summary-bar">
          <div class="list-summary" id="listSummary"></div>
          <div class="list-summary-actions">
            <button class="btn" onclick="loadPackages(true)"><svg class="icon"><use href="#i-refresh"></use></svg> Refresh</button>
            <button id="btnListView" class="btn icon-only active" onclick="setView('list')" title="List View"><svg class="icon"><use href="#i-list-view"></use></svg></button>
            <button id="btnGridView" class="btn icon-only" onclick="setView('grid')" title="Grid View"><svg class="icon"><use href="#i-grid-view"></use></svg></button>
          </div>
        </div>

        <div id="packages"></div>
      </section>

      <!-- Right Column: Quick Access / Quick Actions -->
      <aside class="quick-actions">
        <div class="quick-actions-title">
          <svg class="icon fill" style="color: var(--purple); width: 22px; height: 22px;"><use href="#i-bolt"></use></svg>
          Quick Actions
        </div>
        
        <div class="quick-actions-card">
          <div class="quick-actions-header">
            <div class="quick-actions-icon-wrapper">
              <svg class="icon" style="width: 22px; height: 22px; color: var(--purple);"><use href="#i-upload-small"></use></svg>
            </div>
            <div>
              <div class="quick-actions-subtitle">Upload Jasper Package</div>
              <p class="quick-actions-desc">Upload package containing Jasper reports</p>
            </div>
          </div>

          <label id="dropZone" class="upload-box">
            <input id="fileInput" type="file" multiple accept=".jasper,.jrxml,.json" />
            <div class="upload-box-icon">
              <svg class="icon" style="width: 28px; height: 28px; color: var(--purple);"><use href="#i-upload"></use></svg>
            </div>
            <div class="upload-box-text">Drag & drop package here</div>
            <div class="upload-box-divider"><span>or</span></div>
            <button type="button" class="btn primary choose-btn" style="width: 100%; border-radius: 8px;" onclick="document.getElementById('fileInput').click()">Choose File</button>
          </label>

          <div class="quick-actions-footer">
            Supported: .jasper, .jrxml, .json (max 50 MB)
          </div>
        </div>
      </aside>
    </div>
  </main>
  
  <div id="toast" class="toast"></div>

  <script>
    let packages = [];
    const expanded = new Set();
    let currentView = 'list';
    const appBasePath = (() => {
      const path = window.location.pathname || '/';
      return path.endsWith('/') ? path : `${path}/`;
    })();
    const apiUrl = path => new URL(path.replace(/^\/+/, ''), `${window.location.origin}${appBasePath}`).toString();
    const svg = name => `<svg class="icon"><use href="#${name}"></use></svg>`;

    const fmtDate = value => new Date(value).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const show = (message, isError = false) => {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.style.borderColor = isError ? 'rgba(255,90,122,.6)' : 'rgba(53,216,109,.6)';
      toast.style.display = 'block';
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => toast.style.display = 'none', 4200);
    };

    function applyTheme(theme) {
      document.body.classList.toggle('light', theme === 'light');
      document.getElementById('themeButton').innerHTML = svg(theme === 'light' ? 'i-moon' : 'i-sun');
      localStorage.setItem('bs-report-viewer-theme', theme);
    }

    function toggleTheme() {
      applyTheme(document.body.classList.contains('light') ? 'dark' : 'light');
    }

    async function loadPackages(isManual = false) {
      const res = await fetch(apiUrl('api/report-packages'));
      if (!res.ok) throw new Error(await res.text());
      packages = await res.json();
      // Keep packages collapsed by default
      render();
      if (isManual) {
        show("Refreshed packages list");
      }
    }

    function setView(view) {
      currentView = view;
      document.querySelectorAll('.list-summary-actions .btn').forEach(btn => btn.classList.remove('active'));
      if (view === 'list') {
        document.getElementById('btnListView').classList.add('active');
      } else {
        document.getElementById('btnGridView').classList.add('active');
      }
      render();
    }

    function render() {
      const host = document.getElementById('packages');
      const q = document.getElementById('search').value.trim().toLowerCase();
      const type = document.getElementById('typeFilter').value;
      const filtered = packages.filter(pkg => {
        const hit = !q || pkg.package_name.toLowerCase().includes(q) || pkg.files.some(file => file.file_name.toLowerCase().includes(q));
        const typeHit = !type || pkg.files.some(file => file.type === type);
        return hit && typeHit;
      });

      // Update list summary bar counts
      const totalPkgs = filtered.length;
      const totalFiles = filtered.reduce((sum, pkg) => sum + pkg.file_count, 0);
      const summaryEl = document.getElementById('listSummary');
      if (summaryEl) {
        summaryEl.innerHTML = `<span>${totalPkgs} package${totalPkgs !== 1 ? 's' : ''}</span> &nbsp;&middot;&nbsp; <span>${totalFiles} file${totalFiles !== 1 ? 's' : ''}</span>`;
      }

      if (!filtered.length) {
        host.innerHTML = '<div class="empty">No Jasper package files found.</div>';
        return;
      }

      if (currentView === 'grid') {
        host.innerHTML = `<div class="packages-grid">${filtered.map(pkg => `
          <div class="pkg-card">
            <div class="pkg-card-top">
              <div class="pkg-card-icon">${svg('i-package')}</div>
              <span class="badge">Jasper Package</span>
            </div>
            <div class="pkg-card-body">
              <h3 class="pkg-card-name" title="${esc(pkg.package_name)}">${esc(pkg.package_name)}</h3>
              <p class="pkg-card-meta">${pkg.file_count} files &middot; ${esc(pkg.total_size_text || '')}</p>
              <p class="pkg-card-date">Modified: ${fmtDate(pkg.last_modified)}</p>
            </div>
            <div class="pkg-card-actions">
              <button class="btn" onclick="expanded.add('${esc(pkg.package_name)}'); setView('list');">${svg('i-eye')} View Files</button>
              <button class="btn primary" onclick="downloadPackage('${encodeURIComponent(pkg.package_name)}')">${svg('i-download')} Download</button>
            </div>
          </div>`).join('')}</div>`;
        return;
      }

      host.innerHTML = filtered.map(pkg => {
        const open = expanded.has(pkg.package_name);
        const rows = pkg.files.map(file => `
          <div class="row">
            <div class="file-name"><div class="file-dot">${svg('i-file')}</div><span class="file-text" title="${esc(file.file_name)}">${esc(file.file_name)}</span></div>
            <div><span class="badge ${esc(file.type)}">${esc(file.type)}</span></div>
            <div class="pkg-meta">${esc(file.description)}</div>
            <div class="file-size">${esc(file.size_text)}</div>
            <div class="actions file-actions">
              <button class="btn" onclick="viewFile('${encodeURIComponent(file.file_name)}')">${svg('i-eye')} View</button>
              <button class="btn" onclick="downloadFile('${encodeURIComponent(file.file_name)}')">${svg('i-download')} Download</button>
              <button class="btn danger" onclick="deleteFile('${encodeURIComponent(file.file_name)}')">${svg('i-trash')} Delete</button>
            </div>
          </div>`).join('');

        return `
          <article class="package">
            <div class="package-top">
              <button class="chev" onclick="togglePackage('${esc(pkg.package_name)}')">${svg(open ? 'i-chevron-down' : 'i-chevron-right')}</button>
              <div class="pkg-icon">${svg('i-package')}</div>
              <div><div class="pkg-name">${esc(pkg.package_name)} <span class="badge">Jasper Package</span></div><div class="pkg-meta">${pkg.file_count} files &middot; ${esc(pkg.total_size_text || '')}</div></div>
              <div class="date"><div class="label">Last modified</div><div>${fmtDate(pkg.last_modified)}</div></div>
              <div class="actions">
                <button class="btn" onclick="downloadPackage('${encodeURIComponent(pkg.package_name)}')">${svg('i-download')} Download</button>
              </div>
            </div>
            ${open ? `<div class="files"><div class="row head"><div>File name</div><div>Type</div><div>Description</div><div class="file-size" style="padding-right: 10px;">Size</div><div style="padding-left: 8px;">Actions</div></div>${rows}</div>` : ''}
          </article>`;
      }).join('');
    }

    function togglePackage(name) {
      if (expanded.has(name)) expanded.delete(name); else expanded.add(name);
      render();
    }

    function fileUrl(fileName) {
      return apiUrl(`api/report-files/jasper/${fileName}`);
    }

    function viewFile(fileName) {
      window.open(fileUrl(fileName), '_blank', 'noopener');
    }

    function downloadFile(fileName) {
      const a = document.createElement('a');
      a.href = fileUrl(fileName);
      a.download = decodeURIComponent(fileName);
      a.click();
    }

    function downloadPackage(packageName) {
      const pkg = packages.find(item => item.package_name === decodeURIComponent(packageName));
      if (!pkg) return;
      pkg.files.forEach(file => downloadFile(encodeURIComponent(file.file_name)));
    }

    async function deleteFile(fileName) {
      const name = decodeURIComponent(fileName);
      if (!confirm(`Delete ${name}?`)) return;
      const res = await fetch(fileUrl(fileName), { method: 'DELETE' });
      if (!res.ok) {
        show(await res.text(), true);
        return;
      }
      show(`Deleted ${name}`);
      await loadPackages();
    }

    async function uploadFiles(files) {
      const list = [...files];
      if (!list.length) return;
      for (const file of list) {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(apiUrl('api/report-files/jasper'), { method: 'POST', body: form });
        if (!res.ok) {
          show(`Upload failed: ${file.name}`, true);
          return;
        }
      }
      show(`Uploaded ${list.length} file(s)`);
      await loadPackages();
    }

    const input = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    input.addEventListener('change', event => uploadFiles(event.target.files));
    dropZone.addEventListener('dragover', event => { event.preventDefault(); dropZone.classList.add('drag'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
    dropZone.addEventListener('drop', event => {
      event.preventDefault();
      dropZone.classList.remove('drag');
      uploadFiles(event.dataTransfer.files);
    });

    applyTheme(localStorage.getItem('bs-report-viewer-theme') || 'dark');
    loadPackages().catch(error => show(error.message, true));
  </script>
</body>
</html>
""";
    }
}
