# System Requirements Specification (SRS): AI Database Assistant (V4)

## 1. System Overview

The AI Database Assistant architecture utilizes **Context-Aware Prompting**, dynamically adjusting the AI's behavior based on the specific "Page" context. This increases accuracy and optimizes resource usage by minimizing unnecessary SQL generation.

## 2. Tech Stack

- **Frontend:** React
- **Backend / AI Orchestrator:** .NET Core Web API + Microsoft Semantic Kernel
- **Database:** SQL Server
- **AI Provider:** OpenRouter (OpenAI-compatible)

---

## 3. Prompt Hierarchy Structure

The final prompt is a combination of:

1. **System Prompt (`t_ais_system_prompt`):** Global rules and guidelines.
2. **Sub-System Prompt (`t_ais_ai_page_config`):** Page-specific instructions mapped by the `process` field.

---

## 4. Detailed Process Flow

1. **Context Identification:** Backend retrieves `sub_system_prompt` based on the `process` parameter from the UI.
2. **Fast Path (Bypass SQL):** If the prompt context is sufficient, the AI responds directly without querying the DB.
3. **Fallback Path (SQL Generation):** If data is needed, the AI generates/executes SQL within the allowed scope.

---

## 5. AI Provider Management

Supports OpenRouter with a configuration-driven approach for multi-model flexibility.

---

## 6. Logging & Observability

Every interaction and AI decision must be logged in the `t_ais_chat_log` table for auditing, debugging, and cost monitoring.

### 6.1. Log Data Points (Table: `t_ais_chat_log`)

The following details must be captured for every transaction:

- **Context:** `process` (page path), `user_id`
- **Conversation:** `user_message` (raw input), `ai_response` (final output)
- **AI Decision Trace:** `system_prompt_id`, `ai_config_id`, `ai_decision` (Track whether it was a `BYPASS_SQL` or `GENERATE_SQL` path), `generated_sql` (the actual SQL executed)
- **Resource Consumption:** `prompt_tokens`, `completion_tokens`, `total_tokens`, `processing_time_ms` (latency)
- **System Health:** `is_success`, `error_message` (in case of failure)

### 6.2. Key Objectives

1. **Debugging:** Analyze generated SQL and AI reasoning when results are inaccurate.
2. **Cost Tracking:** Monitor token consumption per page or process to manage the OpenRouter budget.
3. **Security:** Maintain an audit trail of all data-related inquiries and AI-generated queries.
