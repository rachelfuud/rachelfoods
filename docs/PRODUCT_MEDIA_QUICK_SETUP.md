# Quick Setup: Multi-Media Product Upload

## What's Been Updated

✅ **Frontend**

- New `FileUpload` component with drag & drop
- Updated product creation page at `/admin/products/create`
- Updated product edit page at `/admin/products/[id]`
- Support for multiple images and videos

✅ **Backend**

- Extended DTOs to support images and videos arrays
- New `ProductMediaController` for media management
- New `ProductMediaService` with CRUD operations
- API endpoints for image/video management

✅ **Database**

- Schema already has `product_images` and `product_videos` tables
- Relations configured with `products` table

## Files Created/Modified

### New Files

```
frontend/components/ui/FileUpload.tsx
frontend/app/admin/products/create/page.tsx
frontend/app/admin/products/[id]/page.tsx
backend/src/products/product-media.controller.ts
backend/src/products/product-media.service.ts
docs/PRODUCT_MEDIA_UPLOAD_GUIDE.md
```

### Modified Files

```
backend/src/products/dto/create-product.dto.ts
backend/src/products/dto/update-product.dto.ts
```

## Next Steps to Make It Production-Ready

### 1. Register New Backend Controllers

**File: `backend/src/products/products.module.ts`**

Add to module:

```typescript
import { ProductMediaController } from "./product-media.controller";
import { ProductMediaService } from "./product-media.service";

@Module({
  imports: [PrismaModule],
  controllers: [
    ProductsController,
    ProductMediaController, // ADD THIS
  ],
  providers: [
    ProductsService,
    ProductMediaService, // ADD THIS
  ],
  exports: [
    ProductsService,
    ProductMediaService, // ADD THIS
  ],
})
export class ProductsModule {}
```

### 2. Update Product Service to Handle Media

**File: `backend/src/products/products.service.ts`** (or similar)

Update create/update methods to handle images and videos:

```typescript
import { ProductMediaService } from "./product-media.service";

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private productMediaService: ProductMediaService // INJECT
  ) {}

  async create(createProductDto: CreateProductDto, userId: string) {
    const { images, videos, ...productData } = createProductDto;

    // Create product first
    const product = await this.prisma.products.create({
      data: {
        ...productData,
        createdBy: userId,
        // ... other fields
      },
    });

    // Add images if provided
    if (images && images.length > 0) {
      await this.productMediaService.addProductImages(product.id, images);
    }

    // Add videos if provided
    if (videos && videos.length > 0) {
      await this.productMediaService.addProductVideos(product.id, videos);
    }

    // Return product with media
    return await this.findOne(product.id);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const { images, videos, ...productData } = updateProductDto;

    // Update product
    const product = await this.prisma.products.update({
      where: { id },
      data: productData,
    });

    // Update images if provided
    if (images !== undefined) {
      // Delete existing images
      await this.prisma.product_images.deleteMany({
        where: { productId: id },
      });

      // Add new images
      if (images.length > 0) {
        await this.productMediaService.addProductImages(id, images);
      }
    }

    // Update videos if provided
    if (videos !== undefined) {
      await this.prisma.product_videos.deleteMany({
        where: { productId: id },
      });

      if (videos.length > 0) {
        await this.productMediaService.addProductVideos(id, videos);
      }
    }

    return await this.findOne(id);
  }

  async findOne(id: string) {
    return await this.prisma.products.findUnique({
      where: { id },
      include: {
        productImages: {
          orderBy: { displayOrder: "asc" },
        },
        productVideos: {
          orderBy: { displayOrder: "asc" },
        },
        category: true,
      },
    });
  }
}
```

### 3. Install Missing Dependencies (if needed)

```bash
# Backend
cd backend
npm install class-validator class-transformer

# Frontend
cd frontend
npm install lucide-react  # For icons in FileUpload component
```

### 4. Implement File Storage

Choose one option:

#### Option A: Cloudinary (Recommended for MVP)

```bash
npm install cloudinary
```

Create `frontend/lib/upload.ts`:

```typescript
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "rachelfoods_products");

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await response.json();
  return data.secure_url;
}
```

#### Option B: AWS S3

See full implementation in `docs/PRODUCT_MEDIA_UPLOAD_GUIDE.md`

#### Option C: Backend Upload

Create upload endpoint in backend - see guide for details

### 5. Update Frontend Upload Function

**Files: `frontend/app/admin/products/create/page.tsx` and `[id]/page.tsx`**

Replace the placeholder `uploadFilesToServer` function:

```typescript
import { uploadFile } from "@/lib/upload";

const uploadFilesToServer = async (files: UploadedFile[]) => {
  const uploadedUrls = await Promise.all(
    files.map(async (file) => {
      if (file.file) {
        // Upload to storage service
        const url = await uploadFile(file.file);
        return { ...file, url };
      }
      return file; // Already uploaded file
    })
  );
  return uploadedUrls;
};
```

### 6. Test the Feature

1. **Start backend**:

   ```bash
   cd backend
   npm run start:dev
   ```

2. **Start frontend**:

   ```bash
   cd frontend
   npm run dev
   ```

3. **Test product creation**:
   - Go to `http://localhost:3000/admin/products/create`
   - Fill in product details
   - Drag and drop images/videos
   - Set primary image
   - Add alt text
   - Create product

4. **Test product editing**:
   - Go to existing product edit page
   - Verify existing media loads
   - Add new media
   - Update metadata
   - Save changes

## Usage Examples

### Create Product with Images

```
1. Navigate to /admin/products/create
2. Enter product name, description, price
3. Drag 3 images onto upload zone
4. Click "Set as Primary" on best image
5. Add alt text: "Product name - View 1", etc.
6. Click "Create Product"
```

### Edit Product Media

```
1. Navigate to /admin/products/[id]
2. Existing images load automatically
3. Drag additional images to add
4. Click X on unwanted images to remove
5. Use ↑↓ buttons to reorder
6. Click "Save Changes"
```

## Troubleshooting

### "Cannot find module 'lucide-react'"

```bash
cd frontend
npm install lucide-react
```

### Backend validation errors

Ensure `class-validator` and `class-transformer` are installed:

```bash
cd backend
npm install class-validator class-transformer
```

### Images not displaying

- Check browser console for CORS errors
- Verify image URLs are publicly accessible
- Check file storage service configuration

### Module import errors

Ensure `ProductMediaController` and `ProductMediaService` are registered in `products.module.ts`

## What You Get

✅ Drag & drop file upload  
✅ Multiple images per product  
✅ Video support with thumbnails  
✅ Primary image selection  
✅ Image reordering  
✅ Alt text for SEO  
✅ Video metadata (title, description)  
✅ File validation (size, type)  
✅ Preview before upload  
✅ Edit existing product media

## Next Steps

1. Register controllers in module
2. Choose and implement file storage
3. Update product service to handle media
4. Test thoroughly
5. Deploy to production

See `docs/PRODUCT_MEDIA_UPLOAD_GUIDE.md` for complete documentation.

---

**Quick Test Checklist:**

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Upload zone visible on product pages
- [ ] Can drag files onto zone
- [ ] Files appear with previews
- [ ] Can set primary image
- [ ] Can add alt text/metadata
- [ ] Can create product successfully
- [ ] Can edit product and see existing media
- [ ] Media persists after page refresh
