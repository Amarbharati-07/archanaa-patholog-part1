import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create a simple blue square icon with "AP" text
const createIcon = async (size, filename) => {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2563eb"/>
      <text x="50%" y="50%" font-size="${size * 0.4}" fill="white" 
            text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-weight="bold">AP</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(join(__dirname, 'client/public', filename));
  
  console.log(`✅ Created ${filename} (${size}x${size})`);
};

// Create all required icons
(async () => {
  try {
    await createIcon(192, 'icon-192.png');
    await createIcon(512, 'icon-512.png');
    await createIcon(48, 'favicon.png');
    console.log('🎉 All icons created successfully!');
  } catch (error) {
    console.error('❌ Error creating icons:', error);
  }
})();
