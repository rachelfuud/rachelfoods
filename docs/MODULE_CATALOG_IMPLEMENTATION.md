# Catalog Module Implementation – RachelFoods

## Overview

The Catalog Module provides comprehensive product and category management for the RachelFoods platform. It implements:
- **Category Management**: Hierarchical organization with flexible nesting
- **Product Management**: Full lifecycle from draft to archived
- **RBAC Enforcement**: All operations respect role-based permissions
- **Seller Control**: Store owners retain full control over their catalog
- **Buyer Interface**: Read-only access to active products and categories

---

## Database Schema

### Category Model

```prisma
model Category {
  id           String         @id @default(uuid())
  name         String         @unique
  slug         String         @unique
  description  String?
  parentId     String?
  parent       Category?      @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children     Category[]     @relation("CategoryHierarchy")
  displayOrder Int            @default(0)
  status       CategoryStatus @default(ACTIVE)
  imageUrl     String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  deletedAt    DateTime?
  products     Product[]
}

enum CategoryStatus {
  ACTIVE
  DISABLED
}
```

### Product Model

```prisma
model Product {
  id          String        @id @default(uuid())
  name        String
  slug        String        @unique
  description String?
  price       Decimal       @db.Decimal(10, 2)
  unit        String        // "kg", "pack", "pcs"
  stock       Int           @default(0)
  weight      Decimal       @db.Decimal(10, 2) // For shipping calculation
  perishable  Boolean       @default(false)
  categoryId  String?
  category    Category?     @relation(fields: [categoryId], references: [id])
  status      ProductStatus @default(DRAFT)
  images      String[]      // Array of image URLs
  createdBy   String?       // User ID
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  deletedAt   DateTime?
}

enum ProductStatus {
  DRAFT    // Not visible to buyers
  ACTIVE   // Available for purchase
  DISABLED // Temporarily unavailable
  ARCHIVED // Historical reference only
}
```

---

## API Endpoints

### Category Endpoints

#### **1. Create Category**
- **Endpoint**: `POST /categories`
- **Permission**: `category.create`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**:
```json
{
  "name": "Grains & Staples",
  "slug": "grains-staples",
  "description": "Rice, wheat, and other staple grains",
  "parentId": null,
  "displayOrder": 1,
  "imageUrl": "https://example.com/images/grains.jpg"
}
```
- **Response**: Created category with relationships

#### **2. Get All Categories**
- **Endpoint**: `GET /categories?includeDisabled=false`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Query Parameters**:
  - `includeDisabled` (boolean, optional): Show disabled categories (Admin/Store Owner only)
- **Response**: Array of categories with parent/children relationships

#### **3. Get Category Hierarchy**
- **Endpoint**: `GET /categories/hierarchy`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Response**: Tree structure of categories (root categories with nested children)

#### **4. Get Category by ID**
- **Endpoint**: `GET /categories/:id`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Response**: Category with products and children

#### **5. Get Category by Slug**
- **Endpoint**: `GET /categories/slug/:slug`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Response**: Category with active products only (for buyers)

#### **6. Update Category**
- **Endpoint**: `PATCH /categories/:id`
- **Permission**: `category.update`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**: Partial category data
- **Response**: Updated category

#### **7. Disable Category**
- **Endpoint**: `PATCH /categories/:id/disable`
- **Permission**: `category.update`
- **Accessible by**: Platform Admin, Store Owner
- **Response**: Category with `status: DISABLED`

#### **8. Enable Category**
- **Endpoint**: `PATCH /categories/:id/enable`
- **Permission**: `category.update`
- **Accessible by**: Platform Admin, Store Owner
- **Response**: Category with `status: ACTIVE`

#### **9. Delete Category**
- **Endpoint**: `DELETE /categories/:id`
- **Permission**: `category.delete`
- **Accessible by**: Platform Admin
- **Response**: Soft-deleted category
- **Note**: Cannot delete if category has children

---

### Product Endpoints

