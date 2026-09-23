# BS-AI-KnowledgeBase Implementation Summary

สรุปงานที่เพิ่มสำหรับปรับปรุง `BS-AI-Assistant` ให้รองรับ RAG และใช้ schema description จาก SQL Server เป็น knowledge source

## สิ่งที่ทำแล้ว

### 1. เพิ่มเอกสารแผนหลัก

ไฟล์:

- `BS-AI-Assistant/docs/rag_knowledge_base_schema_description_plan.md`

เนื้อหาหลัก:

- architecture ของ `BS-AI-KnowledgeBase`
- แนวทางใช้ RAG ร่วมกับ prompt เดิม
- วิธี sync schema description จาก SQL Server
- retrieval strategy
- prompt assembly template
- SQL guardrails ที่ควรเพิ่ม
- roadmap สำหรับทำ vector search เต็มรูปแบบ

### 2. เพิ่ม SQL migration สำหรับ KnowledgeBase

ไฟล์:

- `BS-AI-Assistant/AiAssistant/SQL/create_ai_knowledge_base.sql`
- `BS-AI-Assistant/AiAssistant/SQL/add_ai_knowledge_base_field_descriptions.sql`
- `BS-AI-Assistant/AiAssistant/SQL/migrate_ai_knowledge_base_standard_audit_columns.sql`

ตารางที่เพิ่ม:

- `ais.t_ai_knowledge_document`
- `ais.t_ai_knowledge_chunk`
- `ais.t_ai_schema_catalog`
- `ais.t_ai_schema_relation`
- `ais.t_ai_knowledge_retrieval_log`

View ที่เพิ่ม:

- `ais.v_ai_schema_metadata_source`
- `ais.v_ai_schema_relation_source`

หน้าที่ของ view:

- อ่าน table/column metadata จาก `sys.tables`, `sys.columns`, `sys.types`
- อ่าน table/column description จาก `sys.extended_properties` โดยใช้ `MS_Description`
- อ่าน primary key และ foreign key relation เพื่อให้ AI เข้าใจ schema และ join path ได้ดีขึ้น

Field descriptions:

- เพิ่ม `MS_Description` ระดับ column ให้ทุก field ของตาราง KnowledgeBase ที่สร้างใหม่
- ใช้ script `add_ai_knowledge_base_field_descriptions.sql` สำหรับ DB ที่มีตารางอยู่แล้ว
- description เหล่านี้จะถูกอ่านกลับเข้า `t_ai_schema_catalog` เมื่อเรียก sync schema รอบถัดไป

### 3. เพิ่ม Schema Metadata Sync Service

ไฟล์:

- `BS-AI-Assistant/AiAssistant/Services/Interfaces/ISchemaMetadataService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/SchemaMetadataService.cs`

หน้าที่:

- sync metadata จาก `ais.v_ai_schema_metadata_source` เข้า `ais.t_ai_schema_catalog`
- sync FK relation จาก `ais.v_ai_schema_relation_source` เข้า `ais.t_ai_schema_relation`
- mark row ที่หายจาก source เป็น inactive
- รองรับการ preview schema catalog ที่ active อยู่

### 4. เพิ่ม Admin API สำหรับ KnowledgeBase

ไฟล์:

- `BS-AI-Assistant/AiAssistant/Controllers/AiKnowledgeController.cs`

Endpoint ที่เพิ่ม:

```http
POST /api/ai/knowledge/sync-schema
```

ใช้ sync schema description จาก database เข้า AI schema catalog

```http
GET /api/ai/knowledge/schema-catalog?schemaName=dbo&tableName=t_item&limit=100
```

ใช้ preview schema catalog ที่ AI จะนำไปใช้เป็น schema context

```http
GET /api/ai/knowledge/retrieval-preview?process=/master/item&query=show%20item%20status
```

ใช้ preview RAG context ที่จะ inject เข้า prompt โดยไม่ต้องเรียก LLM

### 5. เพิ่ม Response Models

ไฟล์:

- `BS-AI-Assistant/AiAssistant/Models/Responses/SchemaSyncResponse.cs`
- `BS-AI-Assistant/AiAssistant/Models/Responses/SchemaCatalogPreviewResponse.cs`

ใช้เป็น response contract สำหรับ sync endpoint และ preview endpoint

### 6. Register Service ใน DI

ไฟล์:

- `BS-AI-Assistant/AiAssistant/Program.cs`

เพิ่ม:

```csharp
builder.Services.AddScoped<ISchemaMetadataService, SchemaMetadataService>();
builder.Services.AddScoped<IKnowledgeRetrievalService, KnowledgeRetrievalService>();
```

