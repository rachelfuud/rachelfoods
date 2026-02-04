# PWA Icon Generation Instructions

## Required Icons

For the Progressive Web App to work properly, you need to create these icon files:

### 1. icon-192.png (192x192 pixels)

- Purpose: App launcher icon on mobile devices
- Format: PNG with transparent background
- Use your RachelFoods logo with padding

### 2. icon-512.png (512x512 pixels)

- Purpose: Splash screen and high-resolution displays
- Format: PNG with transparent background
- Same design as icon-192.png but higher resolution

## Quick Icon Generation (FREE Options)

### Option 1: Using Canva (Free)

1. Go to https://www.canva.com
2. Create 512x512px design
3. Upload your logo
4. Export as PNG (transparent background)
5. Use online tool like https://realfavicongenerator.net to generate all sizes

### Option 2: Using Figma (Free)

1. Create 512x512px frame
2. Design your icon (green background + food icon recommended)
3. Export as PNG @ 2x

### Option 3: Using GIMP (Free Desktop App)

1. Download GIMP from https://www.gimp.org
2. Create new image 512x512px
3. Design icon with your branding
4. Export as PNG
5. Scale down to 192x192 for smaller icon

## Recommended Design

```
Background: #16a34a (your theme green)
Icon: White food/kitchen symbol in center
Padding: 20% on all sides
```

## After Creating Icons

1. Place files in `frontend/public/`
2. Test PWA installation:
   - Chrome DevTools > Application > Manifest
   - Should show "Installable" with no errors

## Optional Screenshots

Create these for better app install prompts:

- `screenshot-mobile.png` - 540x720px
- `screenshot-desktop.png` - 1280x720px
