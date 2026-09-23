# คำอธิบายตาราง AI KnowledgeBase

เอกสารนี้สรุปหน้าที่ของตารางกลุ่ม AI KnowledgeBase ใน schema `ais` ว่าแต่ละตารางสร้างขึ้นมาเพื่ออะไร เก็บข้อมูลอะไร เชื่อมโยงกันอย่างไร และสถานะข้อมูลปัจจุบันเป็นอย่างไร

## ภาพรวม

กลุ่มตาราง AI KnowledgeBase ถูกสร้างขึ้นมาเพื่อรองรับ RAG (Retrieval-Augmented Generation) ให้ AI Assistant มีบริบทเพิ่มเติมก่อนตอบคำถามหรือสร้าง SQL โดยแบ่งออกเป็น 2 ส่วนหลัก

1. **Manual Knowledge Base**
   - เก็บเอกสาร คู่มือ business rules หรือคำอธิบาย flow ของระบบ
   - ถูกออกแบบให้รองรับการ chunk และ embedding สำหรับ vector search
   - ตารางหลักคือ `ais.t_ai_knowledge_document` และ `ais.t_ai_knowledge_chunk`

2. **Schema Knowledge จากฐานข้อมูล**
   - เก็บคำอธิบาย schema/table/column และ relation ที่ sync มาจาก SQL Server metadata และ `MS_Description`
   - ช่วยให้ AI เข้าใจความหมายของตารางและ column โดยไม่ต้องเขียนรายละเอียดซ้ำใน knowledge base เอง
   - ตารางหลักคือ `ais.t_ai_schema_catalog` และ `ais.t_ai_schema_relation`

ปัจจุบันระบบใช้งานส่วน Schema Knowledge แล้ว และมี ingestion pipeline สำหรับเพิ่ม Manual Knowledge Base, สร้าง chunk, สร้าง embedding และค้นหาแบบ vector/keyword hybrid แล้ว

## สถานะข้อมูลปัจจุบัน

จากการตรวจสอบฐานข้อมูลล่าสุด พบจำนวนข้อมูลโดยประมาณดังนี้

| Table | Row Count | สถานะ |
|---|---:|---|
| `ais.t_ai_knowledge_document` | 0 | ยังไม่มีเอกสาร manual knowledge ในฐานปัจจุบัน แต่มี API สำหรับเพิ่มแล้ว |
| `ais.t_ai_knowledge_chunk` | 0 | ยังไม่มี chunk ในฐานปัจจุบัน แต่ระบบสร้าง chunk และ embedding ให้ได้แล้วเมื่อ ingest/rebuild |
| `ais.t_ai_knowledge_retrieval_log` | 0 | พร้อมบันทึก retrieval audit สำหรับ chat จริง แต่ฐานปัจจุบันยังไม่มี chat ใหม่หลังเปิด feature |
| `ais.t_ai_schema_catalog` | 1,153 | มี schema/column description แล้ว |
| `ais.t_ai_schema_relation` | 57 | มี foreign-key relation แล้ว |

ดังนั้นถ้าพี่แอมป์เปิดดูแล้วไม่เห็นข้อมูลใน `t_ai_knowledge_document` หรือ `t_ai_knowledge_chunk` ถือว่าถูกต้องตามสถานะปัจจุบัน เพราะยังไม่ได้ใส่เอกสาร manual knowledge จริงเข้าไป แต่ตอนนี้มี endpoint สำหรับใส่เอกสารและสร้าง chunk แล้ว

## ตารางและหน้าที่

### `ais.t_ai_knowledge_document`

ตารางนี้ใช้เก็บเอกสารต้นฉบับแบบเต็มก่อนนำไปตัดเป็น chunk

**สร้างขึ้นมาเพื่อ**
- เป็นแหล่งเก็บ knowledge source ระดับเอกสาร
- รองรับเอกสารหลายประเภท เช่น คู่มือระบบ, business rule, SOP, page guide, process document หรือเอกสารที่ generate จากระบบ
- เป็น parent ของ chunk ที่จะนำไปค้นหาแบบ RAG/vector search

**ข้อมูลที่เก็บ**
- `doc_type`: ประเภทเอกสาร เช่น business_rule, page_doc, schema_summary
- `title`: ชื่อเอกสาร
- `content`: เนื้อหาเต็มของเอกสาร
- `process`: path ของหน้าจอที่เกี่ยวข้อง เช่น `/master/item` หรือ `/transaction/inbound`
- `module_name`: ชื่อ module
- `schema_name`, `table_name`: ใช้ผูกเอกสารกับ table ถ้าเป็นเอกสารเชิง schema
- `source_path`, `source_version`, `source_hash`: ใช้ track ที่มาของเอกสารและ version
- `language_code`: ภาษาเอกสาร
- `is_generated`: บอกว่าเอกสารถูก generate จากระบบหรือเพิ่มเอง
- `is_active`: ใช้เปิด/ปิดการใช้งานเอกสาร

