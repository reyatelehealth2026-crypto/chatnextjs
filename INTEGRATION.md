# การเชื่อมต่อระหว่าง Next.js Inbox และระบบ PHP

## ภาพรวม

ระบบ Inbox Next.js ทำงานแยกจากระบบ PHP แต่ใช้ **database เดียวกัน** และสามารถเรียกใช้ API ของกันและกันได้

## 1. การใช้ Database ร่วมกัน

### Tables ที่ใช้ร่วมกัน:

```sql
-- Tables จากระบบ PHP เดิม (อ่านอย่างเดียว)
- line_accounts      ✓ ใช้ร่วมกัน
- admin_users        ✓ ใช้ร่วมกัน (Next.js อ่าน, PHP เขียน)
- line_users         ✓ ใช้ร่วมกัน (ทั้งสองระบบอ่าน/เขียน)

-- Tables ใหม่จาก Next.js (Next.js เป็นหลัก)
- messages           ✓ Next.js เขียน, PHP อ่านได้
- user_tags          ✓ Next.js เขียน, PHP อ่านได้
- user_tag_assignments
- auto_tag_rules
- conversation_assignments

-- Tables สำหรับ NextAuth (Next.js เท่านั้น)
- accounts
- sessions
- users
- verification_tokens
```

### การ Sync ข้อมูล:

**ไม่ต้อง sync** เพราะใช้ database เดียวกัน! 
- เมื่อ PHP อัปเดต `line_users` → Next.js เห็นทันที
- เมื่อ Next.js สร้าง `messages` → PHP query ได้ทันที

## 2. การเรียกใช้ระหว่างระบบ

### จาก PHP → Next.js API

```php
<?php
// ส่งข้อความผ่าน Next.js Inbox API
function sendInboxMessage($userId, $message) {
    $url = 'http://localhost:3000/api/inbox/messages';
    
    $data = [
        'userId' => $userId,
        'content' => $message,
        'messageType' => 'text'
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Internal-Request: true' // สำหรับ verify internal call
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// ดึงข้อมูล conversation
function getConversations($filters = []) {
    $url = 'http://localhost:3000/api/inbox/conversations';
    
    if (!empty($filters)) {
        $url .= '?' . http_build_query($filters);
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Internal-Request: true'
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// ตัวอย่างการใช้งาน
$result = sendInboxMessage('user-uuid-here', 'สวัสดีครับ');
$conversations = getConversations(['status' => 'active']);
?>
```

### จาก Next.js → PHP API

```typescript
// ใช้ php-bridge.ts ที่สร้างไว้แล้ว
import { callPhpApi, getCustomerOrders } from '@/lib/php-bridge'

// ดึงข้อมูลออเดอร์จาก PHP
const orders = await getCustomerOrders(userId)

// เรียก PHP API อื่นๆ
const result = await callPhpApi('/api/custom-endpoint.php', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' })
})
```

## 3. การแชร์ Session/Authentication

### Option 1: ใช้ Database Session (แนะนำ)

สร้าง PHP middleware เพื่อตรวจสอบ NextAuth session:

```php
<?php
// includes/nextauth-session.php

function getNextAuthSession() {
    // อ่าน session จาก database
    global $conn;
    
    // ดึง session token จาก cookie
    $sessionToken = $_COOKIE['next-auth.session-token'] ?? 
                   $_COOKIE['__Secure-next-auth.session-token'] ?? null;
    
    if (!$sessionToken) {
        return null;
    }
    
    // Query session จาก database
    $stmt = $conn->prepare("
        SELECT s.*, u.* 
        FROM sessions s
        JOIN users u ON s.userId = u.id
        WHERE s.sessionToken = ? AND s.expires > NOW()
    ");
    $stmt->bind_param("s", $sessionToken);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        return $row;
    }
    
    return null;
}

// ใช้งาน
$session = getNextAuthSession();
if ($session) {
    echo "Logged in as: " . $session['name'];
}
?>
```

### Option 2: ใช้ JWT Token

```php
<?php
// includes/jwt-helper.php

function verifyNextAuthJWT($token) {
    // ใช้ library เช่น firebase/php-jwt
    // เพื่อ verify JWT token จาก NextAuth
    
    $secret = getenv('NEXTAUTH_SECRET');
    
    try {
        $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        return $decoded;
    } catch (Exception $e) {
        return null;
    }
}
?>
```

## 4. การแชร์ข้อมูล Real-time

### Webhook จาก LINE

**ตอนนี้**: Webhook ไปที่ PHP (`webhook.php`)

**แนะนำ**: เปลี่ยน Webhook ไปที่ Next.js แล้วให้ Next.js forward ไปยัง PHP (ถ้าจำเป็น)

```
LINE Webhook → Next.js (/api/webhook)
                  ↓
            Save to Database
                  ↓
            Notify PHP (ถ้าจำเป็น)
```

หรือ **ใช้ทั้งสองระบบ**:
- Next.js Inbox รับ webhook สำหรับ messages
- PHP รับ webhook สำหรับ orders, payments

### Server-Sent Events (SSE)

