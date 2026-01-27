# Hero Slideshow Admin Management System

## Overview

The hero slideshow is a dynamic, database-driven carousel component displayed on the homepage. Admins can create, edit, delete, and reorder slides through the admin interface. The system includes audit logging for all changes and supports graceful fallback when the API is unavailable.

## Features

- ✅ **Dynamic Slide Management** - Create, edit, delete, and reorder slides via admin UI
- ✅ **Public API Endpoint** - Fetch active slides without authentication
- ✅ **Admin CRUD Endpoints** - Full control with role-based access (ADMIN only)
- ✅ **Audit Logging** - Complete trail of who changed what and when
- ✅ **Drag-and-Drop Reordering** - Intuitive slide ordering with up/down arrows
- ✅ **Live Preview** - See how slides look before publishing
- ✅ **Active/Inactive Toggle** - Control which slides are shown on homepage
- ✅ **Fallback Slides** - Hardcoded slides display if API fails
- ✅ **Auto-Rotation** - Slideshow automatically rotates every 5 seconds
- ✅ **Image Support** - SVG and raster images (JPG, PNG, WebP)

## Database Schema

**Table:** `hero_slides`

| Field        | Type              | Description                                |
| ------------ | ----------------- | ------------------------------------------ |
| `id`         | UUID              | Primary key                                |
| `title`      | String            | Main heading text                          |
| `subtitle`   | String            | Subheading text                            |
| `imageUrl`   | String            | Path to image (e.g., `/images/hero-1.svg`) |
| `linkUrl`    | String (optional) | Where the slide links to                   |
| `buttonText` | String            | Text for call-to-action button             |
| `order`      | Int               | Display order (0, 1, 2, ...)               |
| `isActive`   | Boolean           | Whether slide is shown publicly            |
| `createdAt`  | DateTime          | Creation timestamp                         |
| `updatedAt`  | DateTime          | Last update timestamp                      |
| `createdBy`  | UUID              | User who created the slide                 |
| `updatedBy`  | UUID              | User who last updated the slide            |

**Indexes:**

- `@@index([order])` - Fast ordering queries
- `@@index([isActive])` - Fast filtering of active slides

## API Endpoints

### Public Endpoints

#### `GET /api/admin/hero-slides/public`

Fetch all active slides (no authentication required).

**Response:**

```json
[
  {
    "id": "uuid",
    "title": "Fresh Traditional Foods",
    "subtitle": "Authentic Nigerian ingredients delivered to your door",
    "imageUrl": "/images/hero-1.svg",
    "linkUrl": "/catalog",
    "buttonText": "Shop Now",
    "order": 0,
    "isActive": true
  }
]
```

### Admin Endpoints (Requires ADMIN role)

#### `GET /api/admin/hero-slides`

List all slides (active and inactive).

**Authentication:** JWT token with ADMIN or STAFF role

**Response:** Array of slide objects (same as public endpoint)

---

#### `GET /api/admin/hero-slides/:id`

Get a single slide by ID.

**Authentication:** JWT token with ADMIN or STAFF role

**Response:** Single slide object

---

#### `POST /api/admin/hero-slides`

Create a new slide.

**Authentication:** JWT token with ADMIN role

**Request Body:**

```json
{
  "title": "New Slide Title",
  "subtitle": "Subtitle text",
  "imageUrl": "/images/new-slide.jpg",
  "linkUrl": "/catalog",
  "buttonText": "Shop Now",
  "order": 3,
  "isActive": true
}
```

**Response:** Created slide object

**Audit Log:** Creates audit entry with action `CREATE_HERO_SLIDE`

---

#### `PUT /api/admin/hero-slides/:id`

Update an existing slide.

**Authentication:** JWT token with ADMIN role

**Request Body:** Same as POST (partial updates supported)

**Response:** Updated slide object

**Audit Log:** Creates audit entry with action `UPDATE_HERO_SLIDE`, includes before/after changes

---

#### `DELETE /api/admin/hero-slides/:id`

Delete a slide.

**Authentication:** JWT token with ADMIN role

**Response:** `{ message: "Slide deleted successfully" }`

**Audit Log:** Creates audit entry with action `DELETE_HERO_SLIDE`

---

#### `POST /api/admin/hero-slides/reorder`

Batch update slide order.

**Authentication:** JWT token with ADMIN role

**Request Body:**

```json
{
  "slideIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:** Array of updated slides

**Audit Log:** Creates audit entry with action `REORDER_HERO_SLIDES`

## Admin UI Usage

### Accessing Admin Panel

1. Login as admin at `/admin/login`
2. Navigate to `/admin/hero-slides`
3. View list of current slides with preview thumbnails

### Creating a New Slide

1. Fill out the form on the left:
   - **Title** (required): Main heading text
   - **Subtitle** (required): Subheading text
   - **Image URL** (required): Path to image (e.g., `/images/hero-1.svg`)
   - **Button Text**: Call-to-action text (default: "Shop Now")
   - **Link URL**: Where button links to (default: `/catalog`)
   - **Active**: Check to show on homepage immediately

2. Click **"Create Slide"**

3. Slide appears in the list on the right

### Editing a Slide

1. Click **"Edit"** button on any slide in the list
2. Form populates with current values
3. Make changes
4. Click **"Update Slide"**
5. Click **"Cancel"** to discard changes

### Deleting a Slide

1. Click **"Delete"** button on any slide
2. Confirm deletion in popup
3. Slide is removed from database

### Reordering Slides

Use the up (↑) and down (↓) arrows to change slide order:

- Slides display in the order shown (top to bottom = first to last)
- Frontend auto-rotates through slides in this order
- Reordering is saved immediately

### Live Preview

The preview panel at the bottom shows how the first active slide looks on the homepage.

## Adding Custom Images

### Image Requirements

- **Dimensions:** 1920×600px (16:3 aspect ratio)
- **Format:** SVG, JPG, PNG, or WebP
- **Size:** < 500KB recommended for performance
- **Location:** `/frontend/public/images/`

### Using SVG Images (Recommended)

SVG images are lightweight and scale perfectly. The provided sample images use theme colors:

```xml
<svg width="1920" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#16a34a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#15803d;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1920" height="600" fill="url(#grad1)"/>
  <text x="960" y="250" font-size="72" fill="white" text-anchor="middle">
    Your Title Here
  </text>
