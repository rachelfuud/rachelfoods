# Custom CMS Module - Implementation Guide

**Status**: Backend Complete, Admin UI Complete, Frontend Integration Pending
**Phase**: 9 - Content Management System
**Last Updated**: January 2025

---

## Overview

The Custom CMS Module enables admins to manage site content and structure without code changes. It covers:

1. **Header Configuration** - Logo, navigation menu, announcement bar
2. **Footer Configuration** - Footer columns, links, social media, copyright
3. **Content Pages** - Custom pages with drag-and-drop sections (coming soon)
4. **Media Library** - Upload and manage images/files (coming soon)

---

## Architecture

### Database Schema

**`site_config` table** - Stores header/footer/announcement configuration

- `id` (UUID, primary key)
- `type` (String, unique) - "header", "footer", "announcement"
- `config` (JSON) - Flexible configuration object
- `isActive` (Boolean, default true)
- `updatedAt` (DateTime)
- `updatedBy` (String, optional) - User ID who made the change

**`content_pages` table** - Stores custom pages

- `id` (UUID, primary key)
- `slug` (String, unique) - URL-friendly identifier
- `title` (String) - Page title
- `metaTitle` (String, optional) - SEO meta title
- `metaDesc` (String, optional) - SEO meta description
- `ogImage` (String, optional) - Open Graph image URL
- `isPublished` (Boolean, default false)
- `publishedAt` (DateTime, optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**`content_sections` table** - Reusable page sections

- `id` (UUID, primary key)
- `pageId` (String, foreign key) - References content_pages
- `type` (String) - "hero", "text", "cta", "products", etc.
- `order` (Int, default 0) - Display order
- `settings` (JSON) - Section configuration
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

**`media_assets` table** - Media library

- `id` (UUID, primary key)
- `filename` (String) - Original filename
- `url` (String) - CDN/storage URL
- `mimeType` (String) - File type (image/jpeg, image/png, etc.)
- `size` (Int) - File size in bytes
- `folder` (String, default "general") - Organizational folder
- `uploadedBy` (String, optional) - User ID
- `createdAt` (DateTime)

---

## Backend API Endpoints

### Public Endpoints (No Authentication)

#### Get Site Configuration

```http
GET /api/cms/config/:type
```

**Parameters**:

- `type` - "header", "footer", or "announcement"

**Response**:

```json
{
  "type": "header",
  "config": {
    "logo": {
      "url": "/logo.png",
      "alt": "RachelFoods"
    },
    "navigation": [
      { "label": "Home", "href": "/", "order": 1 },
      { "label": "Products", "href": "/catalog", "order": 2 }
    ],
    "announcement": {
      "enabled": true,
      "text": "Free shipping on orders over $50!",
      "link": "/catalog",
      "backgroundColor": "#10b981",
      "textColor": "#ffffff"
    }
  },
  "isActive": true,
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Get Published Page

```http
GET /api/cms/pages/:slug
```

**Parameters**:

- `slug` - Page URL slug (e.g., "about-us", "faq")

**Response**:

```json
{
  "id": "uuid",
  "slug": "about-us",
  "title": "About Us",
  "metaTitle": "About RachelFoods - Traditional Food Experts",
  "metaDesc": "Learn about our mission to bring authentic traditional foods...",
  "sections": [
    {
      "id": "uuid",
      "type": "hero",
      "order": 1,
      "settings": {
        "heading": "About RachelFoods",
        "subheading": "Traditional foods, modern convenience",
        "backgroundImage": "/hero-about.jpg"
      }
    }
  ],
  "isPublished": true,
  "publishedAt": "2025-01-10T12:00:00Z"
}
```

---

### Admin Endpoints (Requires ADMIN or STAFF Role)

#### Get Configuration (with unpublished data)

```http
GET /api/admin/cms/config/:type
Authorization: Bearer <token>
```

#### Update Configuration (ADMIN Only)

```http
PUT /api/admin/cms/config/:type
Authorization: Bearer <token>
Content-Type: application/json

{
  "config": {
    "logo": { "url": "/new-logo.png", "alt": "New Logo" },
    "navigation": [...]
  }
}
```

#### List All Pages (ADMIN/STAFF)

```http
GET /api/admin/cms/pages?includeUnpublished=true
Authorization: Bearer <token>
```

#### Create Page (ADMIN Only)

```http
POST /api/admin/cms/pages
Authorization: Bearer <token>
Content-Type: application/json

{
  "slug": "terms-of-service",
  "title": "Terms of Service",
  "metaTitle": "Terms of Service - RachelFoods",
  "metaDesc": "Read our terms and conditions..."
}
```

#### Update Page (ADMIN Only)

```http
PUT /api/admin/cms/pages/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "metaDesc": "Updated description"
}
```

#### Publish/Unpublish Page (ADMIN Only)

```http
POST /api/admin/cms/pages/:id/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "publish": true
}
```

#### Delete Page (ADMIN Only)

```http
DELETE /api/admin/cms/pages/:id
Authorization: Bearer <token>
```

#### Add Section to Page (ADMIN Only)

```http
POST /api/admin/cms/sections
Authorization: Bearer <token>
Content-Type: application/json

