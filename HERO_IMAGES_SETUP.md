# Hero Images Setup

The hero slideshow is now implemented and will look for the following images:

## Required Images (to be added)

Place these images in `frontend/public/images/`:

1. **hero-1.jpg** - Fresh Traditional Foods showcase
2. **hero-2.jpg** - Quality Ingredients display
3. **hero-3.jpg** - Fast Delivery visual

## Temporary Fallback

Until you add the images, the slideshow will show:

- Placeholder gray backgrounds with titles
- Smooth transitions still work
- All navigation functional

## Recommended Image Specs

- **Dimensions**: 1920x600px (16:9 aspect ratio)
- **Format**: JPG (optimized for web)
- **Size**: <200KB each
- **Content**: High-quality photos of traditional foods, kitchen scenes, or delivery

## Quick Setup

```bash
cd frontend/public
mkdir -p images
# Add your hero images here
```

## Theme Colors Applied

The hero slideshow and home page now use the default theme colors:

- Primary: #16a34a (green)
- Secondary: #ea580c (orange)
- Accent: #dc2626 (red)

These colors are automatically fetched from the `default-theme` configuration in the database.
