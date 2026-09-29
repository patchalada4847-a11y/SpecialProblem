ไม่# Dormitory Management System — Project Guide

คู่มือภาพรวมสำหรับผู้พัฒนาและ AI ที่จะมาช่วยพัฒนาต่อ ให้ใช้เอกสารนี้เป็นแผนที่เริ่มต้น แล้วตรวจโค้ดจริงก่อนแก้ไขเสมอ เพราะโค้ดเป็นแหล่งข้อมูลล่าสุดเมื่อรายละเอียดไม่ตรงกับเอกสาร

## 1. เป้าหมายของระบบ

เว็บแอปจัดการหอพัก แบ่งผู้ใช้งานเป็นผู้ดูแล (`admin`) และผู้เช่า (`tenant`) ครอบคลุมงานห้องพัก ผู้เช่า สัญญา บิลค่าน้ำ/ไฟ การชำระเงิน และรายงานการเงิน

### ผู้ดูแล

- เข้าสู่ระบบและตรวจเอกสารสมัครผู้เช่า (KYC)
- เพิ่ม แก้ไข ค้นหา และลบห้องพัก
- จัดการข้อมูลผู้เช่าและสัญญาเช่า รวมถึงบันทึกย้ายออกเพื่อสิ้นสุดสัญญาและคืนห้องว่างโดยเก็บประวัติไว้
- กำหนดประเภท/ราคาห้อง อัตราค่าน้ำ ค่าไฟ และข้อมูลหอพัก
- ออกบิลจากค่าเช่า เลขมิเตอร์น้ำ/ไฟ และรายการค่าใช้จ่ายเพิ่มเติมที่ระบุเอง
- ค้นหาและกรองบิลตามรอบเดือนและสถานะ
- ตรวจสลิป บันทึกวิธีรับชำระ แล้วเปลี่ยนสถานะบิลเป็นชำระแล้ว
- เพิ่มและลบบัญชีแอดมินได้เฉพาะแอดมินหลัก
- ดูและพิมพ์ใบแจ้งหนี้หรือใบเสร็จเป็นกระดาษ/PDF
- ดูแดชบอร์ด รายงานรายรับ รายจ่าย กำไร สถานะห้อง และส่งออก CSV

### ผู้เช่า

- สมัครและส่งเอกสารเพื่อรอผู้ดูแลตรวจสอบ จากนั้นเข้าสู่ระบบ
- ดูข้อมูลส่วนตัว ห้องพัก และสัญญา
- ดูบิลแบบสรุปรายการค่าใช้จ่าย เปิดใบแจ้งหนี้/ใบเสร็จเพื่อพิมพ์หรือบันทึก PDF แนบสลิป และดูประวัติชำระของตนเอง
- แก้ไขชื่อ นามสกุล และเบอร์โทรศัพท์

## 2. เทคโนโลยีและการเชื่อมต่อ

| ส่วน | เทคโนโลยี / ที่อยู่ |
|---|---|
| Frontend | React 19, Vite, React Router 7, Tailwind CSS 4, Axios, lucide-react |
| Backend | Node.js, Express 5, CommonJS |
| Database | PostgreSQL ผ่าน `pg` (ตั้งค่าให้เชื่อม Neon ได้) |
| API ระหว่าง frontend/backend | `http://localhost:5000/api` |
| หน้า API docs | `http://localhost:5000/api-docs` |
| Vite dev server | โดยปกติ `http://localhost:5173` |

โครงสร้างหลัก:

```text
backend/
  src/
    config/       # DB pool, schema migration, Swagger
    controllers/  # กฎธุรกิจและ SQL
    middleware/   # JWT และ role authorization
    routes/       # เส้นทาง API และการกำหนดสิทธิ์
    index.js      # ตั้งค่า Express, mount routes, migrate ก่อน listen
frontend/
  src/
    api/          # Axios client
    assets/       # ภาพประกอบ SVG ในโปรเจกต์
    components/   # Layout, route protection, toast
    pages/        # หน้าตาม route
    App.jsx       # กำหนด route ของแอป
    index.css     # ธีมและ print styles
```