{
  "pageId": "uuid",
  "type": "hero",
  "settings": {
    "heading": "Welcome",
    "backgroundImage": "/hero.jpg"
  }
}
```

#### Update Section (ADMIN Only)

```http
PUT /api/admin/cms/sections/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "settings": {
    "heading": "Updated Welcome Message"
  }
}
```

#### Reorder Sections (ADMIN Only)

```http
POST /api/admin/cms/sections/reorder
Authorization: Bearer <token>
Content-Type: application/json

{
  "pageId": "uuid",
  "sectionIds": ["uuid1", "uuid2", "uuid3"]
}
```

#### Get Media Library (ADMIN/STAFF)

```http
GET /api/admin/cms/media?folder=general
Authorization: Bearer <token>
```

#### Upload Media (ADMIN Only)

```http
POST /api/admin/cms/media
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "product-image.jpg",
  "url": "https://cdn.example.com/images/product-image.jpg",
  "mimeType": "image/jpeg",
  "size": 245678,
  "folder": "products"
}
```

#### Delete Media (ADMIN Only)

```http
DELETE /api/admin/cms/media/:id
Authorization: Bearer <token>
```

---

## Admin UI Components

### Header Manager

**Location**: `/admin/cms/header`
**File**: `frontend/app/admin/cms/header/page.tsx`

**Features**:

- Logo URL and alt text editor
- Navigation menu builder:
  - Add/remove menu items
  - Edit label and href
  - Reorder with up/down buttons
- Announcement bar configuration:
  - Enable/disable toggle
  - Text and link editor
  - Background and text color pickers
  - Live preview

**Screenshot**: [Coming soon]

---

### Footer Manager

**Location**: `/admin/cms/footer`
**File**: `frontend/app/admin/cms/footer/page.tsx`

**Features**:

- Footer column builder:
  - Add/remove columns
  - Edit column title
  - Add/remove links per column
- Social media URLs (Facebook, Twitter, Instagram, LinkedIn)
- Copyright text editor
- Payment icons toggle
- Live preview of footer layout

**Screenshot**: [Coming soon]

---

### Page Manager (Coming Soon)

**Location**: `/admin/cms/pages`

**Planned Features**:

- Page list with search/filter
- Create new page form
- Page editor with section builder
- Drag-and-drop section ordering
- Section types:
  - Hero banner (heading, subheading, CTA, background image)
  - Text block (rich text editor)
  - Call-to-Action (button, text, link)
  - Product showcase (select products to display)
  - Testimonials (customer reviews)
  - FAQ accordion
- Publish/unpublish toggle
- SEO meta tag editor

---

### Media Library (Coming Soon)

**Location**: `/admin/cms/media`

**Planned Features**:

- File upload (drag-and-drop)
- Grid view of uploaded files
- Search and folder filtering
- Copy URL button
- Delete functionality
- Integration with Cloudinary or AWS S3

---

## Frontend Integration

### Update Header Component (Pending)

**File**: `frontend/components/Header.tsx`

**Changes Required**:

```typescript
// Add CMS config state
const [headerConfig, setHeaderConfig] = useState(null);

// Fetch CMS config on mount
useEffect(() => {
  async function fetchHeaderConfig() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cms/config/header`);
      const data = await response.json();
      setHeaderConfig(data.config);
    } catch (error) {
      console.error('Failed to load header config:', error);
      // Fallback to hardcoded values
    }
  }
  fetchHeaderConfig();
}, []);

// Use headerConfig for logo and navigation
{headerConfig && (
  <>
    <Link href="/">
      <Image src={headerConfig.logo.url} alt={headerConfig.logo.alt} />
    </Link>
    {headerConfig.navigation.map(item => (
      <Link key={item.href} href={item.href}>{item.label}</Link>
    ))}
  </>
)}

// Render announcement bar if enabled
{headerConfig?.announcement?.enabled && (
  <div style={{ backgroundColor: headerConfig.announcement.backgroundColor, color: headerConfig.announcement.textColor }}>
    <Link href={headerConfig.announcement.link}>
      {headerConfig.announcement.text}
    </Link>
  </div>
)}
```

---

### Update Footer Component (Pending)

**File**: `frontend/components/Footer.tsx`

**Changes Required**:

```typescript
// Add CMS config state
const [footerConfig, setFooterConfig] = useState(null);

// Fetch CMS config on mount
useEffect(() => {
  async function fetchFooterConfig() {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cms/config/footer`);
      const data = await response.json();
      setFooterConfig(data.config);
    } catch (error) {
      console.error('Failed to load footer config:', error);
      // Fallback to hardcoded values
    }
  }
  fetchFooterConfig();
}, []);

