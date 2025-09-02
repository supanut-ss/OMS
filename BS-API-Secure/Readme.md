## BS-API-Secure — README (ไทย)

## สรุป

โปรเจคนี้ประกอบด้วยบริการที่เกี่ยวข้องกับการยืนยันตัวตนและการจัดการโทเค็นของระบบ (Authentication, TokenManagement) และเกตเวย์ (ApiGateway) ที่ใช้ควบคุมการเรียกใช้งาน API ภายในแพลตฟอร์ม

## โครงสร้างสำคัญ

- `ApiGateway/` — API Gateway (Ocelot) สำหรับรวมเส้นทางไปยังบริการภายใน
- `Authentication/` — บริการยืนยันตัวตน (Auth, Users, Application, Alive)
- `TokenManagement/` — การจัดการ JWT (validator, blacklist middleware, extensions)

## วัตถุประสงค์

- ให้บริการ Authentication (login, token issuance) และ endpoint สำหรับตรวจสอบสถานะ
- จัดการ JWT (สร้าง ตรวจสอบ และจัดการ blacklist) เพื่อใช้ร่วมกับบริการอื่น
- ให้ตัวอย่างการติดตั้งและรันทั้งแบบ local และ Docker

## การตั้งค่า (สำคัญ)

ไฟล์คอนฟิกหลัก: แต่ละโปรเจคมี `appsettings.json` และ `appsettings.Development.json` ตัวอย่างคอนฟิกที่ต้องตรวจสอบ/แก้ไขก่อนรัน:

- `JwtSettings` (ใน `TokenManagement/Models/JwtSettings.cs`) — ตรวจสอบค่าต่อไปนี้:

  - Issuer
  - Audience
  - Key / Secret
  - Expiration

- `Ocelot` / `ocelot.json` (ใน `ApiGateway/`) — กำหนดเส้นทาง (routes) และ upstream/downstream services

## ตัวแปรสิ่งแวดล้อมที่ควรตั้ง (ตัวอย่าง)

- ASPNETCORE_ENVIRONMENT=Development
- Connection strings (ถ้ามี ใช้ DB จริงหรือ local dev DB)
- JWT**KEY / JWT**ISSUER / JWT\_\_AUDIENCE

## รันแบบ local (PowerShell)

จากโฟลเดอร์รากของ repo หรือที่เก็บโปรเจค ให้รันตัวอย่างต่อไปนี้ (PowerShell):

```powershell
cd .\BS-API-Secure; dotnet restore; dotnet build

# รัน Authentication
dotnet run --project .\BS-API-Secure\Authentication\Authentication.csproj

# (แยกเทอร์มินัล) รัน TokenManagement
dotnet run --project .\BS-API-Secure\TokenManagement\TokenManagement.csproj

# (แยกเทอร์มินัล) รัน ApiGateway
dotnet run --project .\BS-API-Secure\ApiGateway\ApiGateway.csproj
```

หมายเหตุ: แต่ละโปรเจคจะเปิดพอร์ตตามที่ระบุใน `Properties/launchSettings.json` หรือ `appsettings.json` — ตรวจสอบค่าพอร์ตก่อนเรียกใช้

## รันด้วย Docker

แต่ละโปรเจคมี `Dockerfile` แบบง่าย สามารถ build และ run ได้ตัวอย่าง (PowerShell):

```powershell
# ตัวอย่าง build & run ApiGateway
docker build -t bs-api-gateway .\BS-API-Secure\ApiGateway
docker run -e "ASPNETCORE_ENVIRONMENT=Production" -p 5000:80 bs-api-gateway
```

## Endpoint สำคัญ (ตัวอย่าง)

- `GET /alive` — ตรวจสอบสถานะบริการ (ดูใน `Authentication/Controllers/AliveController.cs`)
- `POST /auth/login` — รับ credential เพื่อขอ access token (ดูใน `Authentication/Controllers/Auth/AuthController.cs`)
- Token validation endpoints/logic อยู่ใน `TokenManagement` service และ middleware ที่ลงทะเบียนใน `ApiGateway`/services

## การพัฒนาและดีบัก

- เปิดโซลูชันย่อยด้วย Visual Studio (`.sln` ในแต่ละโฟลเดอร์) เพื่อใช้งาน debugging, breakpoints และ launch profiles
- ถ้าต้องการต่อกับ Identity/Database: ปรับ connection string และ run database migration (ถ้ามี)
- การเพิ่ม middleware สำหรับ blacklist token อยู่ที่ `TokenManagement/Middleware/JwtBlacklistMiddleware.cs`

## ข้อควรระวัง

- ห้ามเผย `JwtSettings.Key` หรือ secrets ลงใน repo สาธารณะ ให้ใช้ Secret Manager หรือ environment variables ในการจัดการ
- ตรวจสอบ CORS และนโยบายความปลอดภัยเมื่อรันใน production

## การทดสอบเบื้องต้น

1. รันบริการทั้งหมดตามคำสั่งด้านบน
2. ทดสอบ `GET /alive` ที่พอร์ตของ `Authentication` (หรือผ่าน ApiGateway ถ้าเซ็ตไว้)
3. ทดสอบ `POST /auth/login` ด้วย credential ตัวอย่าง (ดูใน `Authentication/Models/Requests` หรือโค้ดผู้ให้บริการ)

## เพิ่มเติม/ติดต่อ

ถ้าต้องการช่วยแก้คอนฟิกหรือเขียนตัวอย่าง script สำหรับการรันแบบ local/docker แจ้งรายละเอียด (OS, Docker installed หรือไม่) มาได้

## License

โปรเจคนี้ไม่มีการระบุ license ภายใน repo — ให้เพิ่มไฟล์ `LICENSE` หากต้องการกำหนด

---

ไฟล์ที่แก้ไข: `BS-API-Secure/Readme.md` (อัปเดต)
