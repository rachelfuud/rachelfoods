# Product Multi-Media Upload System

## Overview

The product management system now supports multiple images and videos with drag-and-drop upload functionality. This allows admins to create rich product listings with comprehensive visual content.

## Features

### 🖼️ **Multiple Images**

- Upload up to 15 images per product
- Drag and drop or click to browse
- Image preview before upload
- Set primary/featured image
- Add alt text for SEO
- Reorder images with up/down arrows
- Maximum file size: 50MB per image
- Supported formats: JPEG, PNG, GIF, WebP

### 🎥 **Video Support**

- Upload product demonstration videos
- Automatic thumbnail generation
- Video metadata (title, description, duration)
- Reorder videos
- Maximum file size: 50MB per video
- Supported formats: MP4, WebM, QuickTime

### 🎨 **User Experience**

- **Drag & Drop**: Drag files directly onto the upload zone
- **Batch Upload**: Upload multiple files at once
- **Live Preview**: See thumbnails immediately
- **Primary Image Badge**: Visual indicator for main product image
- **Remove/Reorder**: Inline controls for media management
- **Metadata Editing**: Add alt text, titles, descriptions

## File Structure

### Frontend Components

#### `frontend/components/ui/FileUpload.tsx`

Main drag-and-drop component with media management.

**Props:**

```typescript
interface FileUploadProps {
  files: UploadedFile[]; // Current files
  onChange: (files: UploadedFile[]) => void; // Update handler
  maxFiles?: number; // Max files allowed (default: 10)
  acceptImages?: boolean; // Accept images (default: true)
  acceptVideos?: boolean; // Accept videos (default: true)
  maxSizeInMB?: number; // Max file size (default: 50)
  className?: string; // Custom CSS classes
}

interface UploadedFile {
  id: string;
  file?: File; // File object (for new uploads)
  url: string; // Remote URL (after upload)
  type: "image" | "video";
  preview?: string; // Local preview URL
  altText?: string; // Image alt text
  title?: string; // Video title
  description?: string; // Video description
  thumbnail?: string; // Video thumbnail URL
  duration?: number; // Video duration (seconds)
  isPrimary?: boolean; // Is primary/featured
  displayOrder?: number; // Display order
}
```

**Features:**

- Validates file type and size
- Generates video thumbnails automatically
- Handles primary image selection
- Provides reordering controls
- Inline metadata editing

#### `frontend/app/admin/products/create/page.tsx`

New product creation page with multi-media support.

**Key Functions:**

```typescript
// Upload files to storage service
uploadFilesToServer(files: UploadedFile[]): Promise<UploadedFile[]>

// Create product with images and videos
handleSubmit(): Promise<void>
```

#### `frontend/app/admin/products/[id]/page.tsx`

Product edit page with media management.

**Key Functions:**

```typescript
// Load existing product with media
fetchProduct(): Promise<void>

// Update product with new/modified media
handleSubmit(): Promise<void>
```

### Backend API

#### `backend/src/products/dto/create-product.dto.ts`

```typescript
export class CreateProductDto {
  name: string;
  description?: string;
  price: number;
  categoryId?: string;
  weight?: number;
  unit?: string;
  isPerishable?: boolean;
  images?: ProductImageDto[]; // NEW
  videos?: ProductVideoDto[]; // NEW
}

export class ProductImageDto {
  url: string;
  altText?: string;
  displayOrder?: number;
  isPrimary?: boolean;
}

export class ProductVideoDto {
  url: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  displayOrder?: number;
}
```

#### `backend/src/products/dto/update-product.dto.ts`

Extended with image/video support and validation decorators.

#### `backend/src/products/product-media.controller.ts`

API endpoints for media management:

```typescript
// Image Management
POST   /api/admin/products/:productId/images        // Add images
PUT    /api/admin/products/:productId/images/:id    // Update image
DELETE /api/admin/products/:productId/images/:id    // Delete image
PUT    /api/admin/products/:productId/images/reorder // Reorder images

// Video Management
POST   /api/admin/products/:productId/videos        // Add videos
PUT    /api/admin/products/:productId/videos/:id    // Update video
DELETE /api/admin/products/:productId/videos/:id    // Delete video
PUT    /api/admin/products/:productId/videos/reorder // Reorder videos
```

#### `backend/src/products/product-media.service.ts`

