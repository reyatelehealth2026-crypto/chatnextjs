/**
 * PHP Bridge - สำหรับเชื่อมต่อกับระบบ PHP เดิม
 * ใช้เมื่อต้องการเรียกใช้ฟังก์ชันจากระบบ PHP
 */

interface PhpApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * เรียก PHP API endpoint
 */
export async function callPhpApi<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<PhpApiResponse<T>> {
  try {
    const baseUrl = process.env.PHP_API_URL || ''
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`PHP API error: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('PHP Bridge error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * ส่งข้อความผ่าน LINE API (ใช้ PHP endpoint เดิม)
 */
export async function sendLineMessage(params: {
  userId: string
  message: string
  type?: string
}) {
  return callPhpApi('/api/line/send-message.php', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * ดึงข้อมูลออเดอร์จากระบบ PHP
 */
export async function getCustomerOrders(userId: string) {
  return callPhpApi(`/api/orders.php?user_id=${userId}`)
}

/**
 * ดึงข้อมูล Points จากระบบ PHP
 */
export async function getCustomerPoints(userId: string) {
  return callPhpApi(`/api/points.php?user_id=${userId}`)
}

/**
 * อัปเดต Customer profile ในระบบ PHP
 */
export async function updateCustomerProfile(userId: string, data: any) {
  return callPhpApi('/api/customers/update.php', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, ...data }),
  })
}

/**
 * Sync ข้อมูลระหว่าง Next.js และ PHP
 */
export async function syncWithPhp(action: string, data: any) {
  return callPhpApi('/api/sync.php', {
    method: 'POST',
    body: JSON.stringify({ action, data }),
  })
}