#### **1. Create Product**
- **Endpoint**: `POST /products`
- **Permission**: `product.create`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**:
```json
{
  "name": "Organic Basmati Rice",
  "slug": "organic-basmati-rice",
  "description": "Premium aged basmati rice from Punjab",
  "price": 299.99,
  "unit": "kg",
  "stock": 100,
  "weight": 1.0,
  "perishable": false,
  "categoryId": "uuid-of-grains-category",
  "images": ["https://example.com/images/rice1.jpg"]
}
```
- **Response**: Created product with category relationship

#### **2. Get All Products**
- **Endpoint**: `GET /products?includeDisabled=false&includeArchived=false`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Query Parameters**:
  - `includeDisabled` (boolean): Show disabled products (Admin/Store Owner only)
  - `includeArchived` (boolean): Show archived products (Admin/Store Owner only)
- **Response**: Array of products with category information

#### **3. Search Products**
- **Endpoint**: `GET /products/search?q=basmati&includeDisabled=false`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Query Parameters**:
  - `q` (string, required): Search query (searches name and description)
  - `includeDisabled` (boolean): Include disabled products
- **Response**: Array of matching products

#### **4. Get Products by Category**
- **Endpoint**: `GET /products/category/:categoryId?includeDisabled=false`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Query Parameters**:
  - `includeDisabled` (boolean): Include disabled products
- **Response**: Array of products in the category

#### **5. Get Product by ID**
- **Endpoint**: `GET /products/:id`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Response**: Product with category information

#### **6. Get Product by Slug**
- **Endpoint**: `GET /products/slug/:slug`
- **Permission**: None (public)
- **Accessible by**: Everyone
- **Response**: Product with category information

#### **7. Update Product**
- **Endpoint**: `PATCH /products/:id`
- **Permission**: `product.update`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**: Partial product data
- **Response**: Updated product

#### **8. Disable Product**
- **Endpoint**: `PATCH /products/:id/disable`
- **Permission**: `product.disable`
- **Accessible by**: Platform Admin, Store Owner
- **Response**: Product with `status: DISABLED`

#### **9. Enable Product**
- **Endpoint**: `PATCH /products/:id/enable`
- **Permission**: `product.update`
- **Accessible by**: Platform Admin, Store Owner
- **Response**: Product with `status: ACTIVE`

#### **10. Archive Product**
- **Endpoint**: `PATCH /products/:id/archive`
- **Permission**: `product.delete`
- **Accessible by**: Platform Admin, Store Owner
- **Response**: Product with `status: ARCHIVED`

#### **11. Delete Product**
- **Endpoint**: `DELETE /products/:id`
- **Permission**: `product.delete`
- **Accessible by**: Platform Admin, Store Owner
- **Response**: Soft-deleted product (also sets status to ARCHIVED)

#### **12. Update Product Stock**
- **Endpoint**: `PATCH /products/:id/stock`
- **Permission**: `product.update`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**:
```json
{
  "quantity": 50
}
```
- **Response**: Product with updated stock

#### **13. Add Product Images**
- **Endpoint**: `POST /products/:id/images`
- **Permission**: `product.update`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**:
```json
{
  "imageUrls": [
    "https://example.com/images/rice2.jpg",
    "https://example.com/images/rice3.jpg"
  ]
}
```
- **Response**: Product with updated images array

#### **14. Remove Product Image**
- **Endpoint**: `DELETE /products/:id/images`
- **Permission**: `product.update`
- **Accessible by**: Platform Admin, Store Owner
- **Request Body**:
```json
{
  "imageUrl": "https://example.com/images/rice2.jpg"
}
```
- **Response**: Product with image removed from array

---

## Permission Matrix

| Action | Permission | Platform Admin | Store Owner | Buyer | Delivery Agent |
|--------|-----------|----------------|-------------|-------|----------------|
| Create Category | `category.create` | ✅ | ✅ | ❌ | ❌ |
| Update Category | `category.update` | ✅ | ✅ | ❌ | ❌ |
| Delete Category | `category.delete` | ✅ | ❌ | ❌ | ❌ |
| View Categories | `category.view` | ✅ | ✅ | ✅ | ❌ |
| Create Product | `product.create` | ✅ | ✅ | ❌ | ❌ |
| Update Product | `product.update` | ✅ | ✅ | ❌ | ❌ |
| Delete Product | `product.delete` | ✅ | ✅ | ❌ | ❌ |
| Disable Product | `product.disable` | ✅ | ✅ | ❌ | ❌ |
| View Products | `product.view` | ✅ | ✅ | ✅ | ❌ |