Next.js จะส่ง real-time updates ผ่าน SSE:
- PHP สามารถ subscribe ได้ (ถ้าต้องการ)
- หรือใช้ database polling ใน PHP

## 5. ตัวอย่างการใช้งานจริง

### Scenario 1: ลูกค้าสั่งซื้อสินค้าผ่านระบบ PHP

```php
<?php
// shop/process-order.php

// 1. บันทึกออเดอร์ในระบบ PHP (เหมือนเดิม)
$order_id = saveOrder($order_data);

// 2. ส่งข้อความแจ้งเตือนผ่าน Inbox
$inbox_api = 'http://localhost:3000/api/inbox/messages';
$message_data = [
    'userId' => $line_user_uuid,
    'content' => "คำสั่งซื้อ #$order_id ได้รับแล้ว กำลังดำเนินการจัดส่ง",
    'messageType' => 'text'
];

// ส่ง request ไปยัง Next.js
$ch = curl_init($inbox_api);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($message_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_exec($ch);
curl_close($ch);

// 3. Trigger auto-tagging
// (Next.js จะจัดการอัตโนมัติเมื่อมี message ใหม่)
?>
```

### Scenario 2: Admin ตอบข้อความใน Inbox

```
1. Admin เปิด https://yourdomain.com/inbox
2. เลือก conversation และพิมพ์ข้อความ
3. Next.js บันทึกใน messages table
4. Next.js ส่งข้อความผ่าน LINE API
5. ระบบ PHP สามารถ query messages table เพื่อดูประวัติได้
```

### Scenario 3: แสดงจำนวนข้อความที่ยังไม่ได้อ่านใน PHP

```php
<?php
// includes/header.php

function getUnreadCount($admin_id) {
    global $conn;
    
    // Query จาก messages table ที่ Next.js สร้าง
    $query = "
        SELECT COUNT(*) as count
        FROM messages m
        JOIN conversation_assignments ca ON m.userId = ca.user_id
        WHERE ca.admin_id = ? 
        AND m.direction = 'incoming'
        AND m.is_read = 0
        AND ca.status = 'active'
    ";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("s", $admin_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();
    
    return $row['count'] ?? 0;
}

$unread_count = getUnreadCount($_SESSION['admin_id']);
?>

<!-- แสดงใน menu -->
<a href="/inbox">
    <i class="fa fa-inbox"></i>
    Inbox
    <?php if ($unread_count > 0): ?>
        <span class="badge"><?php echo $unread_count; ?></span>
    <?php endif; ?>
</a>
```

## 6. Best Practices

### ✅ ควรทำ:

1. **ใช้ database เดียวกัน** - ไม่ต้อง sync
2. **แยก responsibilities** - PHP จัดการ business logic, Next.js จัดการ inbox
3. **ใช้ API calls** - เมื่อต้องการข้อมูลจากอีกระบบ
4. **Monitor logs** - ทั้งสองระบบ
5. **Backup database** - เป็นประจำ

### ❌ ไม่ควรทำ:

1. ❌ แก้ไข tables ที่ระบบอื่นใช้โดยตรง
2. ❌ ลบ columns หรือ tables ที่มีอยู่แล้ว
3. ❌ ใช้ port ซ้ำกัน
4. ❌ Hard-code URLs หรือ credentials

## 7. Migration Checklist

- [ ] Backup database ก่อน deploy
- [ ] ทดสอบบน staging server ก่อน
- [ ] ตรวจสอบว่าระบบ PHP ยังทำงานปกติ
- [ ] ตรวจสอบว่า Inbox ทำงานได้
- [ ] ทดสอบการส่ง/รับข้อความ
- [ ] ทดสอบ authentication
- [ ] ตรวจสอบ logs ไม่มี errors
- [ ] ทดสอบบน mobile
- [ ] แจ้ง users ให้ทราบ

## 8. Rollback Plan

ถ้ามีปัญหา สามารถ rollback ได้ง่าย:

```bash
# 1. Stop Next.js
pm2 stop inbox-nextjs

# 2. แก้ไข Nginx config (comment out Next.js locations)
sudo nano /etc/nginx/sites-available/default
sudo systemctl reload nginx

# 3. ระบบ PHP จะทำงานปกติเหมือนเดิม
# Tables ที่ Next.js สร้างไว้ไม่กระทบระบบ PHP
```

## 9. Future Enhancements

เมื่อระบบเสถียรแล้ว อาจพิจารณา:

1. **Migrate features อื่นๆ ไป Next.js** ทีละส่วน
2. **ใช้ Redis** สำหรับ caching และ real-time
3. **ใช้ WebSocket** แทน SSE สำหรับ real-time ที่ดีขึ้น
4. **Implement GraphQL** สำหรับ API ที่ยืดหยุ่นกว่า
5. **Add monitoring tools** เช่น Sentry, DataDog

## ติดต่อสอบถาม

หากมีคำถามเกี่ยวกับการ integrate:
- อ่านเอกสารเพิ่มเติมใน `HYBRID_DEPLOYMENT.md`
- ดู example code ใน `src/lib/php-bridge.ts`
- ตรวจสอบ logs: `pm2 logs inbox-nextjs`