## 3. การเริ่มระบบในเครื่อง

ติดตั้ง dependencies แยกในแต่ละแอป หากยังไม่มี `node_modules`:

```powershell
cd backend
npm install
npm run dev
```

เปิด terminal อีกหน้าต่าง:

```powershell
cd frontend
npm install
npm run dev
```

Backend โหลดค่าจาก `backend/.env` โดยต้องกำหนด `DB_USER`, `DB_HOST`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`, `JWT_SECRET` และเลือกกำหนด `PORT` (ค่าเริ่มต้น `5000`) **ห้ามใส่ค่าลับจริงในเอกสารหรือ commit ลง Git** ตรวจ `.gitignore` ก่อนเพิ่มไฟล์ตัวอย่าง environment

Frontend Axios base URL ปัจจุบันกำหนดเป็น `http://localhost:5000/api` ใน `frontend/src/api/axios.js`; ก่อน deploy ต้องเปลี่ยนให้รองรับ URL ตาม environment

## 4. Authentication และสิทธิ์

- Login ตรวจรหัสผ่านด้วย bcrypt และออก JWT อายุ 1 วัน
- Frontend เก็บ token/role ใน `localStorage`; Axios interceptor แนบ `Authorization: Bearer <token>`
- `verifyToken` ตรวจ JWT; `authorizeRoles(...)` ใช้จำกัด role ในแต่ละ route
- `ProtectedRoute` กันผู้ที่ไม่มี token และ `Layout` เลือกเมนูตาม role
- API ที่แสดงเอกสารบิลตรวจว่าเป็น admin หรือเป็นผู้เช่าที่เป็นเจ้าของสัญญาของบิลนั้น
- การอนุมัติรับชำระเป็นสิทธิ์ admin เท่านั้น
- สมัครสาธารณะสร้างได้เฉพาะบัญชี `tenant` ที่มีสถานะ `pending` และต้องผ่าน KYC ก่อน login
- เฉพาะแอดมินหลักเท่านั้นที่เพิ่มหรือลบบัญชีแอดมินได้

- Migration รุ่น 3 เพิ่ม `m_users.is_primary_admin` และเลือก admin ที่มี `user_id` ต่ำสุดเป็นแอดมินหลักเริ่มต้น

## 5. API หลัก

ทุก path ด้านล่างมี prefix `/api`; route ที่ต้อง login ใช้ Bearer token

| หมวด | Path | การใช้งาน / สิทธิ์โดยย่อ |
|---|---|---|
| Auth | `/auth/register`, `/auth/login` | สมัครและเข้าสู่ระบบ |
| Admin accounts | `/admins`, `/admins/:id` | admin ดูรายชื่อได้; เพิ่ม/ลบได้เฉพาะแอดมินหลัก |
| ห้อง | `/rooms`, `/rooms/:id` | ดู/จัดการห้อง; การเปลี่ยนแปลงเป็น admin |
| สัญญา | `/contracts`, `/contracts/:id` | ดู สร้าง แก้ไขสัญญา; admin |
| บิล | `/bills`, `/bills/last-meter/:contract_id` | ออกบิลพร้อมค่าเช่า มิเตอร์ และรายการเสริม; admin |
| เอกสารบิล | `/bills/:bill_id` | admin หรือเจ้าของบิล; คืนข้อมูลใบแจ้งหนี้/ใบเสร็จสำหรับพิมพ์ |
| การเงิน | `/transactions`, `/transactions/expenses`, `/transactions/pay-bill` | รายงาน/CRUD รายจ่าย และยืนยันรับเงิน; admin |
| ผู้เช่า | `/tenant/me`, `/tenant/my-bills`, `/tenant/upload-slip`, `/tenant/update-profile` | ข้อมูลและการทำรายการของผู้เช่าที่ login |
| KYC | `/tenant/pending-kyc`, `/tenant/verify-kyc` | ตรวจและอนุมัติเอกสาร; admin |
| ตั้งค่า | `/settings`, `/settings/rates`, `/settings/dormitory`, `/settings/room-types` | ค่าน้ำ/ไฟ ประเภทห้อง และข้อมูลหอพัก; admin |
| รายงาน | `/reports/dashboard`, `/reports/monthly-financial`, `/reports/rooms`, `/reports/tenants`, `/reports/payments` | Dashboard/รายงาน; admin |