---

## Business Rules

### Category Rules
1. **Uniqueness**: Category names and slugs must be unique
2. **Hierarchy**: Categories support parent-child relationships
3. **Circular References**: System prevents circular parent-child references
4. **Deletion**: Cannot delete a category with child categories
5. **Soft Delete**: Deleted categories are not physically removed (historical data preserved)
6. **Visibility**: Disabled categories hide their products from buyers
7. **Display Order**: Categories can be ordered for frontend display

### Product Rules
1. **Uniqueness**: Product slugs must be unique
2. **Status Lifecycle**: `DRAFT → ACTIVE → DISABLED → ARCHIVED`
3. **Soft Delete**: Deleted products are not physically removed
4. **Stock Management**: Stock quantity cannot be negative
5. **Weight Requirement**: Weight must be specified for shipping calculation
6. **Category Assignment**: Products can exist without a category
7. **Multiple Images**: Products support multiple image URLs
8. **Perishability**: Flag for special handling requirements
9. **Seller Tracking**: `createdBy` tracks the user who created the product

### Visibility Rules
- **Buyers**: See only `ACTIVE` products in `ACTIVE` categories
- **Admin/Store Owner**: Can view all statuses with query parameters
- **Disabled Categories**: Hide all contained products from buyers
- **Archived Products**: Historical reference only, not visible to anyone by default

---

## Usage Examples

### Creating a Product Catalog

```bash
# 1. Create a category
curl -X POST http://localhost:3001/categories \
  -H "Authorization: Bearer <store-owner-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spices & Ingredients",
    "slug": "spices-ingredients",
    "description": "Essential spices and cooking ingredients",
    "displayOrder": 2
  }'

# 2. Create a product
curl -X POST http://localhost:3001/products \
  -H "Authorization: Bearer <store-owner-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organic Turmeric Powder",
    "slug": "organic-turmeric-powder",
    "description": "Premium organic turmeric from Kerala",
    "price": 149.99,
    "unit": "grams",
    "stock": 50,
    "weight": 0.1,
    "perishable": false,
    "categoryId": "<category-uuid>",
    "images": ["https://example.com/turmeric.jpg"]
  }'

# 3. Update product stock
curl -X PATCH http://localhost:3001/products/<product-id>/stock \
  -H "Authorization: Bearer <store-owner-token>" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 25}'

# 4. Disable product temporarily
curl -X PATCH http://localhost:3001/products/<product-id>/disable \
  -H "Authorization: Bearer <store-owner-token>"

# 5. Enable product again
curl -X PATCH http://localhost:3001/products/<product-id>/enable \
  -H "Authorization: Bearer <store-owner-token>"
```

### Buyer Browsing Experience

```bash
# 1. Get all active categories
curl http://localhost:3001/categories

# 2. Get category hierarchy (tree structure)
curl http://localhost:3001/categories/hierarchy

# 3. Browse products by category
curl http://localhost:3001/products/category/<category-id>

# 4. Search products
curl http://localhost:3001/products/search?q=organic

# 5. Get product details
curl http://localhost:3001/products/<product-id>
```

---

## Implementation Notes

### Services

#### **CategoryService**
- Implements all CRUD operations
- Validates parent-child relationships
- Prevents circular references
- Supports soft delete with `deletedAt` timestamp
- Provides hierarchy traversal methods

#### **ProductService**
- Implements full product lifecycle management
- Handles Decimal types for price and weight
- Manages product images as array
- Tracks creator with `createdBy` field
- Supports advanced filtering and search

### Controllers

#### **CategoryController**
- Separates admin and public endpoints
- Uses `@UseGuards(JwtAuthGuard, PermissionsGuard)` for protected routes
- Implements `@Permissions()` decorator for RBAC
- Public endpoints don't require authentication

