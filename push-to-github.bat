@echo off
cd /d "c:\Projects\Dev\Rachel Foods"
echo Adding all changes...
git add .
echo.
echo Committing changes...
git commit -m "feat: Hero slideshow, kitchen refill public, all tables seeded - Auto-rotating hero slideshow (3 slides, 5s intervals) - Kitchen refill accessible without auth - Database fully seeded: RBAC, variants, configs - Backend running successfully - JWT refresh + audit logging - TypeScript/Tailwind fixes - Admin management docs"
echo.
echo Pushing to GitHub...
git push origin main
echo.
echo Done!
pause
