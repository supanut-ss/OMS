# 📚 คู่มือการพัฒนา API - เพิ่ม Controller ใหม่

## 🏗️ โครงสร้างไฟล์โปรเจกต์

```
ReactAPITRAINING/
├── 📁 Controllers/           # API Controllers
│   ├── 📁 Base/
│   │   └── BaseController.cs     # Generic CRUD Controller
│   ├── AuthController.cs         # Authentication API
│   ├── CustomersController.cs    # Customer CRUD API
│   ├── ProjectsController.cs     # Project CRUD API
│   └── TimeEntriesController.cs  # TimeEntry CRUD API
│
├── 📁 Models/               # Data Models
│   ├── 📁 Base/
│   │   ├── BaseModels.cs         # Base Entity/Request/Response
│   │   └── DataGridModels.cs     # DataGrid Request/Response
│   ├── 📁 Customer/
│   │   └── CustomerModels.cs     # Customer Entity + DTOs
│   ├── 📁 Project/
│   │   └── ProjectModels.cs      # Project Entity + DTOs
│   └── 📁 TimeEntry/
│       └── TimeEntryModels.cs    # TimeEntry Entity + DTOs
│
├── 📁 Services/             # Business Logic
│   ├── 📁 Implementation/
│   │   ├── 📁 Base/
│   │   │   └── BaseService.cs    # Generic CRUD Service
│   │   ├── AuthService.cs        # Authentication Logic
│   │   ├── CustomerService.cs    # Customer Business Logic
│   │   ├── ProjectService.cs     # Project Business Logic
│   │   └── TimeEntryService.cs   # TimeEntry Business Logic
│   └── 📁 Interfaces/
│       └── IServices.cs          # Service Interfaces
│
├── 📁 Data/                 # Database Layer
│   ├── 📁 Repositories/
│   │   ├── IRepository.cs        # Generic Repository Interface
│   │   └── Repository.cs         # Generic Repository Implementation
│   └── ApplicationDbContext.cs   # Entity Framework DbContext
│
└── Program.cs               # Application Startup & DI Configuration
```

---

## 🚀 วิธีการเพิ่ม Controller ใหม่

### 📋 **ขั้นตอนที่ 1: สร้าง Models**

สร้างโฟลเดอร์และไฟล์ใหม่ในโฟลเดอร์ `Models/`

```
📁 Models/
└── 📁 [EntityName]/
    └── [EntityName]Models.cs
```

**ตัวอย่าง: สร้าง Category Entity**

```csharp
// Models/Category/CategoryModels.cs
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ReactAPITRAINING.Models.Base;

namespace ReactAPITRAINING.Models.Category
{
    // 1. Entity Model
    [Table("categories")]
    public class Category : BaseEntity
    {
        [Required, MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "ACTIVE";
    }

    // 2. Request Models
    public class CreateCategoryRequest : BaseRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateCategoryRequest : BaseUpdateRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = "ACTIVE";
    }

    // 3. Response Models
    public class CategoryResponse : BaseResponse
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CategorySummaryResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    // 4. DataGrid Models
    public class CategoryDataGridRequest : DataGridRequest
    {
        // ใช้ standard MUI X DataGrid properties
    }
}
```

### 📋 **ขั้นตอนที่ 2: เพิ่ม DbSet ใน ApplicationDbContext**

```csharp
// Data/ApplicationDbContext.cs
public class ApplicationDbContext : DbContext
{
    // เพิ่มบรรทัดนี้
    public DbSet<Category> Categories { get; set; }

    // ... DbSets อื่นๆ
}
```

### 📋 **ขั้นตอนที่ 3: สร้าง Service Interface**

```csharp
// Services/Interfaces/IServices.cs
// เพิ่มบรรทัดนี้
public interface ICategoryService : IBaseService<Category, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest, CategorySummaryResponse, CategoryDataGridRequest>
{
    // เพิ่ม custom methods ถ้าจำเป็น
    Task<List<CategoryResponse>> GetActiveCategoriesAsync();
}
```

### 📋 **ขั้นตอนที่ 4: สร้าง Service Implementation**

