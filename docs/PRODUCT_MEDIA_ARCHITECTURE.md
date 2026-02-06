# Product Media Upload - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PRODUCT MEDIA UPLOAD SYSTEM                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND LAYER                               │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ FileUpload Component (components/ui/FileUpload.tsx)                │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐   │  │
│  │  │ Drag & Drop │   │ File Preview │   │ Metadata Editing    │   │  │
│  │  │ Zone        │──▶│ Generation   │──▶│ (Alt text, titles)  │   │  │
│  │  └─────────────┘   └──────────────┘   └─────────────────────┘   │  │
│  │         │                  │                      │              │  │
│  │         ▼                  ▼                      ▼              │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ State Management: UploadedFile[]                           │ │  │
│  │  │  - id, file, url, type, preview                            │ │  │
│  │  │  - altText, title, description, thumbnail                  │ │  │
│  │  │  - isPrimary, displayOrder                                 │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                  │                                        │
│                                  ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Product Pages                                                      │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  /admin/products/create          /admin/products/[id]             │  │
│  │  ┌────────────────────┐          ┌─────────────────────┐          │  │
│  │  │ New Product Page   │          │ Edit Product Page   │          │  │
│  │  ├────────────────────┤          ├─────────────────────┤          │  │
│  │  │ 1. Form Data       │          │ 1. Load Existing    │          │  │
│  │  │ 2. FileUpload      │          │ 2. Show Media       │          │  │
│  │  │ 3. Submit Handler  │          │ 3. Update Media     │          │  │
│  │  └────────────────────┘          └─────────────────────┘          │  │
│  │         │                                   │                      │  │
│  └─────────┼───────────────────────────────────┼──────────────────────┘  │
│            │                                   │                         │
│            └───────────────┬───────────────────┘                         │
│                            ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Upload Service (lib/upload.ts)                                     │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  uploadFile()  ──▶  File Storage Service  ──▶  Returns URL        │  │
│  │  validateFile()     (Cloudinary/S3/Custom)                         │  │
│  │  getOptimizedUrl()                                                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                            │                                             │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────────┐
        │        FILE STORAGE (External Service)         │
        ├────────────────────────────────────────────────┤
        │                                                │
        │  Option A: Cloudinary                          │
        │  ┌──────────────────────────────────────────┐  │
        │  │ • Upload API                             │  │
        │  │ • Auto-optimization                      │  │
        │  │ • CDN delivery                           │  │
        │  │ • Transformations                        │  │
        │  └──────────────────────────────────────────┘  │
        │                                                │
        │  Option B: AWS S3                              │
        │  ┌──────────────────────────────────────────┐  │
        │  │ • S3 bucket                              │  │
        │  │ • CloudFront CDN                         │  │
        │  │ • Lambda image processing                │  │
        │  └──────────────────────────────────────────┘  │
        │                                                │
        │  Option C: Custom Backend Storage              │
        │  ┌──────────────────────────────────────────┐  │
        │  │ • Local filesystem                       │  │
        │  │ • Database storage                       │  │
        │  │ • Custom CDN                             │  │
        │  └──────────────────────────────────────────┘  │
        └────────────────────────────────────────────────┘
                             │
                             │ Returns: secure_url
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER                                │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ API Endpoints                                                      │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  POST   /api/admin/products                                        │  │
│  │  PUT    /api/admin/products/:id                                    │  │
│  │  ├─▶ CreateProductDto / UpdateProductDto                           │  │
│  │  │      - Basic fields (name, price, etc.)                         │  │
│  │  │      - images: ProductImageDto[]                                │  │
│  │  │      - videos: ProductVideoDto[]                                │  │
│  │  │                                                                  │  │
│  │  POST   /api/admin/products/:id/images                             │  │
│  │  PUT    /api/admin/products/:id/images/:imageId                    │  │
│  │  DELETE /api/admin/products/:id/images/:imageId                    │  │
│  │  PUT    /api/admin/products/:id/images/reorder                     │  │
│  │  │                                                                  │  │
│  │  POST   /api/admin/products/:id/videos                             │  │
│  │  PUT    /api/admin/products/:id/videos/:videoId                    │  │
│  │  DELETE /api/admin/products/:id/videos/:videoId                    │  │
│  │  PUT    /api/admin/products/:id/videos/reorder                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                            │                                             │
│                            ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ProductMediaService (product-media.service.ts)                     │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  addProductImages()                                                │  │
│  │  ├─▶ Validate product exists                                       │  │
│  │  ├─▶ Calculate display order                                       │  │
│  │  ├─▶ Create image records                                          │  │
│  │  └─▶ Ensure single primary                                         │  │
│  │                                                                    │  │
│  │  updateProductImage()                                              │  │
│  │  ├─▶ Find existing image                                           │  │
│  │  ├─▶ Update fields                                                 │  │
│  │  └─▶ Handle primary change                                         │  │
│  │                                                                    │  │
│  │  deleteProductImage()                                              │  │
│  │  ├─▶ Delete record                                                 │  │
│  │  └─▶ Reassign primary if needed                                    │  │
│  │                                                                    │  │
│  │  reorderProductImages()                                            │  │
│  │  └─▶ Batch update display order                                    │  │
│  │                                                                    │  │
│  │  Similar methods for videos...                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                            │                                             │
│                            ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ ProductsService (products.service.ts)                              │  │
│  ├────────────────────────────────────────────────────────────────────┤  │
│  │                                                                    │  │
│  │  create(createProductDto)                                          │  │
│  │  ├─▶ Extract images and videos                                     │  │
│  │  ├─▶ Create product                                                │  │
│  │  ├─▶ Add images via ProductMediaService                            │  │
│  │  ├─▶ Add videos via ProductMediaService                            │  │
│  │  └─▶ Return product with relations                                 │  │
│  │                                                                    │  │
│  │  update(id, updateProductDto)                                      │  │
│  │  ├─▶ Extract images and videos                                     │  │
│  │  ├─▶ Update product fields                                         │  │
│  │  ├─▶ Replace images if provided                                    │  │
│  │  ├─▶ Replace videos if provided                                    │  │
│  │  └─▶ Return updated product                                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                            │                                             │
└────────────────────────────┼─────────────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                            DATABASE LAYER                                 │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────┐       ┌─────────────────────┐                  │
│  │    products         │       │  product_images     │                  │
│  ├─────────────────────┤       ├─────────────────────┤                  │
│  │ id (PK)             │◀──┐   │ id (PK)             │                  │
│  │ name                │   │   │ productId (FK) ─────┼──┐               │
│  │ description         │   └───┼──▶ product          │  │               │
│  │ price               │       │ url                 │  │               │
│  │ stock               │       │ altText             │  │               │
│  │ status              │       │ displayOrder        │  │               │
│  │ ...                 │       │ isPrimary           │  │               │
│  └─────────────────────┘       │ createdAt           │  │               │
│           │                    │ updatedAt           │  │               │
│           │                    └─────────────────────┘  │               │
│           │                                             │               │
│           │                    ┌─────────────────────┐  │               │
│           │                    │  product_videos     │  │               │
│           │                    ├─────────────────────┤  │               │
│           │                    │ id (PK)             │  │               │
│           │                    │ productId (FK) ─────┼──┘               │
│           └────────────────────┼──▶ product          │                  │
│                                │ url                 │                  │
│                                │ title               │                  │
│                                │ description         │                  │
│                                │ thumbnail           │                  │
│                                │ duration            │                  │
│                                │ displayOrder        │                  │
│                                │ createdAt           │                  │
│                                │ updatedAt           │                  │
│                                └─────────────────────┘                  │
│                                                                           │
│  Indexes:                                                                 │
│  - product_images: (productId), (productId, displayOrder), (isPrimary)   │
│  - product_videos: (productId), (productId, displayOrder)                │
│                                                                           │
│  Cascade Delete: ON DELETE CASCADE for media when product deleted        │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW EXAMPLE                               │
└───────────────────────────────────────────────────────────────────────────┘

