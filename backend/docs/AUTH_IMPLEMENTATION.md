# Authentication Implementation

## Overview
Identity-based authentication using JWT tokens. Users can register as Buyers and login to receive access tokens.

## Architecture

### Components
1. **AuthService** - Handles registration, login, password hashing
2. **AuthController** - Exposes authentication endpoints
3. **JwtStrategy** - Validates JWT tokens and attaches user to request
4. **JwtAuthGuard** - Protects routes requiring authentication
5. **PrismaService** - Database access layer

---

## Authentication Flow

### 1. Registration (Buyer Only)
```
POST /api/auth/register
Body: {
  "email": "buyer@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}

Response: {
  "accessToken": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid",
    "email": "buyer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "ACTIVE"
  }
}
```

**Process:**
1. Validate email format and password strength (min 8 chars)
2. Check if email already exists
3. Hash password using bcrypt (10 salt rounds)
4. Find Buyer role from database
5. Create user with ACTIVE status
6. Assign Buyer role to user
7. Generate JWT token (expires in 7 days)
8. Return token and user info

---

### 2. Login
```
POST /api/auth/login
Body: {
  "email": "buyer@example.com",
  "password": "password123"
}

Response: {
  "accessToken": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid",
    "email": "buyer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "status": "ACTIVE"
  }
}
```

**Process:**
1. Find user by email
2. Verify user status is ACTIVE
3. Compare password with stored hash using bcrypt
4. Update lastLogin timestamp
5. Generate JWT token
6. Return token and user info

---

### 3. Protected Routes
```
GET /api/profile/me
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1..."
}

Response: {
  "id": "uuid",
  "email": "buyer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "status": "ACTIVE",
  "roles": [
    {
      "id": "role-uuid",
      "name": "Buyer",
      "slug": "buyer"
    }
  ]
}
```

**Process:**
1. Extract JWT from Authorization header
2. Verify JWT signature and expiration
3. Extract user ID from token payload
4. Load user with roles from database
5. Verify user is ACTIVE
6. Attach user object to request
7. Execute route handler

---

## Security Features

### Password Security
- **Hashing:** bcrypt with 10 salt rounds
- **Minimum Length:** 8 characters
- **No storage of plain text:** Only hash stored in database

### Token Security
- **Algorithm:** HMAC SHA256 (HS256)
- **Expiration:** 7 days (configurable via JWT_EXPIRATION)
- **Secret:** Environment variable (JWT_SECRET)
- **Payload:** Contains only user ID and email (no sensitive data)

### Account Security
- **Status Check:** Only ACTIVE users can login
- **Duplicate Prevention:** Email uniqueness enforced
- **Last Login Tracking:** Timestamp updated on each login

---

## Usage Examples

### Protecting a Route
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@Request() req) {
    const user = req.user; // User object with roles
    // ... implementation
  }
}
```

### Accessing User in Controller
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  const userId = req.user.id;
  const userEmail = req.user.email;
  const userRoles = req.user.userRoles;
  // ... implementation
}
```

---

## Configuration

### Environment Variables
```env
# JWT Configuration
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRATION="7d"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rachelfoods"
```

---

## Limitations (By Design)

### Not Implemented Yet:
- ❌ Permission-based authorization (coming next)
- ❌ Refresh tokens
- ❌ Admin/Seller registration (manual only)
- ❌ Email verification
- ❌ Password reset
- ❌ Account lockout after failed attempts
- ❌ Two-factor authentication

### Current Behavior:
- ✅ Only Buyers can self-register
- ✅ JWT expires after 7 days
- ✅ All authenticated users can access protected routes
- ✅ User roles are loaded but not checked yet

---

## Error Handling

### Registration Errors
- `400 Bad Request` - Invalid email format or password too short
- `409 Conflict` - Email already registered

### Login Errors
- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - Account not active

### Protected Route Errors
- `401 Unauthorized` - Missing or invalid token
- `401 Unauthorized` - User not found or inactive

---

## Next Steps
1. Implement permission-based authorization guards
2. Add role-based route protection
3. Create admin endpoints for user management
4. Add refresh token mechanism