```csharp
// Services/Implementation/CategoryService.cs
using ReactAPITRAINING.Data;
using ReactAPITRAINING.Data.Repositories;
using ReactAPITRAINING.Models.Category;
using ReactAPITRAINING.Services.Interfaces;
using ReactAPITRAINING.Services.Implementation.Base;

namespace ReactAPITRAINING.Services.Implementation
{
    public class CategoryService : BaseService<Category, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest, CategorySummaryResponse, CategoryDataGridRequest>, ICategoryService
    {
        public CategoryService(IRepository<Category> repository, ApplicationDbContext context)
            : base(repository, context)
        {
        }

        // 1. Override Mapping Methods
        protected override CategoryResponse MapToResponse(Category entity)
        {
            return new CategoryResponse
            {
                Id = entity.Id,
                Name = entity.Name,
                Description = entity.Description,
                Status = entity.Status,
                CreateBy = entity.CreateBy,
                CreateDate = entity.CreateDate,
                UpdateBy = entity.UpdateBy,
                UpdateDate = entity.UpdateDate
            };
        }

        protected override CategorySummaryResponse MapToSummaryResponse(Category entity)
        {
            return new CategorySummaryResponse
            {
                Id = entity.Id,
                Name = entity.Name,
                Status = entity.Status
            };
        }

        protected override Category MapToEntity(CreateCategoryRequest request)
        {
            return new Category
            {
                Id = Guid.NewGuid().ToString(),
                Name = request.Name,
                Description = request.Description,
                Status = "ACTIVE",
                CreateBy = request.CreateBy,
                CreateDate = DateTime.UtcNow
            };
        }

        protected override void UpdateEntity(Category entity, UpdateCategoryRequest request)
        {
            entity.Name = request.Name;
            entity.Description = request.Description;
            entity.Status = request.Status;
            entity.UpdateBy = request.UpdateBy;
            entity.UpdateDate = DateTime.UtcNow;
        }

        // 2. Custom Business Logic
        public async Task<List<CategoryResponse>> GetActiveCategoriesAsync()
        {
            var categories = await _repository.FindAllAsync(c => c.Status == "ACTIVE");
            return categories.Select(MapToResponse).ToList();
        }
    }
}
```

### 📋 **ขั้นตอนที่ 5: สร้าง Controller**

```csharp
// Controllers/CategoriesController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReactAPITRAINING.Controllers.Base;
using ReactAPITRAINING.Models.Category;
using ReactAPITRAINING.Models.Base;
using ReactAPITRAINING.Services.Interfaces;
using Swashbuckle.AspNetCore.Annotations;
using System.Net;

namespace ReactAPITRAINING.Controllers
{
    /// <summary>
    /// Category management endpoints
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Tags("5. Categories")]
    [Authorize]
    [AllowAnonymous] // For testing purposes
    public class CategoriesController : BaseController<Category, CategoryResponse, CreateCategoryRequest, UpdateCategoryRequest, CategorySummaryResponse, CategoryDataGridRequest>
    {
        private readonly ICategoryService _categoryService;

        public CategoriesController(ICategoryService categoryService) : base(categoryService)
        {
            _categoryService = categoryService;
        }

        // Custom Endpoints (นอกเหนือจาก CRUD standard)

        /// <summary>
        /// Get all active categories
        /// </summary>
        [HttpGet("active")]
        [SwaggerOperation(Summary = "Get all active categories")]
        [SwaggerResponse((int)HttpStatusCode.OK, "Categories retrieved successfully", typeof(ApiResponse<List<CategoryResponse>>))]
        public async Task<ActionResult<ApiResponse<List<CategoryResponse>>>> GetActiveCategories()
        {
            try
            {
                var categories = await _categoryService.GetActiveCategoriesAsync();
                return Ok(new ApiResponse<List<CategoryResponse>>
                {
                    Data = categories,
                    Success = true,
                    Message = "Active categories retrieved successfully"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponse<List<CategoryResponse>>
                {
                    Success = false,
                    Message = $"Error retrieving active categories: {ex.Message}"
                });
            }
        }
    }
}
```

### 📋 **ขั้นตอนที่ 6: Register Service ใน Program.cs**

```csharp
// Program.cs
// เพิ่มในส่วน Add Services
builder.Services.AddScoped<ICategoryService, CategoryService>();
```

### 📋 **ขั้นตอนที่ 7: สร้าง Migration (ถ้าจำเป็น)**