// Use footerConfig for columns, links, social, copyright
{footerConfig && (
  <>
    {footerConfig.columns.map(column => (
      <div key={column.title}>
        <h3>{column.title}</h3>
        <ul>
          {column.links.map(link => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    ))}
    <div className="social-links">
      {footerConfig.social.facebook && <a href={footerConfig.social.facebook}>Facebook</a>}
      {footerConfig.social.twitter && <a href={footerConfig.social.twitter}>Twitter</a>}
      {/* ... other social links */}
    </div>
    <p>{footerConfig.copyright}</p>
  </>
)}
```

---

### Dynamic Page Route (Pending)

**File**: `frontend/app/pages/[slug]/page.tsx` (new file)

**Implementation**:

```typescript
export async function generateMetadata({ params }) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cms/pages/${params.slug}`);
  const page = await response.json();

  return {
    title: page.metaTitle || page.title,
    description: page.metaDesc,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDesc,
      images: page.ogImage ? [page.ogImage] : [],
    },
  };
}

export default async function DynamicPage({ params }) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/cms/pages/${params.slug}`);
  const page = await response.json();

  if (!page.isPublished) {
    notFound();
  }

  return (
    <div>
      <h1>{page.title}</h1>
      {page.sections.map(section => (
        <Section key={section.id} type={section.type} settings={section.settings} />
      ))}
    </div>
  );
}

// Section component renders different section types
function Section({ type, settings }) {
  switch (type) {
    case 'hero':
      return <HeroSection {...settings} />;
    case 'text':
      return <TextSection {...settings} />;
    case 'cta':
      return <CTASection {...settings} />;
    // ... other section types
    default:
      return null;
  }
}
```

---

## Migration Steps

### Step 1: Run Database Migration

```bash
cd backend
npx prisma migrate dev --name add_cms_tables
```

This creates the 4 CMS tables in PostgreSQL.

### Step 2: Test Backend API

```bash
# Start backend dev server
npm run start:dev

# Test GET default header config
curl http://localhost:3001/api/cms/config/header

# Test GET default footer config
curl http://localhost:3001/api/cms/config/footer
```

### Step 3: Seed Default Configuration

The CMS service automatically returns sensible defaults if no config exists. To save initial config:

```bash
# Login as admin and get JWT token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@rachelfoods.com", "password": "Admin123!"}'

# Save header config (replace <TOKEN>)
curl -X PUT http://localhost:3001/api/admin/cms/config/header \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "config": { ... } }'
```

### Step 4: Access Admin UI

1. Navigate to http://localhost:3000/admin
2. Login with admin credentials
3. Click "CMS" in sidebar (expandable menu)
4. Select "Header" or "Footer"
5. Edit configuration and click "Save Changes"

### Step 5: Update Frontend Components

1. Update `frontend/components/Header.tsx` to fetch from `/api/cms/config/header`
2. Update `frontend/components/Footer.tsx` to fetch from `/api/cms/config/footer`
3. Test on localhost to verify CMS content displays correctly

### Step 6: Deploy to Railway

```bash
# Commit changes
git add .
git commit -m "feat: Add Custom CMS Module (header/footer managers)"
git push origin main

# Railway auto-deploys on push
# Wait for deployment to complete

