# OpenGraph Image Generation Guide

## Required Images for Social Sharing

Create these images at **1200x630 pixels** for optimal social media display:

### 1. og-home.jpg

**Location**: `frontend/public/og-home.jpg`  
**Size**: 1200x630px  
**Description**: Homepage preview image

**Suggested Content**:

- RachelFoods logo (center or left)
- Tagline: "Authentic Traditional Food Delivery"
- Background: Food/kitchen imagery
- Brand colors: Green (#16a34a) and complementary

### 2. og-catalog.jpg

**Location**: `frontend/public/og-catalog.jpg`  
**Size**: 1200x630px  
**Description**: Catalog page preview image

**Suggested Content**:

- Multiple product images in a grid
- Text: "Browse Our Product Catalog"
- Brand colors

### 3. og-default.jpg (Optional)

**Location**: `frontend/public/og-default.jpg`  
**Size**: 1200x630px  
**Description**: Fallback image for pages without specific OG images

---

## Quick Creation Options (FREE)

### Option 1: Canva (Recommended - Easy)

1. Go to https://www.canva.com (free account)
2. Create custom size: 1200 x 630 pixels
3. Search templates for "Facebook Post" or "Twitter Header"
4. Customize with:
   - RachelFoods branding
   - Food imagery
   - Text overlay
5. Download as JPG
6. Save to `frontend/public/`

### Option 2: Figma (Design Tool)

1. Go to https://www.figma.com (free account)
2. Create 1200x630 frame
3. Design your image
4. Export as JPG @ 100% quality

### Option 3: Online Generators

- **OG Image Playground**: https://og-playground.vercel.app/
- **Cloudinary**: https://cloudinary.com/tools/og-image-generator

### Option 4: Simple Placeholder (5 minutes)

Use https://placeholder.com or https://via.placeholder.com temporarily:

```bash
# Download placeholders (bash/WSL)
curl -o frontend/public/og-home.jpg "https://via.placeholder.com/1200x630/16a34a/ffffff?text=RachelFoods+-+Home"
curl -o frontend/public/og-catalog.jpg "https://via.placeholder.com/1200x630/16a34a/ffffff?text=Product+Catalog"
```

---

## Design Specifications

### Brand Colors

- Primary Green: `#16a34a`
- Background: White or light green
- Text: Dark gray or white (high contrast)

### Typography

- Headline: Bold, 48-72px
- Subheadline: Regular, 24-36px
- Font: Clean sans-serif (Inter, Roboto, or similar)

### Layout Guidelines

- **Safe Area**: Keep important content 100px from edges
- **Logo**: Top-left or center, 200-300px wide
- **Text**: Centered or left-aligned with breathing room
- **Images**: High quality, food-related

---

## Testing Social Previews

### After Creating Images:

1. **Facebook Debugger**  
   https://developers.facebook.com/tools/debug/  
   Enter: `https://rachelfoods.com`

2. **Twitter Card Validator**  
   https://cards-dev.twitter.com/validator  
   Enter: `https://rachelfoods.com`

3. **LinkedIn Post Inspector**  
   https://www.linkedin.com/post-inspector/  
   Enter: `https://rachelfoods.com`

4. **OpenGraph Preview**  
   https://www.opengraph.xyz/  
   Enter: `https://rachelfoods.com`

---

## Technical Requirements

### File Format

- **Format**: JPG (better compression than PNG)
- **Quality**: 80-90% (balance size vs quality)
- **Max Size**: < 300 KB (for fast loading)

### Dimensions

- **Exact Size**: 1200 x 630 pixels
- **Aspect Ratio**: 1.91:1 (critical!)
- **Minimum**: Don't go smaller (image will be blurry)

### Color Profile

- **sRGB** color space (web standard)
- **8-bit** color depth

---

## Current OpenGraph Implementation

### Homepage

```typescript
// frontend/app/page.tsx
openGraph: {
  images: [{ url: "https://rachelfoods.com/og-home.jpg" }];
}
```

### Catalog

```typescript
// frontend/app/catalog/page.tsx
openGraph: {
  images: [{ url: "https://rachelfoods.com/og-catalog.jpg" }];
}
```

### Products

```typescript
// frontend/app/products/[slug]/page.tsx
openGraph: {
  images: [{ url: product.imageUrl }]; // Uses product image
}
```

---

## Quick Checklist

- [ ] Create og-home.jpg (1200x630)
- [ ] Create og-catalog.jpg (1200x630)
- [ ] Save to `frontend/public/`
- [ ] Deploy to production
- [ ] Test with Facebook Debugger
- [ ] Test with Twitter Card Validator
- [ ] Verify images load on social shares

**Estimated Time**: 30-60 minutes (using Canva)