ดูรายละเอียด request/response และ OpenAPI annotations เพิ่มเติมได้ที่ `/api-docs` และไฟล์ `backend/src/routes/`

## 6. ข้อมูลและ migration

ตารางหลัก:

- `m_users` — บัญชี login, บทบาท, สถานะ KYC, ข้อมูลติดต่อ และธงแอดมินหลัก
- `m_rooms` — เลขห้อง ชั้น ประเภท ราคา และสถานะ
- `m_contracts` — ความสัมพันธ์ผู้เช่า/ห้อง วันเริ่ม–สิ้นสุด เงินประกัน สถานะ
- `t_bills` — รอบบิล ค่าเช่า มิเตอร์ หน่วย/ยอดน้ำไฟ รายการเสริมใน `extra_charges` วันครบกำหนด และสถานะชำระ
- `t_transactions` — รายรับ/รายจ่าย; รายรับจากบิลเก็บวิธีชำระ เลขอ้างอิง หมายเหตุ และ `bill_id`
- `m_billing_settings` — เรตน้ำ/ไฟและข้อมูลหอพักที่แสดงบนเอกสาร
- `m_room_types` — ประเภทห้องและราคาเริ่มต้น
- `app_schema_migrations` — รุ่น migration ที่เคยรัน

`backend/src/config/migrateDatabase.js` ตรวจ schema และเพิ่มตาราง/คอลัมน์/index ที่กำหนดแบบ additive ทุกครั้งที่ backend เริ่ม ก่อนเปิด HTTP server หาก migration หรือการตรวจหลัง migration ไม่ผ่าน server จะไม่เริ่มทำงาน การตรวจใช้ advisory lock เพื่อกัน backend หลายตัว migrate พร้อมกัน

หน้ารายการห้อง ผู้เช่า/สัญญา บิล KYC และบิลผู้เช่ารองรับ server-side pagination ผ่าน `page` และ `page_size`; API ส่ง `items` กับ `pagination` กลับมา ส่วน callers ที่ไม่ส่งพารามิเตอร์ยังได้ array แบบเดิม

การจัดสรรผู้เช่าใช้หน้าต่างค้นหาและเลือกรายการแบบแบ่งหน้า แทน dropdown ยาว เรียกได้จากรายชื่อผู้เช่าที่ยังไม่มีห้อง หรือจากแถวห้องว่างโดยตรง

การยืนยันชำระล็อกแถวบิลและอัปเดตสถานะพร้อมสร้างรายการรายรับภายใน transaction เดียว ป้องกันการบันทึกรายรับซ้ำด้วยความสัมพันธ์ `t_transactions.bill_id` ซึ่งมี unique partial index

**ก่อน deploy หรือเปลี่ยน schema จริง:** สำรองฐานข้อมูลก่อน แม้ migration ปัจจุบันจะเน้นเพิ่ม schema โดยไม่ลบข้อมูลก็ตาม

Migration รุ่น 3 เลือกบัญชี admin ที่มี `user_id` ต่ำสุดในฐานข้อมูลเป็นแอดมินหลักโดยอัตโนมัติ หากยังไม่มีบัญชี admin ต้องสร้างบัญชีแรกผ่านผู้ดูแลฐานข้อมูลที่เชื่อถือได้ แล้วรีสตาร์ต backend ให้ migration กำหนดแอดมินหลักก่อนใช้เมนูจัดการแอดมิน