Business logic for media operations:

**Key Methods:**

```typescript
addProductImages(productId, images): Promise<ProductImage[]>
updateProductImage(productId, imageId, image): Promise<ProductImage>
deleteProductImage(productId, imageId): Promise<void>
reorderProductImages(productId, imageIds): Promise<ProductImage[]>

addProductVideos(productId, videos): Promise<ProductVideo[]>
updateProductVideo(productId, videoId, video): Promise<ProductVideo>
deleteProductVideo(productId, videoId): Promise<void>
reorderProductVideos(productId, videoIds): Promise<ProductVideo[]>

getProductMedia(productId): Promise<{ images, videos }>
ensureSinglePrimaryImage(productId, primaryId): Promise<void>
```

### Database Schema

#### `product_images` Table

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

  @@index([productId])
  @@index([productId, displayOrder])
  @@index([isPrimary])
}
```

#### `product_videos` Table

```prisma
model product_videos {
  id           String   @id @default(uuid())
  productId    String
  url          String
  title        String?
  description  String?
  thumbnail    String?
  duration     Int?
  displayOrder Int      @default(0)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  product      products @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId])
  @@index([productId, displayOrder])
}
```

## Usage Guide

### Creating a Product with Media

1. **Navigate to Product Creation**
   - Go to `/admin/products/create`

2. **Fill Basic Information**
   - Product name, description, price, stock, etc.

3. **Upload Media**
   - **Drag & Drop**: Drag images/videos onto the upload zone
   - **Click to Browse**: Click the upload zone to select files
   - **Batch Upload**: Select multiple files at once

4. **Manage Media**
   - **Set Primary**: Click "Set as Primary" on preferred image
   - **Add Alt Text**: Enter SEO-friendly alt text for images
   - **Add Video Info**: Enter title and description for videos
   - **Reorder**: Use ↑↓ buttons to change display order
   - **Remove**: Click ✕ to delete any media item

5. **Submit**
   - Click "Create Product" to save

### Editing Product Media

1. **Navigate to Product Edit**
   - Go to `/admin/products/[productId]`

2. **View Existing Media**
   - All current images and videos load automatically
   - Primary image is indicated with badge

3. **Add New Media**
   - Upload additional images/videos
   - Mix of old and new media is preserved

4. **Update Metadata**
   - Edit alt text, titles, descriptions inline
   - Changes save when you submit the form

5. **Reorder or Remove**
   - Adjust display order with arrow buttons
   - Remove unwanted media with ✕ button

6. **Save Changes**
   - Click "Save Changes" to update product

## File Upload Flow

### Frontend Upload Process

```
1. User selects/drags files
   ↓
2. FileUpload component validates:
   - File size (max 50MB)
   - File type (images/videos)
   - Max file count (15)
   ↓
3. Generate previews:
   - Images: Direct object URL
   - Videos: Extract thumbnail at 1 second
   ↓
4. Store in local state
   ↓
5. On form submit:
   - Upload files to storage service
   - Get permanent URLs
   - Send to backend API
```

### Backend Processing

```
1. Receive product data with images/videos
   ↓
2. Validate product details
   ↓
3. Create product record
   ↓
4. Create product_images records
   - Assign display order
   - Set primary image
   ↓
5. Create product_videos records
   - Assign display order
   ↓
6. Return created product with media
```

## File Storage Integration

### TODO: Implement File Upload Service

Currently, the system uses placeholder URLs. To enable real file uploads:

#### Option 1: AWS S3

```typescript
// frontend/lib/upload.ts
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_KEY,
});

export async function uploadToS3(file: File): Promise<string> {
  const params = {
    Bucket: "rachelfoods-media",
    Key: `products/${Date.now()}-${file.name}`,
    Body: file,
    ContentType: file.type,
  };

  const result = await s3.upload(params).promise();
  return result.Location;
}
```

#### Option 2: Cloudinary

```typescript
// frontend/lib/upload.ts
export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "rachelfoods");

  const response = await fetch("https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  return data.secure_url;
}
```

#### Option 3: Custom Backend Upload

```typescript
// backend/src/upload/upload.controller.ts
import { Controller, Post, UseInterceptors, UploadedFile } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";

@Controller("api/upload")
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname}`;
          cb(null, uniqueName);
        },
      }),
    })
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return {
      url: `/uploads/${file.filename}`,
    };
  }
}
```

