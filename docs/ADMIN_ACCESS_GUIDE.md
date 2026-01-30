# Admin Dashboard Access Guide

## Admin Credentials

### Default Admin Account

- **Email**: `admin@rachelfoods.com`
- **Password**: `Admin123!`

### Creating Admin Account

If the admin account doesn't exist, run the seed script:

```bash
cd backend
ADMIN_EMAIL=admin@rachelfoods.com ADMIN_PASSWORD=Admin123! npm run seed:admin
```

### Custom Admin Account

Set custom credentials via environment variables:

```bash
ADMIN_EMAIL=your@email.com ADMIN_PASSWORD=YourSecurePassword npm run seed:admin
```

## Accessing Admin Dashboard

### 1. Login

- Navigate to: `http://localhost:3000/login` (development) or `https://your-domain.com/login` (production)
- Enter admin credentials
- Click "Login"

### 2. Navigate to Dashboard

- After successful login, click on your user avatar (top-right corner)
- Or directly visit: `http://localhost:3000/admin`

### 3. Admin Features

The admin dashboard provides access to:

- **Products Management** - Create, edit, disable, archive products
- **Orders Management** - View all orders, update status, process refunds
- **Hero Slides** - Manage homepage slideshow
- **Theme Settings** - Customize platform appearance
- **Withdrawals** - Manage seller payouts
- **Alerts** - System notifications
- **Governance** - Security and compliance tools

## Admin Routes

| Route                       | Purpose                       |
| --------------------------- | ----------------------------- |
| `/admin`                    | Main dashboard with analytics |
| `/admin/products`           | Product management            |
| `/admin/products/[id]/edit` | Edit specific product         |
| `/admin/orders`             | Order management              |
| `/admin/hero-slides`        | Homepage slideshow            |
| `/admin/theme`              | Theme customization           |
| `/admin/withdrawals`        | Seller payouts                |
| `/admin/alerts`             | System alerts                 |

## Verifying Admin Access

Check if you have admin role:

```bash
# In backend directory
npx prisma studio
```

1. Open `users` table
2. Find your user by email
3. Verify `role` field is set to `ADMIN`

## Security Best Practices

1. **Change Default Password**: Immediately change the default admin password in production
2. **Use Strong Passwords**: Minimum 12 characters with uppercase, lowercase, numbers, and symbols
3. **Enable 2FA**: (Coming in Phase 8+) Two-factor authentication for admin accounts
4. **Audit Logs**: All admin actions are logged (Phase 8+)
5. **Limit Admin Access**: Only grant admin role to trusted personnel

## Troubleshooting

### Can't Login

- Verify credentials are correct
- Check backend is running (`http://localhost:3001`)
- Check database connection in backend logs

### Not Seeing Admin Menu

- Verify user role is `ADMIN` in database
- Clear browser cache and localStorage
- Re-login to refresh JWT token

### Admin Pages Show 403 Forbidden

- JWT token may be expired - logout and login again
- User role may have been changed - check database
- Backend RBAC guards may be blocking access - check backend logs

## Production Deployment

**IMPORTANT**: Before deploying to production:

1. Set strong admin credentials in environment variables:

   ```bash
   ADMIN_EMAIL=secure@yourdomain.com
   ADMIN_PASSWORD=VeryStrongPassword123!@#
   ```

2. Run seed script on production database:

   ```bash
   npm run seed:admin
   ```

3. Immediately change password after first login

4. Never commit admin credentials to version control

5. Use environment variables for all sensitive data

## Recent Updates (January 2025)

### Fixed: Admin Role Recognition

**Problem**: Admin users were not being recognized after login due to missing roles in auth response.

**Solution**:

1. Updated `auth.service.ts` login method to include `user_roles` relation in database query
2. Login response now includes both simple `role` field and full `roles` array
3. Admin seed script now assigns `platform-admin` role in `user_roles` table
4. Frontend `AuthProvider` checks for ADMIN, STAFF, or PLATFORM_ADMIN in roles array

### Authentication Flow

When you login as admin, the backend now returns:

```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "user": {
    "id": "usr_xxx",
    "email": "admin@rachelfoods.com",
    "firstName": "Admin",
    "lastName": "User",
    "status": "ACTIVE",
    "role": "ADMIN",
    "roles": [
      {
        "id": "role_xxx",
        "name": "Platform Admin",
        "slug": "platform-admin"
      }
    ]
  }
}
```

### Admin Permissions

The seeded admin user now has:

- Simple role: `ADMIN` in `users.role` field
- RBAC role: `platform-admin` in `user_roles` table
- Full system access to all admin features
- Bypasses all permission checks (super-admin privileges)

---

**Last Updated**: January 2025  
**See Also**: [ROLE_PERMISSION_MATRIX.md](./ROLE_PERMISSION_MATRIX.md), [SEED_DATA.md](./SEED_DATA.md)
