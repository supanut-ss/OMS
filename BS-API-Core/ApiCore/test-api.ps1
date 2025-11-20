# ========================================
# BS Platform API Testing Script
# ========================================
# Usage: .\test-api.ps1
# ========================================

# API Configuration
$apiBaseUrl = "http://10.10.60.66/api_gateway_ams_kpmt/gateway/v1/api"
$username = "admin"
$password = "your_password_here"

# Colors for output
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"
$ColorInfo = "Cyan"
$ColorDebug = "Gray"

Write-Host ""
Write-Host "========================================" -ForegroundColor $ColorInfo
Write-Host "   BS Platform API Testing Script" -ForegroundColor $ColorInfo
Write-Host "========================================" -ForegroundColor $ColorInfo
Write-Host ""

# ========================================
# Step 1: Get Authentication Token
# ========================================
Write-Host "Step 1: Getting authentication token..." -ForegroundColor $ColorWarning
Write-Host "   URL: $apiBaseUrl/auth/login" -ForegroundColor $ColorDebug
Write-Host "   User: $username" -ForegroundColor $ColorDebug
Write-Host ""

$loginBody = @{
    username = $username
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$apiBaseUrl/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -ErrorAction Stop

    $token = $loginResponse.token
    
    if ($token) {
        Write-Host "✅ Token obtained successfully!" -ForegroundColor $ColorSuccess
        Write-Host "   Token (first 50 chars): $($token.Substring(0, [Math]::Min(50, $token.Length)))..." -ForegroundColor $ColorDebug
        Write-Host ""
    } else {
        Write-Host "❌ Failed to get token - no token in response!" -ForegroundColor $ColorError
        Write-Host "   Response: $($loginResponse | ConvertTo-Json)" -ForegroundColor $ColorDebug
        exit 1
    }
} catch {
    Write-Host "❌ Login failed!" -ForegroundColor $ColorError
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor $ColorError
    Write-Host "   Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor $ColorDebug
    exit 1
}

# Create headers for authenticated requests
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# ========================================
# Step 2: Test Get Table Metadata
# ========================================
Write-Host "Step 2: Testing Get Table Metadata (tbm_part)..." -ForegroundColor $ColorWarning
Write-Host "   URL: $apiBaseUrl/dynamic/metadata/tbm_part?schemaName=ams" -ForegroundColor $ColorDebug
Write-Host ""

