# BS-Platform

Umbrella project ของ BS รวมระบบทั้งหมด:  
- BS-API-Core → ระบบหลัก  
- BS-API-Secure → Security API  
- BS-Web → React Frontend
- BS-Import-Export-Manager → Import/Export Manager
- BS-Printing-Manager → Printing Manager

---

## Git Workflow
- `main` → production  
- `develop` → integration  
- `feature/*` → พัฒนา feature ใหม่  
- `hotfix/*` → แก้ปัญหาด่วน  

```bash
git clone https://github.com/phayungsakp/bs-platform.git
cd bs-platform
git checkout -b feature/ชื่อฟีเจอร์