**เชื่อมโยงกับ**
- `ais.t_ai_knowledge_chunk` ผ่าน `knowledge_document_id`

## `ais.t_ai_knowledge_chunk`

ตารางนี้ใช้เก็บเนื้อหาย่อยที่ตัดจากเอกสารใน `t_ai_knowledge_document`

**สร้างขึ้นมาเพื่อ**
- ทำให้ค้นหา knowledge ได้ละเอียดกว่าระดับเอกสารทั้งฉบับ
- รองรับ RAG และ vector search
- เก็บ embedding metadata และ vector fallback ในรูปแบบ JSON

**ข้อมูลที่เก็บ**
- `knowledge_document_id`: อ้างถึงเอกสารต้นทาง
- `chunk_index`: ลำดับ chunk ในเอกสาร
- `chunk_title`: ชื่อ chunk ถ้ามี
- `chunk_content`: เนื้อหาย่อยที่ใช้ส่งเข้า prompt
- `embedding_text`: ข้อความที่ใช้สร้าง embedding
- `embedding_provider`, `embedding_model`, `embedding_dimension`: รายละเอียด model ที่ใช้สร้าง embedding
- `embedding_json`: vector ที่เก็บเป็น JSON เพื่อรองรับ portability
- `content_hash`: hash สำหรับตรวจซ้ำหรือ detect การเปลี่ยนเนื้อหา
- `token_count`: จำนวน token โดยประมาณ
- `is_embedded`: บอกว่า chunk นี้สร้าง embedding แล้วหรือยัง
- `is_active`: ใช้เปิด/ปิด chunk

**เชื่อมโยงกับ**
- `ais.t_ai_knowledge_document` ผ่าน `knowledge_document_id`
- `ais.t_ai_knowledge_retrieval_log` ผ่าน `knowledge_chunk_id`

## `ais.t_ai_schema_catalog`

ตารางนี้ใช้เก็บ metadata ของ schema/table/column ที่ sync มาจาก SQL Server

**สร้างขึ้นมาเพื่อ**
- ให้ AI เข้าใจโครงสร้างฐานข้อมูลจากคำอธิบายจริงใน database
- ลดการเขียน schema description ซ้ำใน knowledge base
- เป็น source of truth สำหรับ schema-aware SQL generation
- ช่วยให้ AI ไม่เดาชื่อตารางหรือ column เอง

**ข้อมูลที่เก็บ**
- `schema_name`: ชื่อ schema เช่น `inv`, `ais`
- `table_name`: ชื่อตาราง
- `table_description`: คำอธิบายตารางจาก `MS_Description`
- `column_name`: ชื่อ column
- `column_description`: คำอธิบาย column จาก `MS_Description`
- `data_type`, `max_length`, `precision_value`, `scale_value`: รายละเอียดชนิดข้อมูล
- `is_nullable`: column เป็น nullable หรือไม่
- `is_primary_key`: เป็น primary key หรือไม่
- `is_identity`: เป็น identity หรือไม่
- `object_id`, `column_id`: metadata จาก SQL Server
- `metadata_hash`: ใช้ตรวจจับการเปลี่ยนแปลง metadata
- `last_synced_date`: วันที่ sync ล่าสุด
- `is_active`: ใช้เปิด/ปิด record ที่ยังตรงกับ schema ปัจจุบัน

**เชื่อมโยงกับ**
- `ais.t_ai_knowledge_retrieval_log` ผ่าน `schema_catalog_id`
- ใช้คู่กับ `ais.t_ai_page_config.allowed_tables` เพื่อจำกัด schema context ตามหน้าจอ

## `ais.t_ai_schema_relation`

ตารางนี้ใช้เก็บความสัมพันธ์ foreign key ระหว่างตาราง

**สร้างขึ้นมาเพื่อ**
- ให้ AI รู้ว่าตารางไหน join กับตารางไหนได้อย่างถูกต้อง
- ลดความเสี่ยงที่ AI จะเดา join ผิด
- ช่วยสร้าง SQL ที่สัมพันธ์กับโครงสร้างจริงของฐานข้อมูล

**ข้อมูลที่เก็บ**
- `foreign_key_name`: ชื่อ foreign key
- `parent_schema_name`, `parent_table_name`, `parent_column_name`: ฝั่งตารางลูกหรือ table ที่ถือ foreign key
- `referenced_schema_name`, `referenced_table_name`, `referenced_column_name`: ฝั่งตารางแม่ที่ถูกอ้างอิง
- `relation_description`: คำอธิบาย relation ถ้ามี
- `object_id`, `constraint_column_id`: metadata จาก SQL Server
- `last_synced_date`: วันที่ sync ล่าสุด
- `is_active`: ใช้เปิด/ปิด relation ที่ยังตรงกับ schema ปัจจุบัน