</svg>
```

### Using Raster Images

1. Create or obtain a 1920×600px image
2. Optimize for web (compress, resize)
3. Save to `/frontend/public/images/`
4. Reference as `/images/your-image.jpg` in admin UI

## Fallback Behavior

If the API fails or returns no slides, the frontend displays 3 hardcoded fallback slides:

1. **Fresh Traditional Foods** (green gradient)
2. **Premium Quality Ingredients** (orange gradient)
3. **Fast & Reliable Delivery** (red gradient)

This ensures the homepage always has visual content, even during backend outages.

## Code Structure

### Backend Files

```
backend/
├── prisma/
│   └── schema.prisma               # Database model definition
├── src/
│   └── admin/
│       ├── hero-slides.service.ts  # Business logic (CRUD + audit)
│       ├── hero-slides.controller.ts # REST API endpoints
│       └── admin.module.ts         # Module configuration
└── seed-hero-slides.ts             # Database seeding script
```

### Frontend Files

```
frontend/
├── app/
│   └── admin/
│       └── hero-slides/
│           └── page.tsx            # Admin UI for managing slides
├── components/
│   └── HeroSlideshow.tsx           # Public slideshow component
└── public/
    └── images/
        ├── hero-1.svg              # Sample slide 1
        ├── hero-2.svg              # Sample slide 2
        └── hero-3.svg              # Sample slide 3
```

## Security

- **Authentication:** JWT tokens required for admin endpoints
- **Authorization:** RBAC enforces ADMIN role for mutations (create, update, delete, reorder)
- **Audit Logging:** All changes tracked with user ID, timestamp, IP address, and before/after data
- **Input Validation:** NestJS DTOs validate all request data
- **SQL Injection Protection:** Prisma ORM parameterizes all queries

## Performance

- **Caching:** Frontend caches slides in component state
- **Indexes:** Database indexes on `order` and `isActive` fields
- **Lazy Loading:** Images load progressively with Next.js Image component
- **Auto-Rotation:** 5-second interval with smooth opacity transitions

## Troubleshooting

### Slides not appearing on homepage

1. Check that slides are marked as `isActive: true`
2. Verify backend is running and accessible
3. Check browser console for API errors
4. Verify images exist in `/frontend/public/images/`

### Admin UI not loading

1. Confirm you're logged in as ADMIN
2. Check browser console for authentication errors
3. Verify backend `/api/admin/hero-slides` endpoint is accessible

### Images not displaying

1. Verify image path starts with `/images/` (not `/public/images/`)
2. Check that image file exists in `/frontend/public/images/`
3. Ensure image URL in database matches actual filename
4. Check browser network tab for 404 errors

### Reordering not saving

1. Check browser console for API errors
2. Verify you have ADMIN role (not just STAFF)
3. Check audit logs for failed reorder attempts

## Testing

### Manual Testing Checklist

- [ ] Create a new slide via admin UI
- [ ] Edit an existing slide
- [ ] Delete a slide with confirmation
- [ ] Reorder slides with up/down arrows
- [ ] Toggle slide active/inactive status
- [ ] View live preview in admin UI
- [ ] Check homepage slideshow displays correctly
- [ ] Verify auto-rotation works (5-second intervals)
- [ ] Test navigation arrows and dot indicators
- [ ] Verify fallback slides display when API is offline
- [ ] Check audit logs for all mutations

### Seed Testing

To reset slides to default state:

```bash
cd backend
npx ts-node seed-hero-slides.ts
```

This clears existing slides and creates 3 default slides with sample images.

## Future Enhancements

- [ ] **Image Upload** - Direct file upload instead of URL input
- [ ] **Drag-and-Drop Reordering** - Visual drag-and-drop interface
- [ ] **Slide Scheduling** - Auto-activate/deactivate on specific dates
- [ ] **A/B Testing** - Test multiple slide variations
- [ ] **Click Tracking** - Analytics on slide button clicks
- [ ] **Multi-Language Support** - Translations for title/subtitle
- [ ] **Video Backgrounds** - Support for video slides
- [ ] **Animation Options** - Customizable transition effects

## Related Documentation

- [Admin Management Guide](./ADMIN_MANAGEMENT_GUIDE.md) - Complete admin capabilities
- [Module Catalog](./MODULE_CATALOG.md) - System module reference
- [Audit Logging](./PHASE_8_IMPLEMENTATION.md) - Audit system details

---

**Last Updated:** January 2026  
**System Version:** Phase 9+ (Hero Slideshow Admin System)
