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