### 7. เพิ่ม Knowledge Retrieval Service ระยะแรก

ไฟล์:

- `BS-AI-Assistant/AiAssistant/Services/Interfaces/IKnowledgeRetrievalService.cs`
- `BS-AI-Assistant/AiAssistant/Services/Implementation/KnowledgeRetrievalService.cs`
- `BS-AI-Assistant/AiAssistant/Models/Responses/KnowledgeRetrievalResult.cs`
- `BS-AI-Assistant/AiAssistant/Models/Responses/KnowledgeRetrievalPreviewResponse.cs`

หน้าที่:

- retrieve manual knowledge chunks จาก `ais.t_ai_knowledge_chunk`
- retrieve schema context จาก `ais.t_ai_schema_catalog`
- retrieve FK relation จาก `ais.t_ai_schema_relation`
- format context สำหรับ inject เข้า prompt
- ใช้ keyword/hybrid scoring เป็นเฟสแรกก่อนต่อ vector search จริง

### 8. Integrate RAG Context เข้า Chat Flow

ไฟล์:

- `BS-AI-Assistant/AiAssistant/Services/Implementation/AiOrchestratorService.cs`

ตอน `ProcessChatAsync` จะ:

- โหลด prompt เดิมจาก `PromptService`
- โหลด page config เพื่อใช้ `allowed_tables` / `allowed_columns`
- เรียก `KnowledgeRetrievalService`
- append `RETRIEVED KNOWLEDGE CONTEXT` และ `RETRIEVED SCHEMA DESCRIPTION CONTEXT` เข้า prompt ก่อนเรียก LLM

## Flow การใช้งานที่แนะนำ

1. Run SQL migration:

```sql
BS-AI-Assistant/AiAssistant/SQL/create_ai_knowledge_base.sql
```

2. เพิ่มหรือแก้ `MS_Description` ใน SQL Server table/column

3. เรียก sync endpoint:

```http
POST /api/ai/knowledge/sync-schema
```

4. ตรวจข้อมูลที่ sync แล้ว:

```http
GET /api/ai/knowledge/schema-catalog
```

5. ตรวจ retrieval context:

```http
GET /api/ai/knowledge/retrieval-preview?process=/master/item&query=show%20item%20status
```

6. `KnowledgeRetrievalService` จะนำ schema catalog และ knowledge chunks ไป inject เข้า prompt runtime อัตโนมัติใน `AiOrchestratorService`

## ประโยชน์ที่ได้

- ไม่ต้องเขียน schema knowledge ซ้ำในเอกสารทุกครั้ง
- ใช้ DB description เป็น source of truth
- AI generate SQL ได้แม่นขึ้น เพราะมี table/column description จริง
- รองรับ audit ว่า AI ใช้ knowledge ไหนตอบ
- พร้อมต่อยอดเป็น vector search เต็มรูปแบบ

## Verification

รัน build แล้วผ่าน:

```powershell
dotnet build BS-AI-Assistant\AiAssistant\AiAssistant.csproj
```

ผลลัพธ์:

- Build succeeded
- 0 warnings
- 0 errors

รัน schema sync ผ่าน API แล้ว:

```http
POST /api/ai/knowledge/sync-schema
```

ผลลัพธ์:

- source columns: 1146
- active catalog columns: 1146
- source relations: 57
- active relations: 57

รัน retrieval preview แล้ว:

```http
GET /api/ai/knowledge/retrieval-preview?process=/master/item&query=show%20item%20status
```

ผลลัพธ์:

- knowledge chunks: 0
- schema columns: 50
- schema relations: 13
- retrieved context มี `inv.t_inv_item`, `inv.t_inv_item_uom`, `inv.t_inv_category` และ FK relations ที่เกี่ยวข้อง

## งานถัดไปที่ควรทำ

1. Run migration บน database dev
2. เรียก `POST /api/ai/knowledge/sync-schema`
3. ตรวจ catalog ผ่าน `GET /api/ai/knowledge/schema-catalog`
4. เพิ่ม ingestion สำหรับ manual docs เข้า `t_ai_knowledge_document` / `t_ai_knowledge_chunk`
5. เพิ่ม `IEmbeddingService`
6. เลือก vector storage:
   - SQL Server native vector ถ้า environment รองรับ
   - Qdrant ถ้าต้องการแยก vector DB
7. เปลี่ยน retrieval scoring จาก keyword/hybrid เป็น vector/hybrid
8. เพิ่ม validation table/column scope ก่อน execute SQL
