import { resolve } from 'path'
import { Jimp } from 'jimp'
import { existsSync, mkdirSync } from 'fs'

async function generateIcons() {
  console.log('🎨 Generating placeholder icons with actual sizes...\n')
  
  const iconsDir = resolve(process.cwd(), 'public', 'icons')
  
  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true })
  }

  const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
  
  for (const size of sizes) {
    const iconPath = resolve(iconsDir, `icon-${size}x${size}.png`)
    
    // สร้าง image ด้วย Jimp
    // ใช้สีเขียว LINE (#00B900)
    const image = new Jimp({
      width: size,
      height: size,
      color: 0x00B900FF // RRGGBBAA
    })
    
    await image.write(iconPath)
    console.log(`✅ Created icon-${size}x${size}.png`)
  }
  
  console.log('\n✨ Icons generated successfully!')
  console.log('⚠️  Note: These are placeholder icons. Please replace with actual icons for production.')
}

generateIcons()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error generating icons:', error)
    process.exit(1)
  })
