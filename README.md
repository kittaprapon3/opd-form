# แบบขอมีเวชระเบียนผู้ป่วยนอก (ออนไลน์)

แบบฟอร์ม **FM-NMD-OPD-01-R02-01-67** สำหรับสถานพยาบาลปฐมภูมิ ทร.
หน้าเว็บอยู่บน GitHub Pages · ข้อมูลเก็บใน Supabase (ฐานข้อมูลออนไลน์)

| หน้า | ใครใช้ | ทำอะไร |
|---|---|---|
| `index.html` | คนไข้ | ถ่ายรูปบัตรประชาชน → กรอก → เซ็นชื่อ → **ส่งคำขอ** → ได้เลขที่คำขอ |
| `staff.html` | เจ้าหน้าที่ (ล็อกอิน) | ดูรายการคำขอ ค้นหา เปิดแบบฟอร์มพร้อมลายเซ็น พิมพ์/PDF ใส่ HN เปลี่ยนสถานะ Export Excel |
| `qr.html` | — | โปสเตอร์ QR code ไปหน้าคนไข้ สำหรับพิมพ์ติดจุดบริการ |

ไฟล์อื่น: `config.js` (ตั้งค่า), `form-sheet.js` / `form-sheet.css` / `form-bg.png` (แบบฟอร์มหน้า 12 ต้นฉบับ), `supabase/setup.sql` (ตั้งค่าฐานข้อมูล)

---

## ติดตั้ง (ครั้งเดียว ประมาณ 15 นาที)

### 1) สร้างฐานข้อมูล Supabase
1. สมัคร/เข้าสู่ระบบที่ https://supabase.com → **New project**
   - Region: **Southeast Asia (Singapore)**
   - ตั้ง Database Password แล้วเก็บไว้
2. เมนู **SQL Editor** → New query → วางเนื้อหาทั้งหมดจาก `supabase/setup.sql` → **Run**

### 2) ปิดการสมัครสมาชิกเอง และสร้างบัญชีเจ้าหน้าที่
1. **Authentication → Sign In / Providers** → ปิด **Allow new users to sign up** → Save
2. **Authentication → Users → Add user → Create new user**
   ใส่อีเมล + รหัสผ่านของเจ้าหน้าที่ (ติ๊ก Auto Confirm User) ทำซ้ำทุกคน
3. **SQL Editor** รันคำสั่งนี้ (แก้อีเมลให้ตรงกับข้อ 2) — เฉพาะอีเมลในตารางนี้เท่านั้นที่เห็นข้อมูล
   ```sql
   insert into public.staff (email, name) values
     ('staff1@example.com', 'ชื่อเจ้าหน้าที่ 1'),
     ('staff2@example.com', 'ชื่อเจ้าหน้าที่ 2')
   on conflict (email) do nothing;
   ```
   ยกเลิกสิทธิ์: `delete from public.staff where email = 'staff1@example.com';`

### 3) ใส่ค่าใน `config.js`
**Project Settings → API** (หรือ **Connect**) คัดลอก **Project URL** และ **anon public key** มาใส่:
```js
UNIT_NAME: "ชื่อหน่วย",
SUPABASE_URL: "https://xxxxxxxx.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi..."
```
> anon key เป็นคีย์สาธารณะ ใส่ในหน้าเว็บได้ตามปกติ — **ห้าม** ใส่ `service_role` key

### 4) เปิด GitHub Pages
**Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → Save

ภายใน 1–2 นาที:
- คนไข้: `https://<บัญชี>.github.io/<repo>/`
- เจ้าหน้าที่: `https://<บัญชี>.github.io/<repo>/staff.html`
- โปสเตอร์ QR: `https://<บัญชี>.github.io/<repo>/qr.html`

---

## ความปลอดภัยของข้อมูล
- คนไข้ **ส่งได้อย่างเดียว** อ่าน/แก้/ลบข้อมูลใด ๆ ไม่ได้ (รวมถึงของตัวเองหลังส่ง)
- ฐานข้อมูลตรวจซ้ำก่อนบันทึก: เลขบัตรถูกต้อง มีชื่อ เบอร์โทร ลายเซ็น, จำกัด 30 คำขอ/นาที และเลขบัตรเดียวกัน 3 ครั้ง/ชั่วโมง
- เจ้าหน้าที่ต้องล็อกอิน **และ** มีอีเมลอยู่ในตาราง `staff` จึงเห็นข้อมูล แก้ได้เฉพาะ HN / สถานะ / หมายเหตุ (บันทึกว่าใครแก้เมื่อไร)
- ใน repo ไม่มีข้อมูลผู้ป่วยหรือรหัสลับ

## ข้อควรรู้
- Supabase แพ็กเกจฟรี: ถ้าไม่มีการใช้งานเลย **7 วัน** โปรเจกต์จะถูกพักชั่วคราว (กด Restore ในหน้า Supabase ได้) — ถ้าใช้งานทุกวันจะไม่เกิด
- แนะนำ Export Excel สำรองเป็นระยะ
- แก้หน้าเว็บบน GitHub ได้เลย ลิงก์และ QR code เดิมใช้ต่อได้