try {
    $metadataResponse = Invoke-RestMethod -Uri "$apiBaseUrl/dynamic/metadata/tbm_part?schemaName=ams" `
        -Method Get `
        -Headers $headers `
        -ErrorAction Stop

    Write-Host "✅ Metadata retrieved successfully!" -ForegroundColor $ColorSuccess
    Write-Host "   Table: $($metadataResponse.tableName)" -ForegroundColor $ColorDebug
    Write-Host "   Schema: $($metadataResponse.schemaName)" -ForegroundColor $ColorDebug
    Write-Host "   Columns: $($metadataResponse.columns.Count)" -ForegroundColor $ColorDebug
    Write-Host "   Primary Keys: $($metadataResponse.primaryKeys -join ', ')" -ForegroundColor $ColorDebug
    Write-Host "   Total Rows: $($metadataResponse.totalRows)" -ForegroundColor $ColorDebug
    Write-Host ""
    
    # Show first 5 columns
    Write-Host "   First 5 columns:" -ForegroundColor $ColorInfo
    $metadataResponse.columns | Select-Object -First 5 | ForEach-Object {
        $pkMarker = if ($_.isPrimaryKey) { " 🔑" } else { "" }
        Write-Host "      - $($_.columnName) ($($_.dataType))$pkMarker" -ForegroundColor $ColorDebug
    }
    Write-Host ""
} catch {
    Write-Host "❌ Failed to get metadata!" -ForegroundColor $ColorError
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor $ColorError
    Write-Host ""
}

# ========================================
# Step 3: Test Enhanced Stored Procedure (SELECT)
# ========================================
Write-Host "Step 3: Testing Enhanced Stored Procedure (SELECT)..." -ForegroundColor $ColorWarning
Write-Host "   URL: $apiBaseUrl/dynamic/enhanced-procedure" -ForegroundColor $ColorDebug
Write-Host "   Procedure: usp_tbm_part" -ForegroundColor $ColorDebug
Write-Host ""

$enhancedSpBody = @{
    procedureName = "usp_tbm_part"
    schemaName = "ams"
    operation = "SELECT"
    parameters = @{
        Page = 1
        PageSize = 10
    }
} | ConvertTo-Json

try {
    $enhancedSpResponse = Invoke-RestMethod -Uri "$apiBaseUrl/dynamic/enhanced-procedure" `
        -Method Post `
        -Headers $headers `
        -Body $enhancedSpBody `
        -ErrorAction Stop

    Write-Host "✅ Enhanced SP executed successfully!" -ForegroundColor $ColorSuccess
    Write-Host "   Operation: $($enhancedSpResponse.operation)" -ForegroundColor $ColorDebug
    Write-Host "   Success: $($enhancedSpResponse.success)" -ForegroundColor $ColorDebug
    Write-Host "   Row Count: $($enhancedSpResponse.rowCount)" -ForegroundColor $ColorDebug
    Write-Host "   Data Records: $($enhancedSpResponse.data.Count)" -ForegroundColor $ColorDebug
    Write-Host "   Execution Time: $($enhancedSpResponse.executionTime)ms" -ForegroundColor $ColorDebug
    Write-Host ""
    
    # 🔍 Check for Metadata
    if ($enhancedSpResponse.metadata) {
        Write-Host "✅ METADATA FOUND IN RESPONSE!" -ForegroundColor $ColorSuccess
        Write-Host "   Metadata Columns: $($enhancedSpResponse.metadata.columns.Count)" -ForegroundColor $ColorDebug
        Write-Host "   Primary Keys: $($enhancedSpResponse.metadata.primaryKeys -join ', ')" -ForegroundColor $ColorDebug
        Write-Host ""
        
        # Show columns with primary key markers
        Write-Host "   Columns detected:" -ForegroundColor $ColorInfo
        $enhancedSpResponse.metadata.columns | ForEach-Object {
            $pkMarker = if ($_.isPrimaryKey) { " 🔑 PRIMARY KEY" } else { "" }
            Write-Host "      - $($_.columnName) ($($_.dataType))$pkMarker" -ForegroundColor $ColorDebug
        }
        Write-Host ""
    } else {
        Write-Host "⚠️ NO METADATA in Enhanced SP response!" -ForegroundColor $ColorWarning
        Write-Host "   This means the API is not detecting/returning metadata" -ForegroundColor $ColorWarning
        Write-Host ""
    }
    
    # Show first 3 records
    if ($enhancedSpResponse.data.Count -gt 0) {
        Write-Host "   First 3 records:" -ForegroundColor $ColorInfo
        $enhancedSpResponse.data | Select-Object -First 3 | Format-Table -AutoSize
    }
    
} catch {
    Write-Host "❌ Failed to execute Enhanced SP!" -ForegroundColor $ColorError
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor $ColorError
    Write-Host ""
}

# ========================================
# Step 4: Test DataGrid Request
# ========================================
Write-Host "Step 4: Testing DataGrid Request..." -ForegroundColor $ColorWarning
Write-Host "   URL: $apiBaseUrl/dynamic/datagrid" -ForegroundColor $ColorDebug
Write-Host ""

$datagridBody = @{
    tableName = "tbm_part"
    schemaName = "ams"
    page = 1
    pageSize = 5
} | ConvertTo-Json

try {
    $datagridResponse = Invoke-RestMethod -Uri "$apiBaseUrl/dynamic/datagrid" `
        -Method Post `
        -Headers $headers `
        -Body $datagridBody `
        -ErrorAction Stop

    Write-Host "✅ DataGrid request successful!" -ForegroundColor $ColorSuccess
    Write-Host "   Total Rows: $($datagridResponse.totalCount)" -ForegroundColor $ColorDebug
    Write-Host "   Data Records: $($datagridResponse.data.Count)" -ForegroundColor $ColorDebug
    Write-Host ""
} catch {
    Write-Host "❌ Failed DataGrid request!" -ForegroundColor $ColorError
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor $ColorError
    Write-Host ""
}

# ========================================
# Summary
# ========================================
Write-Host "========================================" -ForegroundColor $ColorInfo
Write-Host "   Test Complete" -ForegroundColor $ColorInfo
Write-Host "========================================" -ForegroundColor $ColorInfo
Write-Host ""
Write-Host "💡 Tips:" -ForegroundColor $ColorInfo
Write-Host "   - Check server logs for detailed debug information" -ForegroundColor $ColorDebug
Write-Host "   - Look for 🔍, 📋, 🔑 emoji markers in logs" -ForegroundColor $ColorDebug
Write-Host "   - Verify metadata is being returned in Enhanced SP responses" -ForegroundColor $ColorDebug
Write-Host ""
