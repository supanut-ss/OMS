# BS-AI-KnowledgeBase RAG + Schema Description Plan

เอกสารนี้สรุปแผนปรับปรุง `BS-AI-Assistant` ให้รองรับ RAG แบบ vector search ผ่าน `BS-AI-KnowledgeBase` โดยเพิ่มจุดสำคัญคือการอ่าน schema description จาก SQL Server โดยตรง เพื่อลดภาระการเขียนรายละเอียด table/column ซ้ำใน knowledge base

## 1. เป้าหมาย

- เพิ่ม knowledge layer ให้ AI Assistant เข้าใจระบบ My Inventory ได้ลึกขึ้น
- ใช้ RAG ดึงความรู้ที่เกี่ยวข้องก่อนส่งคำถามให้ LLM
- ให้ schema/table/column description ใน database เป็น source of truth หลัก
- ลด manual maintenance ของ schema knowledge ในเอกสาร
- ลด hallucination ตอน generate SQL โดยบังคับให้ AI ใช้ schema context ที่ retrieve มาได้จริง
- เก็บ retrieval log เพื่อ audit ได้ว่า AI ใช้ knowledge chunk ไหนตอบ

## 2. Current Context ที่พบในระบบ

`BS-AI-Assistant` ปัจจุบันเป็น .NET 9 service และใช้ SQL Server ผ่าน `Microsoft.Data.SqlClient` กับ Dapper

ตาราง AI เดิมอยู่ใน schema `ais`:

- `ais.t_ai_system_prompt`
- `ais.t_ai_page_config`
- `ais.t_ai_chat_log`
- `ais.t_ai_provider_config`
- `ais.t_ai_model_priority`

chat flow ปัจจุบันอยู่ที่:

- `Controllers/AiChatController.cs`
- `Services/Implementation/AiOrchestratorService.cs`
- `Services/Implementation/PromptService.cs`
- `Services/Implementation/SqlExecutionService.cs`

ระบบเดิมมี prompt hierarchy แล้ว:

```text
System Prompt
  + Page Config Prompt
  + User Context
  + Conversation History
  + Current User Message
```

สิ่งที่จะเพิ่มคือ retrieval context:

```text
System Prompt
  + Page Config Prompt
  + Retrieved Knowledge Context
  + Retrieved Schema Description Context
  + User Context
  + Conversation History
  + Current User Message
```

## 3. Architecture ที่เสนอ

```text
User Question
   |
   v
BS-AI-Assistant
   |
   +--> PromptService
   |      - load ais.t_ai_system_prompt
   |      - load ais.t_ai_page_config
   |
   +--> KnowledgeRetrievalService
   |      - embed user question
   |      - filter by process/module/allowed tables
   |      - prefilter candidate chunks via token inverted index
   |      - vector search knowledge chunks
   |      - retrieve schema catalog descriptions
   |
   +--> Prompt Assembly
   |      - global prompt
   |      - page prompt
   |      - retrieved business knowledge
   |      - retrieved schema descriptions
   |      - user context
   |
   +--> LLM Decision
   |      - BYPASS_SQL
   |      - GENERATE_SQL
   |
   +--> SQL Guardrails
   |      - read-only validation
   |      - syntax validation
   |      - row limit
   |      - table/column scope validation
   |
   v
Response + Audit Log
```

## 4. BS-AI-KnowledgeBase Components

### 4.1 Knowledge document

ใช้เก็บเอกสารต้นทาง เช่น process, API, business rule, FAQ, UI page context และ generated schema summary

ตารางที่เสนอ:

- `ais.t_ai_knowledge_document`

ตัวอย่าง `doc_type`:

- `system_overview`
- `process`
- `schema`
- `api`
- `business_rule`
- `faq`
- `error_code`
- `ui_page`

### 4.2 Knowledge chunk

ใช้เก็บ chunk ที่พร้อมนำไป embed และ retrieve

ตารางที่เสนอ:

- `ais.t_ai_knowledge_chunk`

แต่ละ chunk ควรมี metadata:

- `doc_type`
- `process`
- `module_name`
- `schema_name`
- `table_name`
- `language`
- `source_hash`
- `embedding_text`
- `embedding_vector`

### 4.3 Chunk token index

ใช้เก็บ inverted token index เพื่อทำ keyword prefiltering ก่อน vector similarity scoring เหมาะกับ production scale ที่มี chunk จำนวนมาก ระบบจะแตกคำค้น (tokenize) ออกจาก `embedding_text` ของแต่ละ chunk แล้วเขียนลง token index ทุกครั้งที่ generate chunk ใหม่

ตารางที่เสนอ:

- `ais.t_ai_knowledge_chunk_token`

ข้อมูลที่ควรเก็บ:

- `knowledge_chunk_id` — FK ไปยัง `t_ai_knowledge_chunk`
- `token` — normalized token ที่ extract จาก chunk text
- `token_weight` — ความถี่หรือน้ำหนักของ token นั้นใน chunk (ใช้ใน BM25 scoring)
- `create_date` — วันที่สร้าง record

