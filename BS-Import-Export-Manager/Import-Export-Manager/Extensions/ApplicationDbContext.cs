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
                entity.ToTable("t_mas_import_master", "imp");
                entity.HasKey(e => e.ImportId);
                entity.Property(e => e.ImportId).HasColumnName("import_id");
                entity.Property(e => e.ImportName).HasColumnName("import_name").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(200);
                entity.Property(e => e.ExecSqlCommand).HasColumnName("exec_sql_command").HasColumnType("NVARCHAR(MAX)");
                entity.Property(e => e.ExcelExampleFilePath).HasColumnName("excel_example_file_path").HasMaxLength(500);
                entity.Property(e => e.Seq).HasColumnName("seq").IsRequired();
                entity.Property(e => e.IsActive).HasColumnName("is_active").HasMaxLength(3).IsRequired().HasDefaultValue("YES");
                entity.Property(e => e.ConfirmMessage).HasColumnName("confirm_message").HasColumnType("NVARCHAR(MAX)");
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
            var in_vchConfirmMessage = new SqlParameter("@in_vchConfirmMessage", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message ?? DBNull.Value
            };
            var in_vchCreateBy = new SqlParameter("@in_vchCreateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.create_by
            };
            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_insert_import_master " +
                $"@in_vchImportName, @in_vchDescription, @in_vchExecSqlCommand, @in_vchExcelExampleFilePath, @in_intSeq, @in_vchIsActive, @in_vchConfirmMessage, @in_vchCreateBy, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_vchImportName, in_vchDescription, in_vchExecSqlCommand, in_vchExcelExampleFilePath, in_intSeq, in_vchIsActive, in_vchConfirmMessage, in_vchCreateBy, errorCodeParam, errorMessageParam);
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
            var in_vchConfirmMessage = new SqlParameter("@in_vchConfirmMessage", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message ?? DBNull.Value
            };
            var in_vchUpdateBy = new SqlParameter("@in_vchUpdateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.update_by
            };
            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_update_import_master " +
                $"@in_intImportId, @in_vchImportName, @in_vchDescription, @in_vchExecSqlCommand, @in_vchExcelExampleFilePath, @in_intSeq, @in_vchIsActive, @in_vchConfirmMessage, @in_vchUpdateBy, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intImportId, in_vchImportName, in_vchDescription, in_vchExecSqlCommand, in_vchExcelExampleFilePath, in_intSeq, in_vchIsActive, in_vchConfirmMessage, in_vchUpdateBy, errorCodeParam, errorMessageParam);

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
                $"EXEC imp.usp_delete_import_master " +
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
                confirm_message = im.ConfirmMessage,
                create_by = im.CreateBy,
                created_date = im.CreatedDate,
                update_by = im.UpdateBy,
                update_date = im.UpdateDate
            }).ToList();
        }
        public async Task<ExcelImportResponse> ExcelImportXMLData(ExcelImportRequest request)
        {
            try
            {
                var entity = await this.TImportMasters
                    .FirstOrDefaultAsync(x => x.ImportId == request.import_id);

                if (entity == null)
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "Import configuration not found.",
                        data = null
                    };
                }

                var execSqlCommand = entity?.ExecSqlCommand;
                if (string.IsNullOrEmpty(execSqlCommand))
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "Import configuration not found.",
                        data = null
                    };
                }

                var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                {
                    Direction = ParameterDirection.Output
                };
                var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                {
                    Direction = ParameterDirection.Output
                };
                var errorRecordParam = new SqlParameter("@out_vchErrorRecord", SqlDbType.NVarChar, 100)
                {
                    Direction = ParameterDirection.Output
                };
                var in_vchUserId = new SqlParameter("@in_vchUserId", SqlDbType.NVarChar, 40)
                {
                    Direction = ParameterDirection.Input,
                    Value = request.user_id
                };
                var in_XMLData = new SqlParameter("@in_XMLData", SqlDbType.NVarChar, -1)
                {
                    Direction = ParameterDirection.Input,
                    Value = (object?)request.xml_import_data ?? DBNull.Value
                };

                var errors = new List<ExcelImportListResponse>();


                using (var conn = Database.GetDbConnection())
                {
                    await conn.OpenAsync();

                    using (var command = conn.CreateCommand())
                    {
                        command.CommandText = execSqlCommand;
                        command.CommandType = System.Data.CommandType.StoredProcedure;

                        command.Parameters.Add(in_vchUserId);
                        command.Parameters.Add(in_XMLData);
                        command.Parameters.Add(errorCodeParam);
                        command.Parameters.Add(errorMessageParam);
                        command.Parameters.Add(errorRecordParam);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            // Result set แรก (ถ้ามี) ข้ามได้
                            if (await reader.ReadAsync()) { }

                            // Result set ที่สอง: #TempImportResult
                            if (await reader.NextResultAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    errors.Add(new ExcelImportListResponse
                                    {
                                        code = reader["ErrorCode"]?.ToString(),
                                        message = reader["ErrorMessage"]?.ToString(),
                                        records = reader["ErrorRecord"]?.ToString()
                                    });
                                }
                            }
                        }
                    }
                }

                return new ExcelImportResponse
                {
                    code = errorCodeParam.Value?.ToString() ?? "0",
                    message = errorMessageParam.Value?.ToString() ?? "Import completed",
                    data = errors,
                    total = errors.Count
                };
            }
            catch (Exception ex)
            {
                return new ExcelImportResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }

    }
}
