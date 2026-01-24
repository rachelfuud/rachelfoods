# RachelFoods Backend - Quick Deploy Package Creator
# This script creates a production-ready package for Node.js hosting

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RachelFoods Backend Deployment Packager" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean previous builds
Write-Host "Step 1: Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Recurse -Force dist
    Write-Host "✓ Cleaned dist folder" -ForegroundColor Green
}
if (Test-Path "deploy") {
    Remove-Item -Recurse -Force deploy
    Write-Host "✓ Cleaned deploy folder" -ForegroundColor Green
}

# Step 2: Build the application
Write-Host ""
Write-Host "Step 2: Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green

# Step 3: Create deployment folder
Write-Host ""
Write-Host "Step 3: Creating deployment package..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "deploy" -Force | Out-Null

# Copy essential files
Copy-Item -Recurse "dist" "deploy\dist"
Copy-Item -Recurse "prisma" "deploy\prisma"
Copy-Item "package.json" "deploy\"
Copy-Item "package-lock.json" "deploy\"

# Copy .env.example as template
Copy-Item ".env.example" "deploy\.env.example"

Write-Host "✓ Copied dist folder" -ForegroundColor Green
Write-Host "✓ Copied prisma folder" -ForegroundColor Green
Write-Host "✓ Copied package.json" -ForegroundColor Green
Write-Host "✓ Copied package-lock.json" -ForegroundColor Green
Write-Host "✓ Copied .env.example (rename to .env on server)" -ForegroundColor Green

# Step 4: Create deployment instructions
$instructions = @"
====================================
DEPLOYMENT INSTRUCTIONS
====================================

1. Upload the 'deploy' folder contents to your server's application root

2. On the server, create a .env file with your production settings:
   - Copy .env.example to .env
   - Update DATABASE_URL with your PostgreSQL credentials
   - Update JWT_SECRET with a secure random string
   - Add your Stripe keys
   - Set NODE_ENV=production

3. Install dependencies:
   npm ci --only=production

4. Generate Prisma Client:
   npx prisma generate

5. Run database migrations:
   npx prisma migrate deploy

6. Seed the database (first time only):
   npm run prisma:seed

7. Configure your Node.js hosting:
   - Node.js version: 18.x or 20.x
   - Application mode: production
   - Application startup file: dist/src/main.js
   - Application URL: https://yourdomain.com
   - Port: 3001 (or your preference)

8. Start the application:
   node dist/src/main.js

9. Test the deployment:
   curl https://yourdomain.com/api

For detailed instructions, see DEPLOYMENT_GUIDE.md

====================================
"@

Set-Content -Path "deploy\DEPLOY_README.txt" -Value $instructions
Write-Host "✓ Created DEPLOY_README.txt" -ForegroundColor Green

# Step 5: Create .env template with placeholders
$envTemplate = @"
# ========================================
# PRODUCTION ENVIRONMENT CONFIGURATION
# ========================================
# IMPORTANT: Fill in all values before starting the application!

# Database Connection (REQUIRED)
# Get this from your hosting provider's PostgreSQL service
DATABASE_URL="postgresql://username:password@hostname:5432/database_name?schema=public"

# JWT Authentication (REQUIRED - CHANGE THESE!)
# Generate a secure random string (minimum 32 characters)
JWT_SECRET="CHANGE_THIS_TO_A_LONG_RANDOM_STRING_MIN_32_CHARS"
JWT_EXPIRATION="7d"

# Stripe Payment Gateway (REQUIRED for payments)
# Get these from your Stripe Dashboard (use LIVE keys for production)
STRIPE_SECRET_KEY="sk_live_YOUR_ACTUAL_STRIPE_SECRET_KEY"
STRIPE_WEBHOOK_SECRET="whsec_YOUR_ACTUAL_WEBHOOK_SECRET"

# Email Configuration (Recommended)
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="YOUR_SENDGRID_API_KEY"

# Application Configuration
PORT=3001
NODE_ENV=production

# Initial Admin Account
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="ChangeThisToASecurePassword123!"

# Optional: Error Tracking
SENTRY_DSN=""
"@

Set-Content -Path "deploy\.env.production.template" -Value $envTemplate
Write-Host "✓ Created .env.production.template" -ForegroundColor Green

# Step 6: Display summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT PACKAGE READY!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Package location: " -NoNewline
Write-Host "$PWD\deploy" -ForegroundColor Yellow
Write-Host ""
Write-Host "Package contents:" -ForegroundColor White
Write-Host "  ✓ dist/                       - Compiled application code" -ForegroundColor Gray
Write-Host "  ✓ prisma/                     - Database schema & migrations" -ForegroundColor Gray
Write-Host "  ✓ package.json                - Dependencies list" -ForegroundColor Gray
Write-Host "  ✓ package-lock.json           - Exact dependency versions" -ForegroundColor Gray
Write-Host "  ✓ .env.example                - Environment variables template" -ForegroundColor Gray
Write-Host "  ✓ .env.production.template    - Production env template" -ForegroundColor Gray
Write-Host "  ✓ DEPLOY_README.txt           - Quick deployment steps" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Compress the 'deploy' folder to a ZIP file" -ForegroundColor White
Write-Host "  2. Upload to your hosting server" -ForegroundColor White
Write-Host "  3. Extract and follow DEPLOY_README.txt instructions" -ForegroundColor White
Write-Host "  4. See DEPLOYMENT_GUIDE.md for detailed documentation" -ForegroundColor White
Write-Host ""
Write-Host "For your Node.js hosting configuration panel, use:" -ForegroundColor Cyan
Write-Host "  • Node.js version:        " -NoNewline; Write-Host "18.x or 20.x" -ForegroundColor Yellow
Write-Host "  • Application mode:       " -NoNewline; Write-Host "production" -ForegroundColor Yellow
Write-Host "  • Application startup:    " -NoNewline; Write-Host "dist/src/main.js" -ForegroundColor Yellow
Write-Host "  • Application URL:        " -NoNewline; Write-Host "https://yourdomain.com/api" -ForegroundColor Yellow
Write-Host ""