Migration รุ่น 4 เพิ่ม `t_bills.extra_charges` สำหรับรายการเสริมแบบแยกบรรทัด เช่น อินเทอร์เน็ตหรือที่จอดรถ ค่าเหล่านี้ถูกรวมในยอดรวมและแสดงทั้งในหน้าบิลผู้เช่าและเอกสารพิมพ์

## 7. กติกาการพัฒนาที่ควรรักษา

- เพิ่ม endpoint โดยแยก **route → controller → database** และระบุ middleware ตรวจ token/role ให้ชัด
- ใช้ SQL parameterized (`$1`, `$2`, …) ห้ามต่อค่าจากผู้ใช้ลง SQL string
- ตรวจ input และส่ง HTTP status/error ที่เหมาะสม; อย่ากลืน error หรือคืน success เมื่อทำงานไม่สำเร็จ
- งานที่แก้ข้อมูลหลายจุดและต้องสำเร็จ/ล้มเหลวพร้อมกันให้ใช้ `db.withTransaction(...)`
- เพิ่ม schema ด้วย migration แบบ additive และอัปเดต `expectedColumns`/การตรวจ schema ให้ครบ
- Frontend เรียก API ผ่าน `src/api/axios.js`; ใช้ toast จาก `src/components/useToast.js` สำหรับ feedback
- เพิ่มหน้าใหม่ใน `src/pages/` และลง route ใน `src/App.jsx`; หน้าหลัง login ต้องอยู่ใน protected routes
- ใช้ชื่อ camelCase ใน JavaScript, component React แบบ PascalCase, endpoint REST ตามรูปแบบเดิม และข้อความ UI ภาษาไทย
- ธีมรวมอยู่ใน `src/index.css`: โทน teal/เขียว ภาพหอพักจำกัดตำแหน่งตามที่ออกแบบ มุมโค้งเล็กน้อย และมี print rules
- ไม่เพิ่ม library ใหม่หากทำได้ด้วยเครื่องมือที่มี
- รักษาการเปลี่ยนแปลงของผู้ใช้ใน worktree; ตรวจ `git status` และอ่าน diff ก่อนแก้หรือสรุป

## 8. Build, lint และข้อจำกัดการทดสอบ

คำสั่งที่มีอยู่:

```powershell
cd frontend
npm run build
npm run lint

cd ..\backend
npm run dev
```

Backend `npm test` เป็น placeholder ที่จบด้วย error เพราะยังไม่มี test suite จริง จึงอย่าใช้เป็นหลักฐานว่าโค้ดเสียหรือผ่านการทดสอบ Frontend build และ ESLint เฉพาะไฟล์ที่แก้เป็นการตรวจที่มีอยู่แล้วในโปรเจกต์

## 9. จุดที่ยังควรทำก่อน production

- แก้การกำหนด role ตอนสมัครสมาชิกดังข้อควรระวังในหัวข้อ Authentication
- ย้าย frontend API URL จาก localhost ไป environment configuration และตั้งค่า HTTPS/CORS ตามโดเมนจริง
- เพิ่ม automated tests สำหรับ authorization, migration, การออกบิล และ transaction การยืนยันชำระ
- ตรวจการจำกัดขนาด/การจัดเก็บไฟล์ KYC และสลิป (ปัจจุบันส่งเป็น base64 ผ่าน JSON)
- วางแผน backup/restore, monitoring และแจ้งเตือนบิลค้างชำระ/ใกล้ครบกำหนด

## 10. วิธีใช้เอกสารนี้เป็นบริบทให้ AI ตัวอื่น

เริ่ม prompt ด้วย:

> อ่าน `PROJECT_GUIDE.md` ก่อน แล้วตรวจไฟล์จริงและ `git status` ก่อนเปลี่ยนแปลง อย่าเปิดเผยหรือแก้ทับ secrets/การเปลี่ยนแปลงที่มีอยู่ รักษา flow และรูปแบบเดิม แก้ให้ครบทั้ง backend, frontend, migration และ authorization ที่เกี่ยวข้อง และรัน build/lint หรือ syntax checks ที่มีอยู่ก่อนสรุป
