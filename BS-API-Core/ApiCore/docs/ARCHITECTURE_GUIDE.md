# 🏛️ Architecture Overview - Generic Base Pattern

## 📐 **สถาปัตยกรรมโครงการ**

### **🎯 Design Principles**

1. **DRY (Don't Repeat Yourself)** - ลดการเขียนโค้ดซ้ำ
2. **SOLID Principles** - Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
3. **Generic Programming** - ใช้ Generic Types เพื่อ reusability
4. **Repository Pattern** - แยก Data Access Layer
5. **Dependency Injection** - Loose coupling between components

---

## 🧩 **Component Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    🌐 API Layer                              │
├─────────────────────────────────────────────────────────────┤
│  Controllers/                                               │
│  ├── BaseController<T,TResponse,TCreate,TUpdate,TSummary,TDataGrid>  │
│  ├── CustomersController : BaseController<...>             │
│  ├── ProjectsController : BaseController<...>              │
│  └── TimeEntriesController : BaseController<...>           │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                  💼 Business Logic Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Services/                                                  │
│  ├── BaseService<T,TResponse,TCreate,TUpdate,TSummary,TDataGrid>     │
│  ├── CustomerService : BaseService<...>                    │
│  ├── ProjectService : BaseService<...>                     │
│  └── TimeEntryService : BaseService<...>                   │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                  🗄️ Data Access Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Repositories/                                              │
│  ├── IRepository<T>                                         │
│  └── Repository<T> : IRepository<T>                         │
│                                                             │
│  ApplicationDbContext                                       │
│  ├── DbSet<Customer>                                        │
│  ├── DbSet<Project>                                         │
│  └── DbSet<TimeEntry>                                       │
└─────────────────────────────────────────────────────────────┘
                            ⬇️
┌─────────────────────────────────────────────────────────────┐
│                    🗂️ Database Layer                        │
├─────────────────────────────────────────────────────────────┤
│  SQL Server Database                                        │
│  ├── customers table                                        │
│  ├── projects table                                         │
│  └── time_entries table                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Generic Base Classes**

### **🎮 BaseController<T, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest>**

**หน้าที่:**

- รับ HTTP Requests
- Validate input
- เรียก Business Logic
- Return HTTP Responses

**Standard Endpoints:**

```csharp
GET    /api/{controller}/summary        → GetSummary()
POST   /api/{controller}/datagrid       → GetDataGrid()
GET    /api/{controller}/{id}           → GetById()
POST   /api/{controller}                → Create()
PUT    /api/{controller}/{id}           → Update()
DELETE /api/{controller}/{id}           → Delete()
```

**Virtual Methods (Override ได้):**

```csharp
protected virtual Task<ActionResult<ApiResponse<TSummaryResponse>>> GetSummary()
protected virtual Task<ActionResult<DataGridResponse<TResponse>>> GetDataGrid()
protected virtual Task<ActionResult<ApiResponse<TResponse>>> GetById()
protected virtual Task<ActionResult<ApiResponse<TResponse>>> Create()
protected virtual Task<ActionResult<ApiResponse<TResponse>>> Update()
protected virtual Task<ActionResult<ApiResponse<string>>> Delete()
```

### **⚙️ BaseService<T, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest>**

**หน้าที่:**

- Business Logic
- Data Validation
- Entity Mapping
- Database Operations

**Abstract Methods (ต้อง implement):**

```csharp
protected abstract TResponse MapToResponse(T entity);
protected abstract TSummaryResponse MapToSummaryResponse(T entity);
protected abstract T MapToEntity(TCreateRequest request);
protected abstract void UpdateEntity(T entity, TUpdateRequest request);
```

**Virtual Methods (Override ได้):**

```csharp
protected virtual async Task<ValidationResult> ValidateBeforeCreateAsync()
protected virtual async Task<ValidationResult> ValidateBeforeUpdateAsync()
protected virtual async Task ValidateBeforeDeleteAsync()
protected virtual object MapToDataGridResponse(T entity)
```

### **🗄️ Repository<T>**

**หน้าที่:**

- Database CRUD Operations
- Query Building
- Connection Management

**Standard Methods:**

```csharp
Task<T?> GetByIdAsync(string id)
Task<List<T>> GetAllAsync()
Task<List<T>> FindAllAsync(Expression<Func<T, bool>> predicate)
Task<T?> FindFirstAsync(Expression<Func<T, bool>> predicate)
Task<T> CreateAsync(T entity)
Task<T> UpdateAsync(T entity)
Task DeleteAsync(string id)
```

---

## 📊 **Data Flow**

### **🔄 Create Operation Flow**

```
1. HTTP POST Request
   ↓
2. Controller.Create(CreateRequest)
   ↓
3. BaseController.Create<TCreateRequest>
   ↓
4. Service.CreateAsync(CreateRequest)
   ↓
5. BaseService.CreateAsync<TCreateRequest>
   ├── ValidateBeforeCreateAsync() → Validation
   ├── MapToEntity() → Entity Creation
   └── Repository.CreateAsync() → Database Insert
   ↓
6. MapToResponse() → Response DTO
   ↓
7. HTTP Response (201 Created)
```

### **🔍 Get DataGrid Flow**

```
1. HTTP POST /datagrid Request
   ↓
2. Controller.GetDataGrid(DataGridRequest)
   ↓
3. BaseController.GetDataGrid<TDataGridRequest>
   ↓
4. Service.GetDataGridAsync(DataGridRequest)
   ↓
5. BaseService.GetDataGridAsync<TDataGridRequest>
   ├── Build Query with Filters
   ├── Apply Sorting
   ├── Apply Pagination
   └── Execute with SqlDataReader (Performance)
   ↓
6. MapToDataGridResponse() → DataGrid Response
   ↓
7. HTTP Response with Pagination Metadata
```

---

## 🚀 **Performance Optimizations**

### **1. SqlDataReader vs Entity Framework**

```csharp
// High Performance - ใช้ SqlDataReader
protected virtual async Task<DataGridResponse<TResponse>> GetDataGridAsync(TDataGridRequest request)
{
    using var connection = new SqlConnection(_connectionString);
    using var command = new SqlCommand(sql, connection);
    using var reader = await command.ExecuteReaderAsync();

    // Direct data reading - เร็วกว่า EF
    while (await reader.ReadAsync())
    {
        var response = MapFromDataReader(reader);
        rows.Add(response);
    }
}
```

### **2. Stored Procedure Fallback**

```csharp
// ถ้ามี Stored Procedure จะใช้แทน
var storedProcName = $"sp_Get{typeof(T).Name}ListForDataGrid";
if (await StoredProcedureExistsAsync(storedProcName))
{
    return await ExecuteStoredProcedureAsync(storedProcName, request);
}
```

### **3. Server-side Processing**

```csharp
// DataGrid processing ฝั่ง Server
├── Filtering: WHERE clauses
├── Sorting: ORDER BY clauses
├── Pagination: OFFSET/FETCH
└── Count: Total records
```

---

## 🏗️ **Dependency Injection Container**

### **Service Registration Pattern**

```csharp
// Program.cs
// Generic Repository
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

// Entity-specific Services
builder.Services.AddScoped<ICustomerService, CustomerService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<ITimeEntryService, TimeEntryService>();
```

### **Service Lifetimes**

- **Scoped** - Entity Services (per HTTP request)
- **Transient** - Utilities, Helpers
- **Singleton** - Configuration, Cache

---

## 🎨 **Model Design Patterns**

### **📝 Request/Response Pattern**

```
Request Models:
├── BaseRequest
├── CreateXxxRequest : BaseRequest
└── UpdateXxxRequest : BaseUpdateRequest

Response Models:
├── BaseResponse
├── XxxResponse : BaseResponse
├── XxxSummaryResponse (for lists)
└── XxxDetailResponse : XxxResponse (with navigation)
```

### **🗂️ Entity Design Pattern**

```csharp
[Table("table_name")]
public class Entity : BaseEntity
{
    // Business Properties
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    // Navigation Properties
    [ForeignKey("ForeignKeyId")]
    public virtual RelatedEntity RelatedEntity { get; set; } = null!;

    public virtual ICollection<ChildEntity> Children { get; set; } = new List<ChildEntity>();
}
```

---

## 🛡️ **Error Handling Strategy**

### **Layered Error Handling**

```
1. Controller Level:
   ├── HTTP Status Codes
   ├── ApiResponse<T> wrapper
   └── Exception to HTTP mapping

2. Service Level:
   ├── Business Logic Validation
   ├── Custom Business Exceptions
   └── Transaction Management

3. Repository Level:
   ├── Database Connection Errors
   ├── Query Execution Errors
   └── Data Constraint Violations
```

### **Consistent Error Response**

```csharp
public class ApiResponse<T>
{
    public T? Data { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? Metadata { get; set; }
}
```

---

## 📈 **Scalability Considerations**

### **Horizontal Scaling**

- **Stateless Services** - No server-side session state
- **Database Connection Pooling** - Efficient connection management
- **Async/Await Pattern** - Non-blocking operations

### **Vertical Scaling**

- **SqlDataReader** - Memory efficient data reading
- **Lazy Loading** - Load data on demand
- **Pagination** - Limit data transfer

### **Code Scalability**

- **Generic Base Classes** - Add new entities easily
- **Interface Segregation** - Small, focused interfaces
- **Open/Closed Principle** - Extend without modifying

---

## 🧪 **Testing Strategy**

### **Unit Testing**

```
Services/
├── CustomerServiceTests.cs
├── ProjectServiceTests.cs
└── TimeEntryServiceTests.cs

Base/
├── BaseServiceTests.cs
└── BaseControllerTests.cs
```

### **Integration Testing**

```
Controllers/
├── CustomersControllerTests.cs
├── ProjectsControllerTests.cs
└── TimeEntriesControllerTests.cs
```

---

## 🎓 **Best Practices Summary**

### ✅ **DO**

- ใช้ Base Classes สำหรับ common functionality
- ใช้ Generic Types เพื่อ code reuse
- แยก Business Logic ออกจาก Controllers
- ใช้ Repository Pattern สำหรับ Data Access
- Validate ข้อมูลใน Service Layer
- ใช้ Async/Await patterns
- จัดการ Error อย่างสม่ำเสมอ

### ❌ **DON'T**

- ใส่ Business Logic ใน Controllers
- เขียน SQL queries ใน Controllers
- ใช้ Entity Models เป็น API Response
- Hardcode connection strings
- ละเลย error handling
- ทำ synchronous calls ใน async methods

---

**Architecture นี้ช่วยให้:**

- **พัฒนาเร็ว** - Generic pattern ลดเวลาเขียนโค้ด
- **Maintain ง่าย** - Central logic ใน Base classes
- **ขยายตัวได้** - เพิ่ม Entity ใหม่ได้ง่าย
- **ประสิทธิภาพดี** - SqlDataReader และ optimizations
- **ทดสอบได้** - Clear separation of concerns
