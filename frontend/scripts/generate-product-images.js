/**
 * Product Image Generator
 * Creates placeholder product images with white backgrounds
 */

const fs = require('fs');
const path = require('path');

// Product slugs matching the seed data
const products = [
    'ofada-rice',
    'white-rice',
    'fufu',
    'tapioca',
    'ogi',
    'cat-fish',
    'panla',
    'pomo',
    'kilishi',
    'cray-fish',
    'egusi',
    'iru-locust-beans',
    'pepper-soup-ingredients',
    'ayamase-mix',
    'ofada-mix',
    'ewa-aganyin-mix'
];

// Emoji representations for each product
const productEmojis = {
    'ofada-rice': '🍚',
    'white-rice': '🍚',
    'fufu': '🍞',
    'tapioca': '🥔',
    'ogi': '🥣',
    'cat-fish': '🐟',
    'panla': '🐠',
    'pomo': '🥩',
    'kilishi': '🥓',
    'cray-fish': '🦐',
    'egusi': '🌰',
    'iru-locust-beans': '🫘',
    'pepper-soup-ingredients': '🌶️',
    'ayamase-mix': '🍲',
    'ofada-mix': '🍛',
    'ewa-aganyin-mix': '🫘'
};

// Create products directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
const productsDir = path.join(publicDir, 'products');

if (!fs.existsSync(productsDir)) {
    fs.mkdirSync(productsDir, { recursive: true });
    console.log('✅ Created /public/products directory');
}

// Create SVG placeholder for each product
products.forEach(slug => {
    const emoji = productEmojis[slug] || '🍽️';
    const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const svg = `<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
  <rect width="800" height="800" fill="#ffffff"/>
  <text x="400" y="350" font-size="200" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
  <text x="400" y="550" font-size="32" text-anchor="middle" fill="#333" font-family="Arial, sans-serif" font-weight="600">${name}</text>
</svg>`;

    const filepath = path.join(productsDir, `${slug}.svg`);
    fs.writeFileSync(filepath, svg);
    console.log(`✅ Created ${slug}.svg`);
});

console.log(`\n🎉 Generated ${products.length} product placeholder images`);
console.log('📁 Location: /public/products/\n');
console.log('⚠️  NOTE: These are placeholder SVG images.');
console.log('   For production, replace with high-quality product photography.');