# SSH into Railway container and run migration
railway run npx prisma migrate deploy
```

### Step 7: Configure Production CMS

1. Navigate to https://yourdomain.com/admin
2. Login as admin
3. Go to CMS → Header and configure production header
4. Go to CMS → Footer and configure production footer
5. Verify changes appear on public site

---

## Default Configuration

### Header Defaults

```json
{
  "logo": {
    "url": "/logo.png",
    "alt": "RachelFoods"
  },
  "navigation": [
    { "label": "Home", "href": "/", "order": 1 },
    { "label": "Products", "href": "/catalog", "order": 2 },
    { "label": "About", "href": "/about", "order": 3 },
    { "label": "Contact", "href": "/contact", "order": 4 }
  ],
  "announcement": {
    "enabled": false,
    "text": "Welcome to RachelFoods!",
    "link": "/catalog",
    "backgroundColor": "#10b981",
    "textColor": "#ffffff"
  }
}
```

### Footer Defaults

```json
{
  "columns": [
    {
      "title": "Quick Links",
      "links": [
        { "label": "Home", "href": "/" },
        { "label": "Products", "href": "/catalog" },
        { "label": "About Us", "href": "/about" }
      ]
    },
    {
      "title": "Support",
      "links": [
        { "label": "FAQ", "href": "/faq" },
        { "label": "Contact", "href": "/contact" },
        { "label": "Shipping", "href": "/shipping" }
      ]
    },
    {
      "title": "Company",
      "links": [
        { "label": "Terms of Service", "href": "/terms" },
        { "label": "Privacy Policy", "href": "/privacy" }
      ]
    }
  ],
  "social": {
    "facebook": "https://facebook.com/rachelfoods",
    "twitter": "https://twitter.com/rachelfoods",
    "instagram": "https://instagram.com/rachelfoods",
    "linkedin": "https://linkedin.com/company/rachelfoods"
  },
  "copyright": "© 2025 RachelFoods. All rights reserved.",
  "paymentIcons": {
    "enabled": true,
    "icons": ["visa", "mastercard", "paypal", "stripe"]
  }
}
```

---

## Performance Optimization

### Caching Strategy

1. **Backend Cache**: 5-minute TTL for `/api/cms/config/*` endpoints
2. **Frontend Cache**: React state caching (persists until page refresh)
3. **Production**: Use CDN caching with `Cache-Control` headers

### Recommendation

For production, update backend controller to include cache headers:

```typescript
@Get('config/:type')
async getSiteConfig(@Param('type') type: string, @Res() res: Response) {
  const config = await this.cmsService.getSiteConfig(type);
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  return res.json(config);
}
```

---

## Security Considerations

### RBAC Enforcement

- **Public**: Read-only access to published content
- **STAFF**: Read access to all content (including unpublished)
- **ADMIN**: Full CRUD access to all CMS features

### Input Validation

All CMS inputs are validated:

- Slug format: lowercase, hyphens only, no spaces
- URLs: Validated against XSS
- JSON configs: Schema validation (coming soon)

### Audit Logging

All CMS changes are logged:

- User ID who made the change
- Timestamp of change
- Previous and new values (for rollback capability)

---

## Roadmap

### Phase 9A (Current - Complete)

- ✅ Database schema
- ✅ Backend API endpoints
- ✅ Header manager UI
- ✅ Footer manager UI
- ✅ Admin navigation integration

### Phase 9B (Next - In Progress)

- ⏳ Run database migration
- ⏳ Update Header component to use CMS
- ⏳ Update Footer component to use CMS
- ⏳ Test complete flow

### Phase 9C (Future)

- Page manager UI
- Section builder (drag-and-drop)
- Media library with Cloudinary integration
- Rich text editor for text sections
- Dynamic page routing
- SEO optimization tools

### Phase 9D (Future Enhancements)

- Version history and rollback
- Multi-language support (i18n)
- Preview mode (see changes before publishing)
- Scheduled publishing
- Collaboration features (drafts, comments)
- Analytics integration (track page views)

---

## Troubleshooting

### "Can't reach database server"

**Issue**: Migration fails with connection error
**Solution**:

1. Check `.env` file has correct `DATABASE_URL`
2. Ensure database server is running
3. For Railway, use `railway run npx prisma migrate deploy` instead

### "Unauthorized" when accessing admin endpoints

**Issue**: 401 Unauthorized error
**Solution**:

1. Ensure you're logged in as ADMIN
2. Check JWT token is included in `Authorization` header
3. Verify token hasn't expired (refresh if needed)

### CMS menu not showing in admin nav

**Issue**: CMS submenu missing
**Solution**:

1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check AdminNav component updated correctly

### Changes not reflecting on frontend

**Issue**: Updated header/footer not showing
**Solution**:

1. Clear browser cache
2. Check frontend components are fetching from CMS API
3. Verify API returns correct data (check network tab)
4. For production, wait 5 minutes for cache to expire

---

## Support

For technical issues or questions:

1. Check this documentation first
2. Review backend logs: `npm run start:dev` output
3. Check browser console for frontend errors
4. Verify database migrations ran successfully
5. Contact system administrator if issue persists

---

**Last Updated**: January 15, 2025  
**Version**: 1.0.0  
**Author**: RachelFoods Development Team