#### **ProductController**
- Follows same pattern as CategoryController
- Implements query parameters for filtering
- Uses `@CurrentUser()` decorator to access authenticated user
- Supports bulk operations (add multiple images)

### DTOs

All DTOs use `class-validator` decorators:
- `@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsUUID()`
- `@Min()`, `@MinLength()`, `@MaxLength()`
- `@IsOptional()` for optional fields
- `@IsEnum()` for status fields

---

## Testing

### Admin/Store Owner Testing

```bash
# Login as store owner
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "store@example.com", "password": "password123"}'

# Use the returned JWT token in subsequent requests
export TOKEN="<jwt-token>"

# Test category creation
curl -X POST http://localhost:3001/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Category", "slug": "test-category"}'
```

### Buyer Testing

```bash
# Login as buyer
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "buyer@example.com", "password": "password123"}'

# Browse without authentication (public endpoints)
curl http://localhost:3001/categories
curl http://localhost:3001/products

# Try to create product (should fail - permission denied)
curl -X POST http://localhost:3001/products \
  -H "Authorization: Bearer $BUYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test", ...}'
# Expected: 403 Forbidden
```

---

## Error Handling

All services throw appropriate NestJS exceptions:

- `NotFoundException`: Resource not found or soft-deleted
- `ConflictException`: Unique constraint violation (duplicate slug/name)
- `BadRequestException`: Invalid data or business rule violation
- `ForbiddenException`: Insufficient permissions (handled by PermissionsGuard)

Example error responses:
```json
{
  "statusCode": 404,
  "message": "Product with id 'xxx' not found",
  "error": "Not Found"
}

{
  "statusCode": 409,
  "message": "Product with slug 'organic-rice' already exists",
  "error": "Conflict"
}

{
  "statusCode": 403,
  "message": "Insufficient permissions",
  "error": "Forbidden"
}
```

---

## Future Enhancements

1. **Image Upload**: Implement file upload endpoint (currently uses URLs)
2. **Bulk Operations**: Import/export products via CSV
3. **Product Variants**: Size, color, packaging options
4. **Inventory Alerts**: Notify when stock is low
5. **Product History**: Track all changes to products
6. **Multi-Seller Support**: Associate products with specific sellers
7. **Product Reviews**: Integration with review module
8. **Featured Products**: Highlight specific products
9. **Discount Management**: Sale prices and promotions
10. **Advanced Filtering**: Filter by price range, weight, perishability

---

## Compliance with Core Principles

✅ **Seller Control**: Store owners have full control over their catalog  
✅ **Human-Assisted**: Products require manual creation and approval  
✅ **No Hard Delete**: All deletions are soft (historical data preserved)  
✅ **RBAC Enforcement**: All write operations require proper permissions  
✅ **Food-Specific**: Support for weight, perishability, units  
✅ **Flexible Categorization**: Hierarchical categories with unlimited nesting  
✅ **Temporary Disablement**: Products can be disabled without deletion  
✅ **Historical Integrity**: Archived products don't break order history  

---

## Integration Points

- **Auth Module**: Uses `JwtAuthGuard`, `PermissionsGuard`, `@CurrentUser()`
- **Prisma Module**: Database operations via `PrismaService`
- **Order Module** (future): Products linked to order items
- **Kitchen Refill** (future): Custom product requests become catalog items
- **Shipping Engine** (future): Product weight used for shipping calculation
- **Review Module** (future): Products linked to reviews

---

## Summary

The Catalog Module is fully implemented with:
- ✅ Complete CRUD operations for categories and products
- ✅ Hierarchical category support with circular reference prevention
- ✅ Product lifecycle management (Draft → Active → Disabled → Archived)
- ✅ RBAC enforcement on all write operations
- ✅ Read-only public endpoints for buyers
- ✅ Image management (placeholder URLs, multi-image support)
- ✅ Soft delete for both categories and products
- ✅ Comprehensive validation with class-validator
- ✅ Search and filtering capabilities
- ✅ Stock management
- ✅ Full compliance with RachelFoods core principles

All endpoints are ready for testing and integration with the frontend.
