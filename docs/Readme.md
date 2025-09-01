## 🎨 เวอร์ชันสวยงาม (Badge + Diagram)
```markdown
# 🚀 BS-Platform

![GitHub last commit](https://img.shields.io/github/last-commit/your-org/bs-platform)
![GitHub issues](https://img.shields.io/github/issues/your-org/bs-platform)
![GitHub pull requests](https://img.shields.io/github/issues-pr/your-org/bs-platform)

**BS-Platform** คือ Umbrella Project ของระบบ BS  
รวม API หลัก, Security และ Web Frontend ไว้ใน ecosystem เดียว  

---

## 📂 Project Structure
````

BS-Platform/
├── BS-API-Core/      # Backend Core API
├── BS-API-Secure/    # API Security
├── BS-Web/           # React Frontend
└── docs/             # Documents

````

---

## 🛠 Tech Stack
- **Backend**: .NET 6+, REST API  
- **Security**: JWT, OAuth2  
- **Frontend**: React + Tailwind  

---

## 🔄 Workflow
```mermaid
flowchart LR
    subgraph API
    A[BS-API-Core] --> B[BS-API-Secure]
    end
    C[BS-Web] --> A
    C --> B
````

---

## 🚀 Quick Start

```bash
git clone https://your-git-server/bs-platform.git
cd bs-platform
```

* Run **Core API**

```bash
cd BS-API-Core
dotnet run
```

* Run **Secure API**

```bash
cd BS-API-Secure
dotnet run
```

* Run **Web**

```bash
cd BS-Web
npm install
npm start
```

---

## 📖 Docs

ดูเพิ่มเติมได้ในโฟลเดอร์ [`docs/`](./docs)

---
