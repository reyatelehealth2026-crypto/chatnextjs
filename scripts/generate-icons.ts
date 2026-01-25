import { writeFileSync } from 'fs'
import { resolve } from 'path'

// สร้าง simple placeholder PNG icon
// ใช้ base64 encoded PNG ที่มีสีเขียว (LINE color: #00B900)
// ใน production ควรใช้ icon จริงจาก designer
const createPlaceholderIcon = (size: number) => {
  // สร้าง simple solid color PNG โดยใช้ base64
  // ใช้ minimal PNG ที่มีสี (1x1 pixel green)
  // สำหรับขนาดที่ใหญ่ขึ้น ใช้วิธี scale หรือสร้างใหม่
  
  // Minimal 1x1 green PNG (LINE brand color #00B900)
  // ใช้ base64 encoded minimal PNG
  const minimalGreenPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
  
  // สำหรับ production ควรใช้ library เช่น sharp หรือ jimp
  // เพื่อสร้าง PNG ที่มีขนาดถูกต้อง
  // ตอนนี้ใช้ minimal PNG ที่ browser จะ scale ให้อัตโนมัติ
  return minimalGreenPng
}

async function generateIcons() {
  console.log('🎨 Generating placeholder icons...\n')
  
  const iconsDir = resolve(process.cwd(), 'public', 'icons')
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
  
  for (const size of sizes) {
    const iconPath = resolve(iconsDir, `icon-${size}x${size}.png`)
    // สร้าง placeholder icon
    // ใน production ควรใช้ icon จริงจาก designer
    const icon = createPlaceholderIcon(size)
    writeFileSync(iconPath, icon)
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
