# CMS Migration Runner Script (PowerShell)
# This script triggers the CMS migration via the admin API endpoint

param(
    [string]$ApiUrl = "https://your-backend-url.railway.app",
    [string]$AdminEmail = "admin@rachelfoods.com",
    [string]$AdminPassword = "Admin123!"
)

Write-Host "🔐 Logging in as admin..." -ForegroundColor Cyan

# Login and get JWT token
$loginBody = @{
    email    = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$ApiUrl/api/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    $token = $loginResponse.token

    if (-not $token) {
        Write-Host "❌ Login failed. No token received." -ForegroundColor Red
        Write-Host $loginResponse
        exit 1
    }

    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Running CMS migration..." -ForegroundColor Cyan

    # Trigger migration
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }

    $migrationResponse = Invoke-RestMethod -Uri "$ApiUrl/api/admin/migrations/run-cms" `
        -Method Post `
        -Headers $headers

    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $migrationResponse | ConvertTo-Json -Depth 10 | Write-Host

    if ($migrationResponse.success) {
        Write-Host ""
        Write-Host "✅ CMS migration completed successfully!" -ForegroundColor Green
        exit 0
    }
    else {
        Write-Host ""
        Write-Host "❌ CMS migration failed!" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host $_.Exception
    exit 1
}