โครงสร้าง index:

- Primary Key: `(token, knowledge_chunk_id)` — clustered เพื่อค้น token เร็ว
- Non-clustered index บน `knowledge_chunk_id` — สำหรับ lookup ย้อนกลับ

การทำงานในระบบ:

1. ingestion pipeline tokenize `embedding_text` → upsert เข้า token index
2. ตอน retrieval: tokenize user query → JOIN กับ token index → ได้ candidate `knowledge_chunk_id` set
3. นำ candidate set ไปคำนวณ vector similarity เฉพาะ chunk ที่ผ่าน prefilter
4. ลด latency และ cost เมื่อ chunk มีปริมาณมาก

> ตาราง `t_ai_knowledge_chunk_token` เป็น system-generated index — admin ไม่ต้องกรอกเอง ระบบ generate อัตโนมัติขณะ ingest knowledge document

### 4.4 Schema catalog

ใช้เก็บ snapshot ของ database schema ที่ sync มาจาก SQL Server metadata และ `MS_Description`

ตารางที่เสนอ:

- `ais.t_ai_schema_catalog`
- `ais.t_ai_schema_relation`

ข้อมูลที่ควรเก็บ:

- schema name
- table name
- table description
- column name
- column description
- data type
- max length / precision / scale
- nullable
- primary key flag
- foreign key relation
- source object id / column id
- last sync date

### 4.5 Retrieval log

ใช้ audit ว่าแต่ละ chat request ใช้ context อะไร

ตารางที่เสนอ:

- `ais.t_ai_knowledge_retrieval_log`

ควรเก็บ:

- `ai_chat_log_id`
- `knowledge_chunk_id`
- `schema_catalog_id`
- similarity score
- rank
- retrieval mode
- created date

## 5. Schema Description Sync จาก SQL Server

แหล่งข้อมูลหลัก:

- `sys.schemas`
- `sys.tables`
- `sys.columns`
- `sys.types`
- `sys.extended_properties`
- `sys.indexes`
- `sys.index_columns`
- `sys.foreign_keys`
- `sys.foreign_key_columns`

description ใช้ `MS_Description`:

- table description: extended property ที่ level table
- column description: extended property ที่ level column

ตัวอย่าง query หลัก:

```sql
SELECT
    s.name AS schema_name,
    t.name AS table_name,
    CAST(tbl_desc.value AS NVARCHAR(MAX)) AS table_description,
    c.name AS column_name,
    ty.name AS data_type,
    c.max_length,
    c.precision,
    c.scale,
    c.is_nullable,
    CAST(col_desc.value AS NVARCHAR(MAX)) AS column_description
FROM sys.tables t
JOIN sys.schemas s
    ON s.schema_id = t.schema_id
JOIN sys.columns c
    ON c.object_id = t.object_id
JOIN sys.types ty
    ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.extended_properties tbl_desc
    ON tbl_desc.major_id = t.object_id
   AND tbl_desc.minor_id = 0
   AND tbl_desc.name = N'MS_Description'
LEFT JOIN sys.extended_properties col_desc
    ON col_desc.major_id = c.object_id
   AND col_desc.minor_id = c.column_id
   AND col_desc.name = N'MS_Description'
WHERE t.is_ms_shipped = 0;
```

## 6. ลดการกรอก Knowledge Base เองอย่างไร

หลักการคือให้คนดูแลระบบเขียน schema description ที่ database เพียงจุดเดียว แล้วระบบ sync ไปเป็น AI knowledge อัตโนมัติ

สิ่งที่ยังควรเขียน manual:

- business process
- workflow เฉพาะระบบ
- business rule ที่ไม่ได้อยู่ใน schema
- API behavior
- FAQ
- error meaning

สิ่งที่ไม่ควรเขียนซ้ำใน manual knowledge:

- table ใช้ทำอะไร ถ้ามี table `MS_Description`
- column ใช้ทำอะไร ถ้ามี column `MS_Description`
- relation ถ้ามี foreign key จริง
- data type / nullable / key information

## 7. Retrieval Strategy

เมื่อ user ถาม:

1. รับ `process`, `user_message`, `user_id`, `user_name`
2. โหลด `ais.t_ai_page_config`
3. parse `allowed_tables` และ `allowed_columns`
4. embed user question
5. retrieve knowledge chunks ด้วย vector search
6. retrieve schema catalog ที่เกี่ยวข้องกับ:
   - process/page
   - module
   - allowed tables
   - terms ใน user question
7. รวม context แบบจัดลำดับ:
   - page/process-specific knowledge
   - schema descriptions
   - business rules
   - API docs
   - system overview

ค่าเริ่มต้นที่แนะนำ:

- top-k knowledge chunks: 5
- top-k schema items: 10 ถึง 30 columns
- similarity threshold: เริ่มที่ 0.65 แล้วปรับจาก evaluation
- prefer same process/page ก่อน global context

