# System Requirements Specification (SRS): AI Database Assistant (V4)

## 1. ภาพรวมของระบบ (System Overview)

ระบบ AI Assistant สำหรับค้นหาและสรุปข้อมูลจากฐานข้อมูล (Database) ผ่านการสนทนาด้วยภาษาธรรมชาติ (Natural Language) โดยมีการออกแบบสถาปัตยกรรมแบบ **Context-Aware Prompting** ซึ่งจะปรับเปลี่ยนพฤติกรรมของ AI และขอบเขตของข้อมูลไปตาม "หน้าจอ (Page)" ที่ผู้ใช้งานกำลังเปิดอยู่ เพื่อเพิ่มความแม่นยำและลดขั้นตอนการทำ Dynamic SQL

## 2. เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** React
- **Backend / AI Orchestrator:** .NET Core Web API + Microsoft Semantic Kernel
- **Database:** SQL Server
- **AI Provider:** OpenRouter (OpenAI-compatible) พร้อมรองรับการขยายไปยัง Provider อื่นในอนาคต

---

## 3. โครงสร้างการจัดการ Prompt (Prompt Hierarchy Structure)

ระบบจะทำการประกอบร่างคำสั่ง (Prompt) ที่จะส่งให้ AI โดยพิจารณาจาก 2 ตารางหลัก ดังนี้:

### 3.1. System Prompt (`t_ais_system_prompt`)

- **หน้าที่:** เป็น "แม่แบบหลัก (Global Template)" หรือข้อกำหนดพื้นฐานที่ AI ทุกตัวในระบบต้องปฏิบัติตาม
- **เงื่อนไขการนำไปใช้:** AI จะตรวจสอบตารางนี้ก่อนเสมอ เพื่อดูว่ามี Prompt พื้นฐานที่ตรงกับ Intent ของผู้ใช้หรือไม่ หากสามารถตอบได้จาก System Prompt เลย ระบบจะไม่สร้างคำสั่ง SQL ใหม่ (Bypass SQL Generation)

### 3.2. Page Config / Sub-System Prompt (`t_ais_ai_page_config`)

- **หน้าที่:** เป็น "คำสั่งเฉพาะหน้าจอ (Contextual Template)" เพื่อจำกัดขอบเขต (Scope) ของการค้นหาข้อมูล
- **การทำงาน:** Frontend จะส่งค่า `process` (เช่น `/master/owner`) เข้ามาใน Request จากนั้น Backend จะนำไปค้นหา `sub_system_prompt` ในตาราง `t_ais_ai_page_config` เพื่อนำมาผนวกเข้ากับ System Prompt

---

## 4. รายละเอียดกระบวนการทำงาน (Detailed Process Flow)

### 4.1. การรับ Request และระบุ Context

- **REQ-1.1:** Frontend ต้องส่งพารามิเตอร์ `process` (ระบุหน้าจอปัจจุบัน) มาพร้อมกับข้อความคำถามของผู้ใช้ ทุกครั้งที่มีการเรียก API

### 4.2. การตรวจสอบ System Prompt และ AI Decision (Fast Path)

- **REQ-2.1:** Backend ประมวลผลคำถามผู้ใช้ผ่าน System Prompt และ Sub-System Prompt
- **REQ-2.2 (Bypass SQL):** หาก AI ประเมินว่าข้อมูลเพียงพอที่จะตอบได้ทันที ระบบจะข้ามขั้นตอนการ Generate SQL เพื่อประหยัดทรัพยากร

### 4.3. การสกัดตัวแปรและการ Query (Fallback Path)

- **REQ-3.1:** หากจำเป็นต้องใช้ข้อมูลใน DB ระบบจะสกัดตัวแปรและดำเนินการ Query (ผ่าน Template หรือ Dynamic SQL ตามสิทธิ์ที่ระบุใน Page Config)

---

## 5. การจัดการ AI Provider

- **REQ-5.1:** เชื่อมต่อกับ OpenRouter และรองรับการสลับโมเดลผ่าน Configuration

---

## 6. การบันทึกข้อมูลการใช้งาน (Logging & Observability)

ระบบต้องบันทึกประวัติการโต้ตอบและผลลัพธ์การประมวลผลของ AI ทุกครั้งลงในตาราง `t_ais_chat_log` เพื่อใช้ในการตรวจสอบ (Audit), แก้ไขปัญหา (Debugging) และวิเคราะห์ต้นทุน (Cost Analysis)

### 6.1. รายละเอียดข้อมูลที่บันทึก (Data Points)

บันทึกลงในตาราง `t_ais_chat_log` ดังนี้:

- **Context:** `process`, `user_id`
- **Content:** `user_message` (คำถามดิบ), `ai_response` (คำตอบที่ส่งกลับ)
- **AI Logic:** `system_prompt_id`, `ai_config_id`, `ai_decision` (BYPASS_SQL หรือ GENERATE_SQL), `generated_sql` (คำสั่ง SQL ที่ AI สร้างขึ้น)
- **Performance & Cost:** `prompt_tokens`, `completion_tokens`, `total_tokens`, `processing_time_ms`
- **Status:** `is_success`, `error_message`

### 6.2. วัตถุประสงค์

1. **Audit Trail:** ติดตามว่าใครถามอะไร และ AI ตอบอย่างไร
2. **AI Tuning:** ตรวจสอบ SQL ที่ AI สร้างขึ้นเพื่อปรับปรุง Sub-system Prompt ให้แม่นยำขึ้น
3. **Token Usage:** วิเคราะห์ค่าใช้จ่ายที่เกิดขึ้นจริงในแต่ละ Page/Process