User Creates Product with 3 Images and 1 Video:

1. [FRONTEND] User fills form and drags 3 images + 1 video
   └─▶ FileUpload generates previews
   └─▶ User sets image2 as primary
   └─▶ User adds alt text to all images
   └─▶ Clicks "Create Product"

2. [FRONTEND] uploadFilesToServer()
   └─▶ Uploads image1.jpg to Cloudinary → URL1
   └─▶ Uploads image2.jpg to Cloudinary → URL2
   └─▶ Uploads image3.jpg to Cloudinary → URL3
   └─▶ Uploads video.mp4 to Cloudinary → URL4

3. [FRONTEND] POST /api/admin/products
   {
     name: "Jollof Rice",
     price: 1500,
     images: [
       { url: URL1, altText: "...", displayOrder: 0, isPrimary: false },
       { url: URL2, altText: "...", displayOrder: 1, isPrimary: true },
       { url: URL3, altText: "...", displayOrder: 2, isPrimary: false }
     ],
     videos: [
       { url: URL4, title: "...", displayOrder: 0 }
     ]
   }

4. [BACKEND] ProductsService.create()
   └─▶ Extract images and videos
   └─▶ Create product record (ID: prod-123)
   └─▶ Call ProductMediaService.addProductImages(prod-123, images)
       └─▶ Create 3 product_images records
       └─▶ Ensure only image2 has isPrimary=true
   └─▶ Call ProductMediaService.addProductVideos(prod-123, videos)
       └─▶ Create 1 product_videos record

5. [DATABASE] Final State:
   products:
     { id: prod-123, name: "Jollof Rice", price: 1500, ... }

   product_images:
     { id: img-1, productId: prod-123, url: URL1, isPrimary: false, displayOrder: 0 }
     { id: img-2, productId: prod-123, url: URL2, isPrimary: true, displayOrder: 1 }
     { id: img-3, productId: prod-123, url: URL3, isPrimary: false, displayOrder: 2 }

   product_videos:
     { id: vid-1, productId: prod-123, url: URL4, displayOrder: 0 }

6. [BACKEND] Returns product with relations
   └─▶ Includes productImages[] and productVideos[]

7. [FRONTEND] Redirects to /admin/products
   └─▶ Shows success message
   └─▶ Product appears in list with primary image


┌───────────────────────────────────────────────────────────────────────────┐
│                         SECURITY FLOW                                     │
└───────────────────────────────────────────────────────────────────────────┘

1. File Validation (Frontend)
   ├─▶ Check file type (MIME + extension)
   ├─▶ Check file size (< 50MB)
   └─▶ Reject if invalid

2. Authentication (Backend)
   ├─▶ JWT token required
   ├─▶ Verify token signature
   └─▶ Extract user identity

3. Authorization (Backend)
   ├─▶ Check user role (ADMIN or STAFF)
   ├─▶ Verify permissions for operation
   └─▶ Reject if unauthorized

4. File Upload (Storage Service)
   ├─▶ Upload with signed request
   ├─▶ No credentials exposed to frontend
   ├─▶ Generate secure URLs
   └─▶ Set appropriate ACLs

5. Data Validation (Backend)
   ├─▶ Validate DTOs with class-validator
   ├─▶ Sanitize inputs
   ├─▶ Check URL formats
   └─▶ Prevent injection attacks

6. Database Operations
   ├─▶ Use parameterized queries (Prisma)
   ├─▶ Transaction safety
   └─▶ Cascade deletes for cleanup
```
