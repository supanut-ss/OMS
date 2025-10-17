using Azure.Core;
using DocumentFormat.OpenXml.InkML;
using Import_Export_Manager.Models.Data;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Import_Export_Manager.Extensions
{
    public class ApplicationDbContext : IdentityDbContext<IdentityUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        public virtual DbSet<TImportMaster> TImportMasters { get; set; }
        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.UseCollation("Thai_CI_AS");
            builder.Entity<TImportMaster>(entity =>
            {
                entity.ToTable("v_import_masters", "tmt");
                entity.HasKey(e => e.ImportId);
                entity.Property(e => e.ImportId).HasColumnName("import_id");
                entity.Property(e => e.ImportName).HasColumnName("import_name").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(200);
                entity.Property(e => e.ExecSqlCommand).HasColumnName("exec_sql_command").HasColumnType("NVARCHAR(MAX)");
                entity.Property(e => e.ExcelExampleFilePath).HasColumnName("excel_example_file_path").HasMaxLength(500);
                entity.Property(e => e.Seq).HasColumnName("seq").IsRequired();
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasMaxLength(3).IsRequired().HasDefaultValue("YES");
                entity.Property(e => e.CreateBy).HasColumnName("create_by").IsRequired().HasMaxLength(40);
                entity.Property(e => e.CreatedDate).HasColumnName("create_date").IsRequired();
                entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(40);
                entity.Property(e => e.UpdateDate).HasColumnName("update_date");
            });
            base.OnModelCreating(builder);
        }
        public async Task<ImportMasterResponse> InsertImportMaster(ImportMasterRequest request)
        {
            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 10)
            {
                Direction = ParameterDirection.Output
            };
            var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Output
            };
            var in_vchImportName = new SqlParameter("@in_vchImportName", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_name
            };
            var in_vchDescription = new SqlParameter("@in_vchDescription", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.description ?? DBNull.Value
            };
            var in_vchExecSqlCommand = new SqlParameter("@in_vchExecSqlCommand", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.exec_sql_command ?? DBNull.Value
            };
            var in_vchExcelExampleFilePath = new SqlParameter("@in_vchExcelExampleFilePath", SqlDbType.NVarChar, 500)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.excel_example_file_path ?? DBNull.Value
            };
            var in_intSeq = new SqlParameter("@in_intSeq", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.seq
            };
            var in_vchIsActive = new SqlParameter("@in_vchIsActive", SqlDbType.NVarChar, 3)
            {
                Direction = ParameterDirection.Input,
                Value = request.is_active
            };
            var in_vchCreateBy = new SqlParameter("@in_vchCreateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.create_by
            };
            await Database.ExecuteSqlRawAsync(
                $"EXEC tmt.usp_insert_import_master " +
                $"@in_vchImportName, @in_vchDescription, @in_vchExecSqlCommand, @in_vchExcelExampleFilePath, @in_intSeq, @in_vchIsActive, @in_vchCreateBy, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_vchImportName, in_vchDescription, in_vchExecSqlCommand, in_vchExcelExampleFilePath, in_intSeq, in_vchIsActive, in_vchCreateBy, errorCodeParam, errorMessageParam);
            return new ImportMasterResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                data = null,
                total = 0
            };
        }
        public async Task<ImportMasterResponse> UpdateImportMaster(int importId, ImportMasterRequest request)
        {
            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 10)
            {
                Direction = ParameterDirection.Output
            };
            var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Output
            };
            var in_intImportId = new SqlParameter("@in_intImportId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = importId
            };
            var in_vchImportName = new SqlParameter("@in_vchImportName", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_name
            };
            var in_vchDescription = new SqlParameter("@in_vchDescription", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.description ?? DBNull.Value
            };
            var in_vchExecSqlCommand = new SqlParameter("@in_vchExecSqlCommand", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.exec_sql_command ?? DBNull.Value
            };
            var in_vchExcelExampleFilePath = new SqlParameter("@in_vchExcelExampleFilePath", SqlDbType.NVarChar, 500)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.excel_example_file_path ?? DBNull.Value
            };
            var in_intSeq = new SqlParameter("@in_intSeq", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.seq
            };
            var in_vchIsActive = new SqlParameter("@in_vchIsActive", SqlDbType.NVarChar, 3)
            {
                Direction = ParameterDirection.Input,
                Value = request.is_active
            };
            var in_vchUpdateBy = new SqlParameter("@in_vchUpdateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.update_by
            };
            await Database.ExecuteSqlRawAsync(
                $"EXEC tmt.usp_update_import_master " +
                $"@in_intImportId, @in_vchImportName, @in_vchDescription, @in_vchExecSqlCommand, @in_vchExcelExampleFilePath, @in_intSeq, @in_vchIsActive, @in_vchUpdateBy, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intImportId, in_vchImportName, in_vchDescription, in_vchExecSqlCommand, in_vchExcelExampleFilePath, in_intSeq, in_vchIsActive, in_vchUpdateBy, errorCodeParam, errorMessageParam);

            return new ImportMasterResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                data = null,
                total = 0
            };
        }
        public async Task<ImportMasterResponse> DeleteImportMaster(int importId)
        {
            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 10)
            {
                Direction = ParameterDirection.Output
            };
            var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Output
            };
            var in_intImportId = new SqlParameter("@in_intImportId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = importId
            };
            await Database.ExecuteSqlRawAsync(
                $"EXEC tmt.usp_delete_import_master " +
                $"@in_intImportId, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intImportId, errorCodeParam, errorMessageParam);
            return new ImportMasterResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                data = null,
                total = 0
            };
        }
        public async Task<List<ImportMasterListResponse>> GetAllImportMasters()
        {
            var importMasters = await TImportMasters
                .AsNoTracking()
                .OrderBy(im => im.Seq)
                .ToListAsync();
            return importMasters.Select(im => new ImportMasterListResponse
            {
                import_id = im.ImportId,
                import_name = im.ImportName,
                description = im.Description,
                exec_sql_command = im.ExecSqlCommand,
                excel_example_file_path = im.ExcelExampleFilePath,
                seq = im.Seq,
                is_active = im.IsActive,
                create_by = im.CreateBy,
                created_date = im.CreatedDate,
                update_by = im.UpdateBy,
                update_date = im.UpdateDate
            }).ToList();
        }
        public async Task<ExcelImportResponse> ExcelImportXMLData(ExcelImportRequest request)
        {
            var entity = await TImportMasters
                .FirstOrDefaultAsync(x => x.ImportId == request.import_id);

            var execSqlCommand = entity?.ExecSqlCommand;
            if (string.IsNullOrEmpty(execSqlCommand))
            {
                return new ExcelImportResponse
                {
                    code = "1",
                    message = "Import configuration not found.",
                };
            }
            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 10)
            {
                Direction = ParameterDirection.Output
            };
            var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Output
            };
            var errorRecordParam = new SqlParameter("@out_intErrorRecord", SqlDbType.Int)
            {
                Direction = ParameterDirection.Output
            };
            var in_vchUserId = new SqlParameter("@in_vchUserId", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.user_id
            };
            var in_vchDevice = new SqlParameter("@in_vchDevice", SqlDbType.NVarChar, 50)
            {
                Direction = ParameterDirection.Input,
                Value = request.device
            };
            var in_XMLData = new SqlParameter("@in_XMLData", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.xml_import_data ?? DBNull.Value
            };
            await Database.ExecuteSqlRawAsync(
                $"EXEC {execSqlCommand} " +
                $"@in_vchUserId, @in_vchDevice, @in_XMLData, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT, @out_intErrorRecord OUTPUT",
                in_vchUserId, in_vchDevice, in_XMLData, errorCodeParam, errorMessageParam, errorRecordParam);
            return new ExcelImportResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                records = errorRecordParam.Value != DBNull.Value
                    ? (int)errorRecordParam.Value
                    : 0
            };
        }
    }
}
