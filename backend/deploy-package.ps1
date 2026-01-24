# RachelFoods Backend - Quick Deploy Package Creator

Write-Host "RachelFoods Backend Deployment Packager" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "Step 1: Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "Cleaned dist folder" -ForegroundColor Green
}
if (Test-Path "deploy") {
    Remove-Item -Recurse -Force deploy
    Write-Host "Cleaned deploy folder" -ForegroundColor Green
}

# Step 2: Build the application
Write-Host ""
Write-Host "Step 2: Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build successful" -ForegroundColor Green

# Step 3: Create deployment folder
Write-Host ""
Write-Host "Step 3: Creating deployment package..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "deploy" -Force | Out-Null

# Copy essential files
Copy-Item -Recurse "dist" "deploy\dist"
Copy-Item -Recurse "prisma" "deploy\prisma"
Copy-Item "package.json" "deploy\"
Copy-Item "package-lock.json" "deploy\"
Copy-Item ".env.example" "deploy\.env.example"

Write-Host "Copied dist folder" -ForegroundColor Green
Write-Host "Copied prisma folder" -ForegroundColor Green
Write-Host "Copied package.json" -ForegroundColor Green
Write-Host "Copied package-lock.json" -ForegroundColor Green
Write-Host "Copied .env.example" -ForegroundColor Green

# Step 4: Create deployment instructions
$instructions = @"
DEPLOYMENT INSTRUCTIONS

1. Upload the 'deploy' folder contents to your server
2. Create .env file with production settings (use .env.example as template)
3. Install dependencies: npm ci --only=production
4. Generate Prisma Client: npx prisma generate
5. Run migrations: npx prisma migrate deploy
6. Seed database: npm run prisma:seed
7. Start application: node dist/src/main.js

Node.js Hosting Configuration:
- Node.js version: 18.x or 20.x
- Application mode: production
- Application startup file: dist/src/main.js
- Port: 3001

See DEPLOYMENT_GUIDE.md for detailed instructions.
"@

Set-Content -Path "deploy\DEPLOY_README.txt" -Value $instructions
Write-Host "Created DEPLOY_README.txt" -ForegroundColor Green

# Display summary
Write-Host ""
Write-Host "DEPLOYMENT PACKAGE READY!" -ForegroundColor Green
Write-Host ""
Write-Host "Package location: $PWD\deploy" -ForegroundColor Yellow
Write-Host ""
Write-Host "For your Node.js hosting configuration:" -ForegroundColor Cyan
Write-Host "  Node.js version:        18.x or 20.x" -ForegroundColor White
Write-Host "  Application mode:       production" -ForegroundColor White
Write-Host "  Application startup:    dist/src/main.js" -ForegroundColor White
Write-Host "  Application URL:        https://yourdomain.com/api" -ForegroundColor White
Write-Host ""