```bash
# ใน Terminal
dotnet ef migrations add Add_Category_Table
dotnet ef database update
```

---

## ✅ **Checklist: การเพิ่ม Controller ใหม่**

### **ไฟล์ที่ต้องสร้าง/แก้ไข:**

- [ ] **`Models/[Entity]/[Entity]Models.cs`** - Entity + Request/Response DTOs
- [ ] **`Services/Interfaces/IServices.cs`** - เพิ่ม Interface
- [ ] **`Services/Implementation/[Entity]Service.cs`** - Business Logic
- [ ] **`Controllers/[Entity]Controller.cs`** - API Endpoints
- [ ] **`Data/ApplicationDbContext.cs`** - เพิ่ม DbSet
- [ ] **`Program.cs`** - Register Service ใน DI

### **การทดสอบ:**

- [ ] **Build ผ่าน** - `dotnet build`
- [ ] **Migration** - `dotnet ef migrations add` (ถ้าจำเป็น)
- [ ] **Run API** - `dotnet run`
- [ ] **Swagger Documentation** - ตรวจสอบ endpoints ใหม่
- [ ] **API Testing** - ทดสอบ CRUD operations

---

## 🎯 **API Endpoints ที่จะได้รับ (Auto-generated)**

เมื่อสร้าง Controller ใหม่แล้ว จะได้ API endpoints เหล่านี้โดยอัตโนมัติ:

### **Standard CRUD Operations:**

```
GET    /api/Categories/summary          # Get all records (summary)
POST   /api/Categories/datagrid         # Get paginated data for DataGrid
GET    /api/Categories/{id}             # Get single record by ID
POST   /api/Categories                  # Create new record
PUT    /api/Categories/{id}             # Update existing record
DELETE /api/Categories/{id}             # Delete record
```

### **Custom Endpoints:**

```
GET    /api/Categories/active           # Custom endpoint ที่เพิ่มเข้าไป
```

---

## 🔧 **Advanced: การ Customize เพิ่มเติม**

### **1. เพิ่ม Custom DataGrid Response**

```csharp
// Override DataGrid mapping
protected override object MapToDataGridResponse(Category entity)
{
    return new
    {
        id = entity.Id,
        name = entity.Name,
        description = entity.Description ?? "",
        status = entity.Status,
        createDate = entity.CreateDate.ToString("yyyy-MM-dd"),
        isActive = entity.Status == "ACTIVE"
    };
}
```

### **2. เพิ่ม Custom Validation**

```csharp
// Override validation
protected override async Task<ValidationResult> ValidateBeforeCreateAsync(CreateCategoryRequest request)
{
    // ตรวจสอบชื่อซ้ำ
    var existing = await _repository.FindFirstAsync(c => c.Name == request.Name);
    if (existing != null)
    {
        return new ValidationResult { IsValid = false, ErrorMessage = "Category name already exists" };
    }
    return new ValidationResult { IsValid = true };
}
```

### **3. เพิ่ม Navigation Properties**

```csharp
// ในกรณีที่มีความสัมพันธ์กับ Entity อื่น
public class Category : BaseEntity
{
    // ... properties อื่น

    // Navigation Properties
    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
}
```

---

## 📝 **สรุป**

หลังจากทำตามขั้นตอนทั้ง 7 ขั้นตอนแล้ว คุณจะได้:

✅ **API Controller ใหม่** พร้อม CRUD operations ครบชุด  
✅ **Swagger Documentation** สำหรับ API ใหม่  
✅ **DataGrid Support** สำหรับ Frontend  
✅ **Business Logic Layer** ที่แยกออกจาก Controller  
✅ **Database Integration** ผ่าน Entity Framework  
✅ **Dependency Injection** ที่ configured แล้ว

**ข้อดี:**

- **ใช้เวลาน้อย** - สร้าง API ใหม่ได้เร็ว
- **Consistent** - ทุก API มี pattern เดียวกัน
- **Maintainable** - แก้ไขที่ Base แล้วส่งผลทุก API
- **Scalable** - เพิ่ม Entity ใหม่ได้ง่าย

**Framework นี้ช่วยให้การพัฒนา API ใหม่เป็นเรื่องง่าย และ maintain ได้ในระยะยาว! 🚀**