**เชื่อมโยงกับ**
- `ais.t_ai_knowledge_retrieval_log` ผ่าน `schema_relation_id`
- ใช้ร่วมกับ `t_ai_schema_catalog` ตอนสร้าง context ให้ AI

## `ais.t_ai_knowledge_retrieval_log`

ตารางนี้ใช้บันทึก audit ว่า AI ดึง knowledge หรือ schema context อะไรมาใช้ในแต่ละ chat

**สร้างขึ้นมาเพื่อ**
- ตรวจสอบย้อนหลังว่าแต่ละคำถามใช้ context อะไรประกอบการตอบ
- ช่วย debug คุณภาพคำตอบของ AI
- เก็บข้อมูล ranking และ similarity score สำหรับวิเคราะห์ retrieval quality

**ข้อมูลที่เก็บ**
- `ai_chat_log_id`: อ้างถึง chat log ที่เกี่ยวข้อง
- `knowledge_chunk_id`: chunk ที่ถูกดึงมาใช้ ถ้ามาจาก manual knowledge
- `schema_catalog_id`: schema/column ที่ถูกดึงมาใช้ ถ้ามาจาก schema catalog
- `schema_relation_id`: relation ที่ถูกดึงมาใช้ ถ้ามาจาก schema relation
- `retrieval_mode`: วิธี retrieval เช่น schema, relation, vector, keyword
- `similarity_score`: คะแนนความใกล้เคียง
- `rank_order`: ลำดับผลลัพธ์ที่ถูกเลือก
- `process`: หน้าจอที่ user ใช้งาน
- `query_text`: ข้อความคำถามที่ใช้ค้นหา
- `create_date`: วันที่บันทึก log

**เชื่อมโยงกับ**
- `ais.t_ai_chat_log` ผ่าน `ai_chat_log_id`
- `ais.t_ai_knowledge_chunk` ผ่าน `knowledge_chunk_id`
- `ais.t_ai_schema_catalog` ผ่าน `schema_catalog_id`
- `ais.t_ai_schema_relation` ผ่าน `schema_relation_id`

ปัจจุบันระบบจะบันทึก audit log ให้เมื่อมี chat request จริงและบันทึก `ais.t_ai_chat_log` สำเร็จ ส่วน endpoint `retrieval-preview` จะไม่เขียน log เพราะเป็น endpoint สำหรับตรวจสอบ context ก่อนเรียก AI

## Flow การทำงานปัจจุบัน

เมื่อผู้ใช้ถาม AI จากหน้าจอใดหน้าจอหนึ่ง ระบบทำงานโดยสรุปดังนี้

1. ตรวจ `process` ของหน้าจอ เช่น `/master/item` หรือ `/transaction/inbound`
2. โหลด config จาก `ais.t_ai_page_config`
3. ใช้ `allowed_tables` เพื่อจำกัดขอบเขตตารางที่ AI ใช้ได้
4. ดึง schema context จาก `ais.t_ai_schema_catalog`
5. ดึง relation context จาก `ais.t_ai_schema_relation`
6. ดึง manual knowledge จาก `ais.t_ai_knowledge_chunk` ด้วย vector/keyword hybrid scoring
7. รวม context แล้วส่งเข้า prompt ให้ AI ใช้ตอบคำถามหรือสร้าง SQL
8. เมื่อบันทึก chat log สำเร็จ ระบบจะบันทึก retrieval audit ลง `ais.t_ai_knowledge_retrieval_log`

ถ้า `t_ai_knowledge_chunk` ยังว่าง ระบบจะยังไม่ได้ใช้ manual knowledge จริง แต่ยังได้ schema-aware context จาก `t_ai_schema_catalog` และ `t_ai_schema_relation` อยู่ตามปกติ

## Ingestion Pipeline ที่เพิ่มแล้ว

ระบบมี API สำหรับ ingest เอกสารและสร้าง chunk แล้ว โดยอยู่ภายใต้ controller `api/ai/knowledge`

### เพิ่มเอกสารและสร้าง chunk ทันที

Endpoint:

```http
POST /api/ai/knowledge/documents
```

ตัวอย่าง request:

```json
{
  "doc_type": "business_rule",
  "title": "Inbound Receiving Rule",
  "content": "เนื้อหาเอกสารหรือ business rule ที่ต้องการให้ AI ใช้อ้างอิง",
  "process": "/transaction/inbound",
  "module_name": "Transaction",
  "language_code": "th-TH",
  "create_by": "admin",
  "generate_chunks": true,
  "chunk_size": 1200,
  "chunk_overlap": 150
}
```

เมื่อ `generate_chunks = true` ระบบจะทำงานให้ครบ 2 ขั้นตอน:

1. Insert เอกสารเข้า `ais.t_ai_knowledge_document`
2. ตัด `content` เป็น chunk แล้ว upsert เข้า `ais.t_ai_knowledge_chunk`

Chunk ที่สร้างตอนนี้จะมี embedding ทันที โดยใช้ local deterministic embedding provider:

- `embedding_provider = local`
- `embedding_model = bs-ai-local-hashing-v1`
- `embedding_dimension = 384`
- `is_embedded = 1`

Retrieval ปัจจุบันใช้คะแนนแบบ hybrid คือ keyword score รวมกับ cosine similarity จาก `embedding_json`

### สร้างหรือ rebuild chunk จากเอกสารที่มีอยู่

Endpoint สำหรับเอกสารเดียว:

```http
POST /api/ai/knowledge/documents/{documentId}/chunks
```

Endpoint สำหรับ rebuild ทุกเอกสาร active หรือระบุ document เดียวใน body:

```http
POST /api/ai/knowledge/rebuild-chunks
```

ตัวอย่าง request:

```json
{
  "knowledge_document_id": 1,
  "chunk_size": 1200,
  "chunk_overlap": 150
}
```

ถ้าไม่ระบุ `knowledge_document_id` ใน `/rebuild-chunks` ระบบจะ rebuild chunk ให้ทุกเอกสารที่ active

### สร้างหรือ rebuild embedding จาก chunk ที่มีอยู่

Endpoint:

```http
POST /api/ai/knowledge/rebuild-embeddings
```

ตัวอย่าง request:

```json
{
  "knowledge_document_id": 1
}
```

ถ้าไม่ระบุ `knowledge_document_id` ระบบจะ rebuild embedding ให้ทุก active chunk

### ดูรายการเอกสารและจำนวน chunk

Endpoint:

```http
GET /api/ai/knowledge/documents
```

รองรับ filter:

```http
GET /api/ai/knowledge/documents?process=/transaction/inbound&docType=business_rule
```

Response จะบอกเอกสารที่มีอยู่และ `chunk_count` ของแต่ละเอกสาร

## ทำไมตาราง Knowledge Document และ Chunk ยังว่าง

สาเหตุหลักคือยังไม่ได้ใส่เอกสาร manual knowledge จริงเข้าไปในระบบ

สิ่งที่มีแล้ว:

1. API สำหรับเพิ่มเอกสารเข้า `t_ai_knowledge_document`
2. ตัวตัดเอกสารเป็น chunk แล้ว upsert เข้า `t_ai_knowledge_chunk`
3. Endpoint สำหรับ rebuild chunk จากเอกสารที่มีอยู่
4. ตัวสร้าง embedding แบบ local deterministic vector ลง `embedding_json`
5. Endpoint สำหรับ rebuild embedding จาก chunk ที่มีอยู่
6. Retrieval logic ที่อ่าน chunk active จาก `t_ai_knowledge_chunk` และจัดอันดับด้วย vector/keyword hybrid

สิ่งที่ยังเป็น phase ถัดไป:

1. เปลี่ยนจาก local embedding เป็น external embedding provider ถ้าต้องการ semantic quality สูงขึ้น
2. ใช้ SQL Server native vector index หรือ dedicated vector database ถ้าปริมาณ chunk ใหญ่มาก
3. เพิ่มหน้า UI สำหรับจัดการเอกสาร knowledge document ถ้าต้องการให้ admin upload/แก้ไขจากหน้าเว็บ

## สรุปสั้น

ตอนนี้ระบบไม่ได้ว่างทั้งหมดค่ะ แต่ใช้งานอยู่คนละส่วน

- `t_ai_schema_catalog` และ `t_ai_schema_relation` มีข้อมูลแล้ว และเป็นส่วนที่ AI ใช้เข้าใจ schema จากฐานข้อมูล
- `t_ai_knowledge_document` และ `t_ai_knowledge_chunk` ยังว่าง เพราะยังไม่ได้ใส่ manual knowledge จริง แต่ตอนนี้มี API สำหรับ ingest, สร้าง chunk และสร้าง embedding แล้ว
- `t_ai_knowledge_retrieval_log` ยังว่างในฐานตอนนี้ เพราะยังไม่มี chat ใหม่หลังเปิด feature แต่ระบบบันทึก audit สำหรับ chat จริงแล้ว

ดังนั้นสิ่งที่มีตอนนี้คือ **schema-aware RAG พร้อมใช้งาน** และ **document RAG แบบ vector/keyword hybrid พร้อม ingest + chunk + embedding + chat retrieval audit แล้ว** ส่วนที่ยังเป็น phase ถัดไปคือ external embedding provider, vector index ระดับ production scale และหน้า UI สำหรับจัดการเอกสาร