Then update `uploadFilesToServer` in product pages:

```typescript
const uploadFilesToServer = async (files: UploadedFile[]) => {
  const uploadedUrls = await Promise.all(
    files.map(async (file) => {
      if (file.file) {
        const url = await uploadToS3(file.file); // or uploadToCloudinary
        return { ...file, url };
      }
      return file;
    })
  );
  return uploadedUrls;
};
```

## API Examples

### Create Product with Media

```bash
POST /api/admin/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Traditional Jollof Rice",
  "description": "Authentic Nigerian jollof rice",
  "price": 1500,
  "stock": 100,
  "unit": "pack",
  "images": [
    {
      "url": "https://storage.example.com/jollof-1.jpg",
      "altText": "Traditional Jollof Rice - Front View",
      "displayOrder": 0,
      "isPrimary": true
    },
    {
      "url": "https://storage.example.com/jollof-2.jpg",
      "altText": "Traditional Jollof Rice - Serving",
      "displayOrder": 1,
      "isPrimary": false
    }
  ],
  "videos": [
    {
      "url": "https://storage.example.com/jollof-recipe.mp4",
      "title": "How to Prepare Jollof Rice",
      "description": "Step-by-step cooking demonstration",
      "thumbnail": "https://storage.example.com/jollof-thumb.jpg",
      "duration": 180,
      "displayOrder": 0
    }
  ]
}
```

### Add Images to Existing Product

```bash
POST /api/admin/products/product-id-123/images
Authorization: Bearer <token>
Content-Type: application/json

[
  {
    "url": "https://storage.example.com/new-image.jpg",
    "altText": "Additional product photo",
    "displayOrder": 3
  }
]
```

### Reorder Product Images

```bash
PUT /api/admin/products/product-id-123/images/reorder
Authorization: Bearer <token>
Content-Type: application/json

["image-id-1", "image-id-3", "image-id-2", "image-id-4"]
```

## Best Practices

### Image Guidelines

- **Dimensions**: Minimum 800x800px, recommended 1200x1200px
- **Aspect Ratio**: Square (1:1) or product shots (4:3)
- **Format**: JPEG for photos, PNG for graphics with transparency
- **Compression**: Optimize images to 80-90% quality
- **Alt Text**: Descriptive, includes product name and key features

### Video Guidelines

- **Length**: 30 seconds to 2 minutes ideal
- **Format**: MP4 (H.264) for best compatibility
- **Resolution**: 720p minimum, 1080p recommended
- **Thumbnail**: Clear frame showing product (capture at 1-2 seconds)
- **File Size**: Compress to under 20MB when possible

### SEO Optimization

- Use descriptive alt text for all images
- Include product name in image filenames
- Add video titles and descriptions
- Set appropriate display order (best images first)
- Always set a primary image

## Troubleshooting

### Upload Fails

- **File too large**: Reduce file size or compress
- **Unsupported format**: Convert to supported format
- **Network error**: Check internet connection, retry

### Preview Not Showing

- **Image**: Check URL is valid and accessible
- **Video**: Ensure video format is supported by browser
- **Thumbnail**: Video thumbnail generation may take a few seconds

### Primary Image Not Displaying

- **Multiple primary**: Only one image can be primary
- **No primary set**: First image is used by default
- **Cache**: Clear browser cache and refresh

## Future Enhancements

- [ ] **Image Editing**: Crop, resize, rotate images in-browser
- [ ] **Video Trimming**: Trim video length before upload
- [ ] **Bulk Upload**: Upload entire folder of images
- [ ] **CDN Integration**: Automatic CDN distribution
- [ ] **Image Variants**: Auto-generate thumbnails and sizes
- [ ] **Video Transcoding**: Auto-convert to web-optimized formats
- [ ] **360° Images**: Product spin viewer
- [ ] **AR Preview**: Augmented reality product visualization

## Related Documentation

- [Product Management API](./MODULE_PRODUCT.md)
- [Admin Dashboard Guide](./PHASE_6B_ADMIN_UX_BUSINESS_INTELLIGENCE.md)
- [File Upload Security](./PHASE_7_PRE_LAUNCH_CHECKLIST.md#file-uploads)

---

**Last Updated**: February 6, 2026  
**Feature Status**: ✅ Implemented (File storage integration pending)
