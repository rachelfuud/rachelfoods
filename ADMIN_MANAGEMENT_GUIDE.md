# Admin Management & Hero Slideshow - Implementation Guide

## Question 1: Is Everything Manageable by Admin?

### ✅ Currently Admin-Manageable (via Backend API + Admin UI)

1. **Products** (`/api/admin/products`)
   - Create, edit, delete products
   - Update stock levels
   - Publish/archive products
   - Upload product images
   - Manage product variants (sizes, weights)

2. **Categories** (`/api/categories`)
   - Create, edit categories
   - Enable/disable categories
   - Organize category hierarchy

3. **Orders** (`/api/admin/orders`)
   - View all orders
   - Update order status
   - Confirm/reject orders
   - View order details and custom items

4. **Coupons/Promotions** (`/api/admin/coupons`)
   - Create discount coupons
   - Set percentage or fixed-amount discounts
   - Configure min order amounts, expiry dates
   - Activate/deactivate coupons
   - View coupon usage stats

5. **Wallet Management** (`/wallet/admin`)
   - Credit user wallets (manual adjustments)
   - View user wallet balances
   - View transaction history
   - Track wallet usage

6. **Refunds** (`/refunds`)
   - Approve/reject refund requests
   - Process refunds (Stripe or wallet credit)
   - View refund history

7. **Theme Configuration** (`/api/theme`)
   - Update brand colors (primary, secondary, accent)
   - Configure theme modes (light/dark/system)
   - **Note**: Admin UI for theme not yet implemented, but API exists

8. **System Metrics** (`/api/admin/system`)
   - View system health
   - Check cache stats
   - Monitor order metrics
   - Clear system cache

9. **Audit Logs** (`/api/admin/audit-logs`)
   - View all admin actions
   - Track who changed what and when
   - Filter by user, action, entity, date range

10. **User Management**
    - Assign roles (Admin, Staff, Buyer)
    - Manage user permissions via RBAC

### ⚠️ Partially Manageable (Backend API exists, no Admin UI)

1. **Platform Fee Configuration**
   - API: `/api/admin/financial` endpoints exist
   - Can be modified via database seeding
   - **Missing**: Admin UI to configure fee percentages

2. **Shipping Providers**
   - Backend has shipping engine
   - **Missing**: Admin UI to add/configure shipping providers

### ❌ NOT Currently Admin-Manageable

1. **Hero Slideshow**
   - Currently hardcoded in frontend component
   - **Needs**: Database table + API + Admin UI (see implementation below)

2. **Email Templates**
   - Currently hardcoded in email service
   - **Needs**: Template management system

3. **Site Settings** (e.g., business hours, contact info)
   - Some stored in environment variables
   - **Needs**: Settings management API

---

## Question 2: Hero Slideshow Admin Management

### Current Implementation

The hero slideshow is **hardcoded** in `/frontend/components/HeroSlideshow.tsx` with 3 static slides:

```typescript
const heroImages = [
    { src: '/images/hero-1.jpg', title: 'Authentic Traditional Delicacies', ... },
    { src: '/images/hero-2.jpg', title: 'Premium Quality Ingredients', ... },
    { src: '/images/hero-3.jpg', title: 'Fast & Reliable Delivery', ... }
];
```

### To Make It Admin-Manageable

#### Step 1: Create Database Table (Prisma Schema)

Add to `backend/prisma/schema.prisma`:

```prisma
model hero_slides {
  id          String   @id @default(uuid())
  title       String
  subtitle    String
  imageUrl    String
  linkUrl     String?
  order       Int      @default(0)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### Step 2: Create Backend API

**Controller**: `backend/src/admin/hero-slides.controller.ts`

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

@Controller("api/admin/hero-slides")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "STAFF")
export class HeroSlidesController {
  constructor(private readonly heroSlidesService: HeroSlidesService) {}

  @Get()
  async getAll() {
    return this.heroSlidesService.findAll();
  }

  @Post()
  @Roles("ADMIN")
  async create(@Body() data: CreateHeroSlideDto) {
    return this.heroSlidesService.create(data);
  }

  @Put(":id")
  @Roles("ADMIN")
  async update(@Param("id") id: string, @Body() data: UpdateHeroSlideDto) {
    return this.heroSlidesService.update(id, data);
  }

  @Delete(":id")
  @Roles("ADMIN")
  async delete(@Param("id") id: string) {
    return this.heroSlidesService.delete(id);
  }
}
```

**Service**: `backend/src/admin/hero-slides.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class HeroSlidesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.hero_slides.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
  }

  async create(data: any) {
    return this.prisma.hero_slides.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.hero_slides.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.hero_slides.delete({ where: { id } });
  }
}
```

#### Step 3: Update Frontend to Fetch from API

**Update**: `frontend/components/HeroSlideshow.tsx`

```typescript
"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import api from "@/lib/api";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
}

export function HeroSlideshow() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchSlides() {
      try {
        const data = await api.get("/api/admin/hero-slides"); // Public endpoint
        setSlides(data);
      } catch (error) {
        console.error("Failed to load hero slides:", error);
        // Fallback to hardcoded slides
        setSlides([
          {
            id: "1",
            title: "Authentic Traditional Delicacies",
            subtitle: "Delivered Fresh",
            imageUrl: "/images/hero-1.jpg",
            order: 1,
          },
          // ... other fallbacks
        ]);
      }
    }
    fetchSlides();
  }, []);

  // ... rest of slideshow logic
}
```

#### Step 4: Create Admin UI

**Admin Page**: `frontend/app/admin/hero-slides/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function AdminHeroSlidesPage() {
  const [slides, setSlides] = useState([]);
  const [editingSlide, setEditingSlide] = useState(null);

  // CRUD operations for slides
  async function createSlide(data) { /* ... */ }
  async function updateSlide(id, data) { /* ... */ }
  async function deleteSlide(id) { /* ... */ }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Manage Hero Slideshow</h1>

      {/* List of slides with edit/delete buttons */}
      {/* Form to add/edit slides */}
      {/* Image upload functionality */}
    </div>
  );
}
```

---

## Summary: Admin Capabilities

### Current State

- ✅ **90% of core business operations** are admin-manageable
- ✅ Products, orders, coupons, wallet, refunds, users all have full CRUD
- ✅ Strong RBAC system (Admin, Staff, Buyer roles)
- ✅ Comprehensive audit logging

### Gaps

- ❌ Hero slideshow (hardcoded)
- ❌ Email templates (hardcoded)
- ❌ Some configuration settings (env-based)

### Recommendation

For the hero slideshow, I can implement the full admin management system now if you'd like. It would involve:

1. Adding the Prisma schema (1 min)
2. Running migration (1 min)
3. Creating backend API (5 mins)
4. Creating admin UI (10 mins)
5. Updating frontend component (5 mins)

**Estimated time**: 20-25 minutes total

**Or** we can leave it as-is for now since you can manually update the images in `/frontend/components/HeroSlideshow.tsx` whenever needed.

---

## Next Steps

1. **Database re-seeded** ✅ (prices already correct)
2. **Push to GitHub** - Ready when you confirm
3. **Hero slideshow admin** - Confirm if you want me to implement the full admin system

Let me know your preference!
