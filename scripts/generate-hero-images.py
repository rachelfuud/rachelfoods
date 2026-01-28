"""
Generate professional hero slideshow images for RachelFoods
Creates 3 JPG images at 1920x600px with gradient backgrounds and text
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Image dimensions
WIDTH = 1920
HEIGHT = 600

# Color schemes for each hero image
hero_configs = [
    {
        "filename": "hero-1.jpg",
        "gradient": [(255, 107, 107), (255, 175, 123)],  # Coral to peach
        "title": "Authentic Traditional Foods",
        "subtitle": "Fresh, Local & Delicious - Delivered to Your Door",
        "emoji": "🍲"
    },
    {
        "filename": "hero-2.jpg",
        "gradient": [(72, 187, 120), (56, 178, 172)],  # Green to teal
        "title": "Special Offers This Week",
        "subtitle": "Save Big on Your Favorite Traditional Meals",
        "emoji": "🎉"
    },
    {
        "filename": "hero-3.jpg",
        "gradient": [(99, 102, 241), (139, 92, 246)],  # Indigo to purple
        "title": "Fast & Reliable Delivery",
        "subtitle": "Order Now, Enjoy Today - Same Day Delivery Available",
        "emoji": "🚚"
    }
]

def create_gradient(width, height, color1, color2):
    """Create a horizontal gradient between two colors"""
    base = Image.new('RGB', (width, height), color1)
    top = Image.new('RGB', (width, height), color2)
    mask = Image.new('L', (width, height))
    mask_data = []
    for y in range(height):
        for x in range(width):
            mask_data.append(int(255 * (x / width)))
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base

def add_text_with_shadow(draw, position, text, font, fill_color, shadow_offset=3):
    """Add text with a shadow effect"""
    x, y = position
    # Draw shadow
    draw.text((x + shadow_offset, y + shadow_offset), text, font=font, fill=(0, 0, 0, 100))
    # Draw text
    draw.text((x, y), text, font=font, fill=fill_color)

# Create output directory
output_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'images')
os.makedirs(output_dir, exist_ok=True)

print("Generating hero slideshow images...")

for config in hero_configs:
    print(f"Creating {config['filename']}...")
    
    # Create gradient background
    img = create_gradient(WIDTH, HEIGHT, config['gradient'][0], config['gradient'][1])
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Try to use a nice font, fallback to default if not available
    try:
        title_font = ImageFont.truetype("arial.ttf", 72)
        subtitle_font = ImageFont.truetype("arial.ttf", 36)
        emoji_font = ImageFont.truetype("seguiemj.ttf", 120)  # Windows emoji font
    except:
        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
            subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
            emoji_font = ImageFont.truetype("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf", 120)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
            emoji_font = ImageFont.load_default()
    
    # Add emoji
    emoji_y = 150
    emoji_bbox = draw.textbbox((0, 0), config['emoji'], font=emoji_font)
    emoji_width = emoji_bbox[2] - emoji_bbox[0]
    draw.text(((WIDTH - emoji_width) // 2, emoji_y), config['emoji'], font=emoji_font, fill=(255, 255, 255, 230))
    
    # Add title
    title_y = 320
    title_bbox = draw.textbbox((0, 0), config['title'], font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    add_text_with_shadow(draw, ((WIDTH - title_width) // 2, title_y), config['title'], title_font, (255, 255, 255, 255))
    
    # Add subtitle
    subtitle_y = 410
    subtitle_bbox = draw.textbbox((0, 0), config['subtitle'], font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    add_text_with_shadow(draw, ((WIDTH - subtitle_width) // 2, subtitle_y), config['subtitle'], subtitle_font, (255, 255, 255, 220), shadow_offset=2)
    
    # Add decorative elements (optional rounded corners overlay)
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (255, 255, 255, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    
    # Add subtle vignette effect
    for i in range(50):
        alpha = int((i / 50) * 30)
        overlay_draw.rectangle(
            [i, i, WIDTH - i, HEIGHT - i],
            outline=(0, 0, 0, alpha),
            width=1
        )
    
    img = Image.alpha_composite(img.convert('RGBA'), overlay)
    
    # Save as JPG
    img_rgb = img.convert('RGB')
    output_path = os.path.join(output_dir, config['filename'])
    img_rgb.save(output_path, 'JPEG', quality=90, optimize=True)
    print(f"✓ Saved {config['filename']} ({os.path.getsize(output_path) // 1024}KB)")

print("\n✅ All hero images generated successfully!")
print(f"📁 Location: {output_dir}")
