# Product Multi-Media Support Documentation

## Overview

RachelFoods now supports **multiple images** and **videos** per product, enhancing the shopping experience with rich media galleries.

## Features

### Multiple Product Images

- **Upload multiple images** per product with ordering
- **Set primary image** displayed in product cards and listings
- **Alt text** for accessibility
- **Drag-and-drop reordering** (coming soon)
- **Automatic primary image** sync to product.imageUrl for backward compatibility

### Product Videos

- **Add demo/cooking videos** with YouTube, Vimeo, or direct URLs
- **Video metadata**: title, description, duration
- **Thumbnail images** for video previews
- **Multiple videos** per product with ordering

## Database Schema

### product_images Table

```prisma
model product_images {
  id           String   @id @default(uuid())
  productId    String
  url          String
  altText      String?
  displayOrder Int      @default(0)
  isPrimary    Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  product      products @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

### product_videos Table

```prisma
model product_videos {
  id           String   @id @default(uuid())
  productId    String
  url          String
  title        String?
  description  String?
  thumbnail    String?
  duration     Int?     // Duration in seconds
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  product      products @relation(fields: [productId], references: [id], onDelete: Cascade)
}
```

## API Endpoints

### Image Endpoints

#### Get All Images

```http
GET /admin/products/:productId/media/images
Authorization: Bearer {admin_token}
```

#### Add Images

```http
POST /admin/products/:productId/media/images
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "images": [
    {
      "url": "https://example.com/image1.jpg",
      "altText": "Product front view",
      "isPrimary": true
    },
    {
      "url": "/images/products/product-2.jpg",
      "altText": "Product side view"
    }
  ]
}
```

#### Update Image

```http
PUT /admin/products/:productId/media/images/:imageId
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "url": "https://example.com/updated.jpg",
  "altText": "Updated description",
  "isPrimary": true
}
```

#### Delete Image

```http
DELETE /admin/products/:productId/media/images/:imageId
Authorization: Bearer {admin_token}
```

#### Reorder Images

```http
POST /admin/products/:productId/media/images/reorder
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "imageIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### Video Endpoints

#### Get All Videos

```http
GET /admin/products/:productId/media/videos
Authorization: Bearer {admin_token}
```

#### Add Videos

```http
POST /admin/products/:productId/media/videos
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "videos": [
    {
      "url": "https://youtube.com/watch?v=abc123",
      "title": "How to Cook This Product",
      "description": "Step-by-step cooking guide",
      "thumbnail": "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
      "duration": 180
    }
  ]
}
```

#### Update Video

```http
PUT /admin/products/:productId/media/videos/:videoId
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Updated title",
  "duration": 200
}
```

#### Delete Video

```http
DELETE /admin/products/:productId/media/videos/:videoId
Authorization: Bearer {admin_token}
```

## Frontend Integration

### Using ProductMediaManager Component

```tsx
import { ProductMediaManager } from "@/components/ProductMediaManager";

export default function ProductEditPage({ productId }: { productId: string }) {
  return (
    <div>
      <h1>Edit Product</h1>

      {/* Other product form fields */}

      <ProductMediaManager productId={productId} />
    </div>
  );
}
```

### Read-Only Mode (Product Detail Page)

```tsx
<ProductMediaManager productId={productId} readonly={true} />
```

## Migration Instructions

### 1. Apply Database Migration

**Option A: Using Prisma Migrate (when DB is accessible)**

```bash
cd backend
npx prisma migrate dev --name add_product_media_tables
```

**Option B: Manual SQL (if DB connection issues)**
The tables are already in the schema. When the database is accessible, run:

```bash
npx prisma db push
```

### 2. Regenerate Prisma Client

```bash
cd backend
npx prisma generate
```

### 3. Seed Existing Products (Optional)

If you want to migrate existing `product.imageUrl` to the new `product_images` table:

```sql
-- For each product with imageUrl, create a primary image
INSERT INTO product_images (id, "productId", url, "altText", "displayOrder", "isPrimary", "createdAt", "updatedAt")
SELECT
  gen_random_uuid() as id,
  id as "productId",
  "imageUrl" as url,
  name as "altText",
  0 as "displayOrder",
  true as "isPrimary",
  now() as "createdAt",
  now() as "updatedAt"
FROM products
WHERE "imageUrl" IS NOT NULL;
```

## Usage Examples

### Admin Flow: Adding Product Images

1. **Go to Product Edit Page**
2. **Scroll to "Product Media" section**
3. **Click "Images" tab**
4. **Enter image URL** (e.g., `https://unsplash.com/...` or `/images/product.jpg`)
5. **Optional: Add alt text** for accessibility
6. **Check "Set as primary"** if this should be the main image
7. **Click "Add Image"**
8. **Repeat** for multiple images

### Admin Flow: Adding Product Videos

1. **Go to Product Edit Page**
2. **Click "Videos" tab**
3. **Enter video URL** (YouTube, Vimeo, or direct link)
4. **Add title and description**
5. **Optional: Add thumbnail URL**
6. **Enter duration in seconds**
7. **Click "Add Video"**

## Backward Compatibility

- ✅ **Existing `product.imageUrl`** still works for single-image products
- ✅ **Primary image auto-syncs** to `product.imageUrl`
- ✅ **Product cards** use `product.imageUrl` (shows primary image)
- ✅ **No breaking changes** to existing code

## Best Practices

### Image Guidelines

- **Format**: JPG or PNG
- **Size**: 800×800px minimum (1200×1200px recommended)
- **File Size**: Under 500KB per image
- **Naming**: Use descriptive filenames (e.g., `ayamase-mix-front.jpg`)
- **Alt Text**: Always provide for accessibility

### Video Guidelines

- **Platform**: YouTube or Vimeo preferred for bandwidth
- **Length**: Keep under 3 minutes for product demos
- **Quality**: 1080p recommended
- **Thumbnail**: Always provide a custom thumbnail
- **Format**: MP4 if self-hosted

## Troubleshooting

### Images Not Showing

1. Check if URL is accessible (try opening in browser)
2. Verify image is set as primary if it should appear in listings
3. Check browser console for CORS errors
4. Ensure image URL is HTTPS (not HTTP)

### Videos Not Playing

1. Verify URL is correct (test in new tab)
2. Check if platform (YouTube/Vimeo) is accessible
3. Ensure video is public (not private/unlisted)
4. Try opening video in new tab

### Primary Image Not Updating

1. Click "Set Primary" on desired image
2. Wait for page to reload
3. Check product listing to confirm update
4. Clear browser cache if needed

## Future Enhancements

- [ ] Direct file upload (Cloudinary/AWS S3 integration)
- [ ] Image cropping and resizing
- [ ] Drag-and-drop image reordering UI
- [ ] Bulk image upload
- [ ] Video upload (not just URLs)
- [ ] Image gallery carousel on product detail page
- [ ] Video player embed on product pages
- [ ] Image compression and optimization

## Support

For issues or questions, check:

- [Module Catalog](./MODULE_CATALOG.md)
- [Product Module Documentation](./MODULE_PRODUCT.md)
- [API Documentation](./API_DOCUMENTATION.md)
