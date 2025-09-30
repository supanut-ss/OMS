# BS Platform Docker Scripts

ชุด batch files สำหรับจัดการ Docker containers ของ BS Platform

## 📁 Files Description

### 🔨 `docker-build.bat`

**Full rebuild และ start containers**

- Stop existing containers
- Build images with `--no-cache`
- Start all services
- Show status

```cmd
docker-build.bat
```

### ▶️ `docker-up.bat`

**Start existing containers**

- Start containers โดยใช้ images ที่มีอยู่
- ไม่ rebuild images
- เร็วกว่า docker-build.bat

```cmd
docker-up.bat
```

### ⏹️ `docker-down.bat`

**Stop all containers**

- Stop และ remove containers
- เก็บ images ไว้

```cmd
docker-down.bat
```

### 📋 `docker-logs.bat`

**View container logs**

- เลือกดู logs ของ service ที่ต้องการ
- Real-time log streaming

```cmd
docker-logs.bat
```

### 🎛️ `docker-manager.bat`

**Interactive menu สำหรับจัดการทั้งหมด**

- GUI menu สำหรับเลือก operations
- รวมทุกฟังก์ชันไว้ในที่เดียว

```cmd
docker-manager.bat
```

## 🚀 Quick Start

### การใช้งานครั้งแรก:

```cmd
docker-build.bat
```

### การ start/stop ปกติ:

```cmd
docker-up.bat    # Start
docker-down.bat  # Stop
```

### การดู logs:

```cmd
docker-logs.bat
```

### การใช้งาน GUI:

```cmd
docker-manager.bat
```

## 🌐 Services URLs

หลังจากรัน containers แล้ว services จะพร้อมใช้งานที่:

- **🌐 API Gateway**: http://localhost:8080
- **🔐 Auth API**: http://localhost:8080/auth
- **📊 Core API**: http://localhost:8080/api

## 📋 Docker Compose Services

| Service       | Container Name          | Description             |
| ------------- | ----------------------- | ----------------------- |
| `api_gateway` | bs-platform-api_gateway | Ocelot API Gateway      |
| `auth_api`    | bs-platform-auth_api    | Authentication Service  |
| `bs_core_api` | bs-platform-bs_core_api | Core Business Logic API |

## 🛠️ Troubleshooting

### 1. Build Errors

```cmd
# Clean และ rebuild
docker-manager.bat → [7] Clean Up
docker-build.bat
```

### 2. Port Conflicts

```cmd
# ตรวจสอบ ports ที่ใช้งาน
netstat -an | findstr :8080
```

### 3. Container Won't Start

```cmd
# ดู logs
docker-logs.bat
# หรือ
docker compose logs service_name
```

### 4. Memory Issues

```cmd
# ล้าง unused containers และ images
docker system prune
```

## 🔧 Environment Variables

Batch files จะใช้ environment variables จาก:

- `.env` files
- `docker-compose.yml`

### สำคัญ:

- `SERVERDB`: Database connection string
- `SERVERDB_SECURITY`: Security database connection
- `ISSUER_SIGIN_KEY`: JWT signing key

## 📝 Notes

1. **ใช้ `docker-build.bat`** เมื่อ:

   - มีการเปลี่ยนแปลง source code
   - เป็นครั้งแรกที่รัน
   - มีปัญหา caching

2. **ใช้ `docker-up.bat`** เมื่อ:

   - Containers พร้อมใช้งานแล้ว
   - แค่ start/stop services
   - ไม่มีการเปลี่ยนแปลง code

3. **ใช้ `docker-manager.bat`** เมื่อ:
   - ต้องการ GUI interface
   - ทำงานหลาย operations
   - ผู้ใช้ไม่คุ้นเคยกับ command line

## 🔄 Development Workflow

```
1. Code Changes → docker-build.bat
2. Testing → docker-logs.bat
3. Stop → docker-down.bat
4. Start Again → docker-up.bat
```