## 8. Prompt Assembly Template

```text
=== SYSTEM INSTRUCTIONS ===
{system_prompt}

=== PAGE CONTEXT ===
Current Page: {page_name} ({process})
{sub_system_prompt}
Allowed Tables: {allowed_tables}
Allowed Columns: {allowed_columns}

=== RETRIEVED KNOWLEDGE CONTEXT ===
[1] {doc_type} | {title}
{chunk_content}

=== RETRIEVED SCHEMA DESCRIPTION CONTEXT ===
Table: {schema_name}.{table_name}
Description: {table_description}
Columns:
- {column_name} ({data_type}, nullable={is_nullable}): {column_description}
Relations:
- {fk_description}

=== SQL GENERATION RULES FROM RETRIEVED CONTEXT ===
- Generate SQL only from tables/columns listed in allowed config or retrieved schema context.
- If table or column details are missing, do not guess. Ask for clarification or say schema context is insufficient.
- Use read-only SELECT/WITH only.

=== USER CONTEXT ===
user_id = {user_id}
user_name = {user_name}

=== QUESTION ===
{user_message}
```

## 9. SQL Safety Enhancements

คงของเดิม:

- allow only `SELECT` / `WITH`
- block DML/DDL/EXEC keywords
- inject TOP row limit
- validate SQL syntax with `SET NOEXEC ON`
- query timeout
- audit generated SQL

เพิ่ม:

- validate table names against `allowed_tables` plus retrieved schema context
- validate columns when `allowed_columns` is configured
- reject SQL that references unknown table/column
- log retrieval context before execution
- add prompt rule: if schema context is insufficient, do not generate SQL

## 10. Implementation Roadmap

### Phase 1: Database foundation

- เพิ่ม SQL script `create_ai_knowledge_base.sql`
- สร้าง tables:
  - `ais.t_ai_knowledge_document`
  - `ais.t_ai_knowledge_chunk`
  - `ais.t_ai_knowledge_chunk_token` — inverted token index สำหรับ BM25 prefiltering
  - `ais.t_ai_schema_catalog`
  - `ais.t_ai_schema_relation`
  - `ais.t_ai_knowledge_retrieval_log`
- เพิ่ม indexes สำหรับ lookup ตาม process/module/table
- token index: PK clustered `(token, knowledge_chunk_id)`, non-clustered บน `knowledge_chunk_id`

### Phase 2: Schema metadata sync

- เพิ่ม service:
  - `ISchemaMetadataService`
  - `SchemaMetadataService`
- เพิ่ม job/endpoint สำหรับ sync:
  - `POST /api/ai/knowledge/sync-schema`
- อ่าน `MS_Description` จาก SQL Server
- upsert เข้า `ais.t_ai_schema_catalog`
- generate schema chunks สำหรับ embedding

### Phase 3: Embedding + vector storage

ตัวเลือก:

- SQL Server native vector ถ้า environment รองรับ
- Qdrant ถ้าต้องการ vector database แยก service
- fallback ระยะแรก: keyword/hybrid search ก่อน แล้วค่อยเปิด vector search

เพิ่ม service:

- `IEmbeddingService`
- `IKnowledgeIngestionService`
- `IKnowledgeRetrievalService`

### Phase 4: Runtime integration

- inject `IKnowledgeRetrievalService` เข้า `AiOrchestratorService`
- retrieve context หลัง build prompt เดิม
- append retrieved knowledge/schema context ก่อนเรียก LLM
- บันทึก retrieval log คู่กับ `ais.t_ai_chat_log`

### Phase 5: Evaluation

สร้างชุดคำถามทดสอบ:

- architecture/system overview
- item master
- import/export
- stock report
- user-specific query เช่น "ของฉัน"
- unknown schema question
- unsafe SQL request

วัดผล:

- SQL correctness
- answer correctness
- hallucination rate
- retrieval precision
- token usage
- response latency

## 11. Acceptance Criteria

ถือว่างานสำเร็จเมื่อ:

- sync schema description จาก SQL Server เข้า schema catalog ได้
- knowledge chunks รองรับทั้ง manual docs และ generated schema docs
- AI retrieve schema description ที่เกี่ยวข้องก่อน generate SQL
- AI ไม่เดา table/column เมื่อไม่มี context
- retrieval log แสดงได้ว่า chat แต่ละครั้งใช้ knowledge ไหน
- admin แก้ `MS_Description` ใน DB แล้ว sync ใหม่เพื่ออัปเดต AI knowledge ได้

## 12. Recommended Next Build Order

ลำดับที่แนะนำให้เริ่มจริง:

1. run `create_ai_knowledge_base.sql`
2. implement `SchemaMetadataService`
3. implement schema sync endpoint/job
4. generate schema chunks from catalog
5. implement retrieval service แบบ keyword/hybrid ก่อน
6. ต่อ embedding/vector search
7. integrate เข้า chat flow
8. เพิ่ม evaluation test set

