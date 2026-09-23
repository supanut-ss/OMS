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
using System.Globalization;

namespace Import_Export_Manager.Extensions
{
    public class ApplicationDbContext : IdentityDbContext<IdentityUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        public virtual DbSet<TImportMaster> TImportMasters { get; set; }
        public virtual DbSet<TImportColumnMapping> TImportColumnMappings { get; set; }
        public virtual DbSet<TImportUploadHistory> TImportUploadHistories { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            builder.UseCollation("Thai_100_CI_AS");
            builder.Entity<TImportMaster>(entity =>
            {
                entity.ToTable("t_mas_import_master", "imp");
                entity.HasKey(e => e.ImportId);
                entity.Property(e => e.ImportId).HasColumnName("import_id");
                entity.Property(e => e.ImportName).HasColumnName("import_name").HasMaxLength(200).IsRequired();
                entity.Property(e => e.Description).HasColumnName("description").HasMaxLength(255);
                entity.Property(e => e.ExecSqlCommand).HasColumnName("exec_sql_command").HasColumnType("NVARCHAR(MAX)").IsRequired();
                entity.Property(e => e.Seq).HasColumnName("seq").IsRequired();
                entity.Property(e => e.IsActive)
                    .HasColumnName("is_active")
                    .IsRequired()
                    .HasDefaultValue(true);
                entity.Property(e => e.ConfirmMessageTh).HasColumnName("confirm_message_th").HasColumnType("NVARCHAR(MAX)");
                entity.Property(e => e.ConfirmMessageEn).HasColumnName("confirm_message_en").HasColumnType("NVARCHAR(MAX)");
                entity.Property(e => e.ConfirmMessageOther).HasColumnName("confirm_message_other").HasColumnType("NVARCHAR(MAX)");
                entity.Property(e => e.ImportBatchSize).HasColumnName("import_batch_size").IsRequired();
                entity.Property(e => e.ImportStatus).HasColumnName("import_status").HasMaxLength(10).IsRequired();
                entity.Property(e => e.ImportTempTableName).HasColumnName("import_temp_table_name").HasMaxLength(70).IsRequired();
                entity.Property(e => e.CreateBy).HasColumnName("create_by").IsRequired().HasMaxLength(40);
                entity.Property(e => e.CreatedDate).HasColumnName("create_date").IsRequired();
                entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(40);
                entity.Property(e => e.UpdateDate).HasColumnName("update_date");
                entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
            });

            builder.Entity<TImportColumnMapping>(entity =>
            {
                entity.ToTable("t_mas_import_column_mapping", "imp");
                entity.HasKey(e => e.MappingId);
                entity.Property(e => e.MappingId).HasColumnName("mapping_id");
                entity.Property(e => e.ImportId).HasColumnName("import_id").IsRequired();
                entity.Property(e => e.ExcelColumnName).HasColumnName("excel_column_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.DbColumnName).HasColumnName("db_column_name").HasMaxLength(100).IsRequired();
                entity.Property(e => e.DataType).HasColumnName("data_type").HasMaxLength(50).IsRequired();
                entity.Property(e => e.AllowedValues).HasColumnName("allowed_values").HasColumnType("NVARCHAR(MAX)");
                entity.Property(e => e.DataTypeParameter).HasColumnName("datatype_parameter").HasMaxLength(50);
                entity.Property(e => e.FormatPattern).HasColumnName("format_pattern").HasMaxLength(100);
                entity.Property(e => e.IsRequired)
                   .HasColumnName("is_required")
                   .IsRequired()
                   .HasDefaultValue(true);
                entity.Property(e => e.ColumnOrder).HasColumnName("column_order").IsRequired();
                entity.Property(e => e.DefaultValue).HasColumnName("default_value").HasMaxLength(250);
                entity.Property(e => e.CreateBy).HasColumnName("create_by").IsRequired().HasMaxLength(40);
                entity.Property(e => e.CreatedDate).HasColumnName("create_date").IsRequired();
                entity.Property(e => e.UpdateBy).HasColumnName("update_by").HasMaxLength(40);
                entity.Property(e => e.UpdateDate).HasColumnName("update_date");
                entity.Property(e => e.RowVersion).HasColumnName("rowversion").IsRowVersion();
            });

            builder.Entity<TImportUploadHistory>(entity =>
            {
                entity.ToTable("t_log_import_upload", "imp");
                entity.HasKey(e => e.ImportHistoryId)
                    .HasName("PK_t_log_import_upload");
                entity.Property(e => e.ImportHistoryId).HasColumnName("import_history_id");
                entity.Property(e => e.ImportId).HasColumnName("import_id").IsRequired();
                entity.Property(e => e.ImportDate).HasColumnName("import_date").HasColumnType("datetime").IsRequired();
                entity.Property(e => e.FileName).HasColumnName("file_name").HasMaxLength(260).IsRequired();
                entity.Property(e => e.TotalRows).HasColumnName("total_rows").IsRequired();
                entity.Property(e => e.SuccessRows).HasColumnName("success_rows").IsRequired();
                entity.Property(e => e.FailedRows).HasColumnName("failed_rows").IsRequired();
                entity.Property(e => e.ImportedBy).HasColumnName("imported_by").HasMaxLength(40).IsRequired();
                entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();

                entity.HasOne<TImportMaster>()
                    .WithMany()
                    .HasForeignKey(e => e.ImportId)
                    .OnDelete(DeleteBehavior.Restrict)
                    .HasConstraintName("FK_t_log_import_upload_t_mas_import_master");
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
            var in_vchDescription = new SqlParameter("@in_vchDescription", SqlDbType.NVarChar, 255)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.description ?? DBNull.Value
            };
            var in_vchExecSqlCommand = new SqlParameter("@in_vchExecSqlCommand", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = request.exec_sql_command
            };
            var in_intSeq = new SqlParameter("@in_intSeq", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.seq
            };
            var in_vchIsActive = new SqlParameter("@in_vchIsActive", SqlDbType.VarChar, 3)
            {
                Direction = ParameterDirection.Input,
                Value = request.is_active
            };
            var in_vchConfirmMessageTh = new SqlParameter("@in_vchConfirmMessageTh", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message_th ?? DBNull.Value
            };
            var in_vchConfirmMessageEn = new SqlParameter("@in_vchConfirmMessageEn", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message_en ?? DBNull.Value
            };
            var in_vchConfirmMessageOther = new SqlParameter("@in_vchConfirmMessageOther", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message_other ?? DBNull.Value
            };
            var in_intImportBatchSize = new SqlParameter("@in_intImportBatchSize", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_batch_size
            };
            var in_vchImportTempTableName = new SqlParameter("@in_vchImportTempTableName", SqlDbType.NVarChar, 70)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_temp_table_name
            };
            var in_vchCreateBy = new SqlParameter("@in_vchCreateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.create_by
            };

            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_insert_import_master " +
                $"@in_vchImportName, @in_vchDescription, @in_vchExecSqlCommand, " +
                $"@in_intSeq, @in_vchIsActive, @in_vchConfirmMessageTh, @in_vchConfirmMessageEn, @in_vchConfirmMessageOther, " +
                $"@in_intImportBatchSize , @in_vchImportTempTableName, @in_vchCreateBy, " +
                $"@out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_vchImportName, in_vchDescription, in_vchExecSqlCommand,
                in_intSeq, in_vchIsActive, in_vchConfirmMessageTh, in_vchConfirmMessageEn, in_vchConfirmMessageOther,
                in_intImportBatchSize, in_vchImportTempTableName, in_vchCreateBy,
                errorCodeParam, errorMessageParam);

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
            var in_vchDescription = new SqlParameter("@in_vchDescription", SqlDbType.NVarChar, 255)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.description ?? DBNull.Value
            };
            var in_vchExecSqlCommand = new SqlParameter("@in_vchExecSqlCommand", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = request.exec_sql_command
            };
            var in_intSeq = new SqlParameter("@in_intSeq", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.seq
            };
            var in_vchIsActive = new SqlParameter("@in_vchIsActive", SqlDbType.VarChar, 3)
            {
                Direction = ParameterDirection.Input,
                Value = request.is_active
            };
            var in_vchConfirmMessageTh = new SqlParameter("@in_vchConfirmMessageTh", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message_th ?? DBNull.Value
            };
            var in_vchConfirmMessageEn = new SqlParameter("@in_vchConfirmMessageEn", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message_en ?? DBNull.Value
            };
            var in_vchConfirmMessageOther = new SqlParameter("@in_vchConfirmMessageOther", SqlDbType.NVarChar, -1)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.confirm_message_other ?? DBNull.Value
            };
            var in_intImportBatchSize = new SqlParameter("@in_intImportBatchSize", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_batch_size
            };
            var in_vchImportTempTableName = new SqlParameter("@in_vchImportTempTableName", SqlDbType.NVarChar, 70)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_temp_table_name
            };
            var in_vchUpdateBy = new SqlParameter("@in_vchUpdateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.update_by
            };

            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_update_import_master " +
                $"@in_intImportId, @in_vchImportName, @in_vchDescription, @in_vchExecSqlCommand, " +
                $"@in_intSeq, @in_vchIsActive, @in_vchConfirmMessageTh, @in_vchConfirmMessageEn, @in_vchConfirmMessageOther, " +
                $"@in_intImportBatchSize, @in_vchImportTempTableName, @in_vchUpdateBy, " +
                $"@out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intImportId, in_vchImportName, in_vchDescription, in_vchExecSqlCommand,
                in_intSeq, in_vchIsActive, in_vchConfirmMessageTh, in_vchConfirmMessageEn, in_vchConfirmMessageOther,
                in_intImportBatchSize, in_vchImportTempTableName, in_vchUpdateBy,
                errorCodeParam, errorMessageParam);

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
                seq = im.Seq,
                is_active = im.IsActive,
                confirm_message_th = im.ConfirmMessageTh,
                confirm_message_en = im.ConfirmMessageEn,
                confirm_message_other = im.ConfirmMessageOther,
                import_batch_size = im.ImportBatchSize,
                import_temp_table_name = im.ImportTempTableName,
                import_status = im.ImportStatus,
                create_by = im.CreateBy,
                created_date = im.CreatedDate,
                update_by = im.UpdateBy,
                update_date = im.UpdateDate
            }).ToList();
        }

        // ============================================
        // Column Mapping Methods
        // ============================================

        public async Task<ImportColumnMappingResponse> InsertImportColumnMapping(ImportColumnMappingRequest request)
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
                Value = request.import_id
            };
            var in_vchExcelColumnName = new SqlParameter("@in_vchExcelColumnName", SqlDbType.NVarChar, 100)
            {
                Direction = ParameterDirection.Input,
                Value = request.excel_column_name
            };
            var in_vchDbColumnName = new SqlParameter("@in_vchDbColumnName", SqlDbType.NVarChar, 100)
            {
                Direction = ParameterDirection.Input,
                Value = request.db_column_name
            };
            var in_vchDataType = new SqlParameter("@in_vchDataType", SqlDbType.NVarChar, 50)
            {
                Direction = ParameterDirection.Input,
                Value = request.data_type
            };
            var in_vchDataTypeParameter = new SqlParameter("@in_vchDataTypeParameter", SqlDbType.NVarChar, 50)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.datatype_parameter ?? DBNull.Value
            };
            var in_vchCreateBy = new SqlParameter("@in_vchCreateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.create_by
            };

            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_insert_import_column_mapping " +
                $"@in_intImportId, @in_vchExcelColumnName, @in_vchDbColumnName, @in_vchDataType, " +
                $"@in_vchDataTypeParameter, @in_vchCreateBy, " +
                $"@out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intImportId, in_vchExcelColumnName, in_vchDbColumnName, in_vchDataType,
                in_vchDataTypeParameter, in_vchCreateBy,
                errorCodeParam, errorMessageParam);

            return new ImportColumnMappingResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                data = null,
                total = 0
            };
        }

        public async Task<ImportColumnMappingResponse> UpdateImportColumnMapping(int mappingId, ImportColumnMappingRequest request)
        {
            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 10)
            {
                Direction = ParameterDirection.Output
            };
            var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Output
            };
            var in_intMappingId = new SqlParameter("@in_intMappingId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = mappingId
            };
            var in_intImportId = new SqlParameter("@in_intImportId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = request.import_id
            };
            var in_vchExcelColumnName = new SqlParameter("@in_vchExcelColumnName", SqlDbType.NVarChar, 100)
            {
                Direction = ParameterDirection.Input,
                Value = request.excel_column_name
            };
            var in_vchDbColumnName = new SqlParameter("@in_vchDbColumnName", SqlDbType.NVarChar, 100)
            {
                Direction = ParameterDirection.Input,
                Value = request.db_column_name
            };
            var in_vchDataType = new SqlParameter("@in_vchDataType", SqlDbType.NVarChar, 50)
            {
                Direction = ParameterDirection.Input,
                Value = request.data_type
            };
            var in_vchDataTypeParameter = new SqlParameter("@in_vchDataTypeParameter", SqlDbType.NVarChar, 50)
            {
                Direction = ParameterDirection.Input,
                Value = (object?)request.datatype_parameter ?? DBNull.Value
            };
            var in_vchUpdateBy = new SqlParameter("@in_vchUpdateBy", SqlDbType.NVarChar, 40)
            {
                Direction = ParameterDirection.Input,
                Value = request.update_by
            };


            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_update_import_column_mapping " +
                $"@in_intMappingId, @in_intImportId, @in_vchExcelColumnName, @in_vchDbColumnName, @in_vchDataType, " +
                $"@in_vchDataTypeParameter, @in_vchUpdateBy, " +
                $"@out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intMappingId, in_intImportId, in_vchExcelColumnName, in_vchDbColumnName, in_vchDataType,
                in_vchDataTypeParameter, in_vchUpdateBy,
                errorCodeParam, errorMessageParam);

            return new ImportColumnMappingResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                data = null,
                total = 0
            };
        }

        public async Task<ImportColumnMappingResponse> DeleteImportColumnMapping(int mappingId)
        {
            var errorCodeParam = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 10)
            {
                Direction = ParameterDirection.Output
            };
            var errorMessageParam = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 200)
            {
                Direction = ParameterDirection.Output
            };
            var in_intMappingId = new SqlParameter("@in_intMappingId", SqlDbType.Int)
            {
                Direction = ParameterDirection.Input,
                Value = mappingId
            };

            await Database.ExecuteSqlRawAsync(
                $"EXEC imp.usp_delete_import_column_mapping " +
                $"@in_intMappingId, @out_vchErrorCode OUTPUT, @out_vchErrorMessage OUTPUT",
                in_intMappingId, errorCodeParam, errorMessageParam);

            return new ImportColumnMappingResponse
            {
                code = errorCodeParam.Value?.ToString(),
                message = errorMessageParam.Value?.ToString(),
                data = null,
                total = 0
            };
        }

        public async Task<List<ImportColumnMappingListResponse>> GetAllImportColumnMappings(int importId)
        {
            var mappings = await TImportColumnMappings
                .AsNoTracking()
                .Where(m => m.ImportId == importId)
                .OrderBy(m => m.ColumnOrder)
                .ThenBy(m => m.MappingId)
                .ToListAsync();

            return mappings.Select(m => new ImportColumnMappingListResponse
            {
                mapping_id = m.MappingId,
                import_id = m.ImportId,
                excel_column_name = NormalizeMappingColumnText(m.ExcelColumnName),
                db_column_name = NormalizeMappingColumnText(m.DbColumnName),
                data_type = m.DataType,
                allowed_values = m.AllowedValues,
                datatype_parameter = m.DataTypeParameter,
                format_pattern = m.FormatPattern,
                is_required = m.IsRequired,
                column_order = m.ColumnOrder,
                default_value = m.DefaultValue,
                create_by = m.CreateBy,
                create_date = m.CreatedDate,
                update_by = m.UpdateBy,
                update_date = m.UpdateDate
            }).ToList();
        }

        private static string NormalizeMappingColumnText(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var normalized = value
                .Replace("\r", " ")
                .Replace("\n", " ")
                .Trim();

            while (normalized.Contains("  "))
            {
                normalized = normalized.Replace("  ", " ");
            }

            return normalized;
        }

        public async Task<ExcelImportResponse> ExcelImportBulkData(ExcelImportRequest request, DataTable excelData)
        {
            try
            {
                // Check if import configuration exists
                var entity = await this.TImportMasters
                    .FirstOrDefaultAsync(x => x.ImportId == request.import_id);

                if (entity == null)
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "Import configuration not found.",
                        total = 0
                    };
                }

                // Check if another import is in progress
                if (entity.ImportStatus == "INPROCESS")
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "Another import is currently in progress. Please try again later.",
                        total = 0
                    };
                }

                var execSqlCommand = entity?.ExecSqlCommand;
                if (string.IsNullOrEmpty(execSqlCommand))
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "Stored procedure not configured.",
                        total = 0
                    };
                }

                var columnMappings = await TImportColumnMappings
                    .Where(x => x.ImportId == request.import_id)
                    .OrderBy(x => x.MappingId)
                    .ToListAsync();

                if (!columnMappings.Any())
                {
                    return new ExcelImportResponse
                    {
                        code = "1",
                        message = "Column mapping configuration not found.",
                        total = 0
                    };
                }

                // Use batch size from master configuration
                var batchSize = entity.ImportBatchSize > 0 ? entity.ImportBatchSize : 5000;

                // Generate unique temp table name (# prefix for local temp table)
                var tempTableName = $"#TempImport_{Guid.NewGuid():N}";

                using (var connection = new SqlConnection(Database.GetConnectionString()))
                {
                    await connection.OpenAsync();
                    using (var transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            // Map Excel data to database columns
                            var mappedDataTable = MapExcelToDbColumns(excelData, columnMappings);

                            // Create temporary table with proper data types
                            await CreateTempTableAsync(connection, transaction, tempTableName, columnMappings);

                            // Bulk copy data to temp table
                            using (var bulkCopy = new SqlBulkCopy(connection, SqlBulkCopyOptions.Default, transaction))
                            {
                                bulkCopy.DestinationTableName = tempTableName;
                                bulkCopy.BatchSize = batchSize;
                                bulkCopy.BulkCopyTimeout = 600;

                                foreach (var mapping in columnMappings)
                                {
                                    bulkCopy.ColumnMappings.Add(mapping.DbColumnName, mapping.DbColumnName);
                                }

                                await bulkCopy.WriteToServerAsync(mappedDataTable);
                            }

                            // Execute stored procedure (SP will handle status update and staging clear)
                            using (var command = connection.CreateCommand())
                            {
                                command.Transaction = transaction;
                                command.CommandText = execSqlCommand;
                                command.CommandType = CommandType.StoredProcedure;
                                command.CommandTimeout = 600;

                                var in_intImportId = new SqlParameter("@in_int_import_id", SqlDbType.Int)
                                {
                                    Direction = ParameterDirection.Input,
                                    Value = request.import_id
                                };
                                var in_vchUserId = new SqlParameter("@in_vch_user_id", SqlDbType.NVarChar, 40)
                                {
                                    Direction = ParameterDirection.Input,
                                    Value = request.user_id
                                };
                                var in_vchTempTableName = new SqlParameter("@in_vch_temp_table_name", SqlDbType.NVarChar, 200)
                                {
                                    Direction = ParameterDirection.Input,
                                    Value = tempTableName
                                };
                                var fileName = Path.GetFileName(request.files?.FirstOrDefault()?.FileName ?? string.Empty);
                                if (fileName.Length > 260)
                                {
                                    fileName = fileName[..260];
                                }
                                var in_vchFileName = new SqlParameter("@in_vch_file_name", SqlDbType.NVarChar, 260)
                                {
                                    Direction = ParameterDirection.Input,
                                    Value = fileName
                                };
                                var in_vchLang = new SqlParameter("@in_vch_lang", SqlDbType.VarChar, 20)
                                {
                                    Direction = ParameterDirection.Input,
                                    Value = string.IsNullOrWhiteSpace(request.lang) ? "EN" : request.lang.Trim().ToUpperInvariant()
                                };
                                var in_vchdevice = new SqlParameter("@in_vch_device", SqlDbType.NVarChar, 50)
                                {
                                    Direction = ParameterDirection.Input,
                                    Value = (object?)request.device ?? DBNull.Value
                                };
                                var errorCodeParam = new SqlParameter("@out_vch_error_code", SqlDbType.NVarChar, 50)
                                {
                                    Direction = ParameterDirection.Output
                                };
                                var errorMessageParam = new SqlParameter("@out_vch_error_message", SqlDbType.NVarChar, 500)
                                {
                                    Direction = ParameterDirection.Output
                                };
                                var errorRecordParam = new SqlParameter("@out_vch_error_record", SqlDbType.NVarChar, 100)
                                {
                                    Direction = ParameterDirection.Output
                                };

                                command.Parameters.Add(in_intImportId);
                                command.Parameters.Add(in_vchUserId);
                                command.Parameters.Add(in_vchTempTableName);
                                command.Parameters.Add(in_vchFileName);
                                command.Parameters.Add(in_vchLang);
                                command.Parameters.Add(in_vchdevice);
                                command.Parameters.Add(errorCodeParam);
                                command.Parameters.Add(errorMessageParam);
                                command.Parameters.Add(errorRecordParam);

                                using (var reader = await command.ExecuteReaderAsync())
                                {
                                    // Read first result set (stored procedure output)
                                    if (await reader.ReadAsync())
                                    {
                                        // Optionally read StoredErrorCode and StoredMessage if needed
                                    }

                                    // Read second result set (error details from #TempImportResult)
                                    if (await reader.NextResultAsync())
                                    {
                                        while (await reader.ReadAsync())
                                        {
                                            // Intentionally ignore detailed error rows to reduce response payload.
                                        }
                                    }
                                }

                                // Get result code from output parameter
                                var resultCode = errorCodeParam.Value?.ToString() ?? "0";

                                // 🔥 Copy data from temp table to staging table (if staging table exists)
                                if (!string.IsNullOrEmpty(entity.ImportTempTableName))
                                {
                                    try
                                    {
                                        var sessionId = Guid.NewGuid();
                                        var importName = entity.ImportName;

                                        // Build column list for INSERT
                                        var dataColumnsList = string.Join(", ", columnMappings.Select(m => $"[{m.DbColumnName}]"));
                                        var selectColumnsList = string.Join(", ", columnMappings.Select(m => $"t.[{m.DbColumnName}]"));

                                        var copyStagingSql = $@"
                                            INSERT INTO {entity.ImportTempTableName} 
                                            (session_id, import_id, import_name, row_number, create_by, imp_status, imp_message, {dataColumnsList})
                                            SELECT 
                                                @sessionId,
                                                @importId,
                                                @importName,
                                                ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) as row_number,
                                                @userId,
                                                CASE 
                                                    WHEN EXISTS (
                                                        SELECT 1 FROM #TempImportResult r 
                                                        WHERE r.ErrorCode != '0'
                                                    ) THEN 'ERROR'
                                                    ELSE 'PENDING'
                                                END,
                                                NULL,
                                                {selectColumnsList}
                                            FROM {tempTableName} t";

                                        using (var stagingCommand = connection.CreateCommand())
                                        {
                                            stagingCommand.Transaction = transaction;
                                            stagingCommand.CommandText = copyStagingSql;
                                            stagingCommand.Parameters.Add(new SqlParameter("@sessionId", sessionId));
                                            stagingCommand.Parameters.Add(new SqlParameter("@importId", request.import_id));
                                            stagingCommand.Parameters.Add(new SqlParameter("@importName", importName));
                                            stagingCommand.Parameters.Add(new SqlParameter("@userId", request.user_id));

                                            await stagingCommand.ExecuteNonQueryAsync();
                                        }
                                    }
                                    catch (Exception stagingEx)
                                    {
                                        // Log but don't fail the import if staging copy fails
                                        System.Diagnostics.Debug.WriteLine($"Failed to copy to staging table: {stagingEx.Message}");
                                    }
                                }

                                // Commit or rollback based on stored procedure result
                                if (resultCode == "0" || resultCode == "-1")
                                {
                                    await transaction.CommitAsync();
                                }
                                else
                                {
                                    await transaction.RollbackAsync();
                                }

                                return new ExcelImportResponse
                                {
                                    code = resultCode,
                                    message = errorMessageParam.Value?.ToString() ?? "Import completed",
                                    total = 0
                                };
                            }
                        }
                        catch (Exception ex)
                        {
                            await transaction.RollbackAsync();

                            return new ExcelImportResponse
                            {
                                code = "1",
                                message = $"Import failed: {ex.Message}",
                                total = 0
                            };
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return new ExcelImportResponse
                {
                    code = "1",
                    message = ex.Message,
                    total = 0
                };
            }
        }

        private DataTable MapExcelToDbColumns(DataTable excelData, List<TImportColumnMapping> columnMappings)
        {
            var mappedTable = new DataTable();

            // Create columns based on mapping configuration
            foreach (var mapping in columnMappings)
            {
                var dataType = mapping.DataType.ToLowerInvariant() switch
                {
                    "int" or "integer" => typeof(int),
                    "bigint" or "long" => typeof(long),
                    "decimal" or "numeric" or "money" => typeof(decimal),
                    "float" or "real" => typeof(double),
                    "bit" or "boolean" => typeof(bool),
                    "datetime" or "datetime2" or "date" => typeof(DateTime),
                    _ => typeof(string)
                };
                mappedTable.Columns.Add(mapping.DbColumnName, dataType);
            }

            // Map each Excel row to database columns
            foreach (DataRow excelRow in excelData.Rows)
            {
                var mappedRow = mappedTable.NewRow();

                foreach (var mapping in columnMappings)
                {
                    // Normalize mapping name (remove \r\n, \n and normalize whitespace)
                    var normalizedMappingName = NormalizeColumnName(mapping.ExcelColumnName);

                    // Find matching Excel column by normalized name
                    var excelColumn = excelData.Columns.Cast<DataColumn>()
                        .FirstOrDefault(c => NormalizeColumnName(c.ColumnName) == normalizedMappingName);

                    if (excelColumn != null)
                    {
                        var cellValue = excelRow[excelColumn];

                        // All fields are required - no validation or default values
                        if (cellValue == null || cellValue == DBNull.Value || string.IsNullOrWhiteSpace(cellValue.ToString()))
                        {
                            mappedRow[mapping.DbColumnName] = DBNull.Value;
                        }
                        else
                        {
                            mappedRow[mapping.DbColumnName] = ConvertValue(cellValue, mapping.DataType, mapping.FormatPattern, mapping.DataTypeParameter);
                        }
                    }
                    else
                    {
                        mappedRow[mapping.DbColumnName] = DBNull.Value;
                    }
                }

                mappedTable.Rows.Add(mappedRow);
            }

            return mappedTable;
        }

        private string NormalizeColumnName(string columnName)
        {
            if (string.IsNullOrEmpty(columnName))
                return string.Empty;

            // Replace line breaks with space, then normalize multiple spaces to single space
            return columnName
                .Replace("\r\n", " ")
                .Replace("\r", " ")
                .Replace("\n", " ")
                .Trim()
                .Replace("  ", " ");
        }

        private object ConvertValue(object rawValue, string dataType, string? formatPattern = null, string? datatypeParameter = null)
        {
            if (rawValue == null || rawValue == DBNull.Value)
                return DBNull.Value;

            var value = rawValue.ToString();
            if (string.IsNullOrWhiteSpace(value))
                return DBNull.Value;

            try
            {
                var normalizedValue = value.Trim();

                return dataType.ToLowerInvariant() switch
                {
                    "int" or "integer" => int.Parse(normalizedValue),
                    "bigint" or "long" => long.Parse(normalizedValue),
                    "decimal" or "numeric" or "money" => decimal.Parse(normalizedValue),
                    "float" or "real" => double.Parse(normalizedValue),
                    "bit" or "boolean" => ParseFlexibleBoolean(normalizedValue),
                    "datetime" or "datetime2" or "date" => ParseDateByPattern(rawValue, normalizedValue, formatPattern, datatypeParameter),
                    _ => normalizedValue
                };
            }
            catch
            {
                string errorMessage = $"Cannot convert value '{value}' to type '{dataType}'";
                if (formatPattern != null)
                {
                    errorMessage += $" with format pattern '{formatPattern}'";
                }
                throw new Exception(errorMessage);
            }
        }

        private static DateTime ParseDateByPattern(object rawValue, string normalizedValue, string? formatPattern, string? datatypeParameter)
        {
            if (rawValue is DateTime datetimeValue)
            {
                return datetimeValue;
            }

            if (rawValue is double oaDate)
            {
                return DateTime.FromOADate(oaDate);
            }

            // Backward compatibility: allow old setups that still store date pattern in datatype_parameter.
            var effectivePattern = string.IsNullOrWhiteSpace(formatPattern)
                ? datatypeParameter
                : formatPattern;

            if (!string.IsNullOrWhiteSpace(effectivePattern))
            {
                var patterns = effectivePattern
                    .Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .Distinct(StringComparer.Ordinal)
                    .ToArray();

                if (patterns.Length > 0)
                {
                    if (DateTime.TryParseExact(normalizedValue, patterns, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedExact))
                    {
                        return parsedExact;
                    }

                    if (DateTime.TryParseExact(normalizedValue, patterns, CultureInfo.CurrentCulture, DateTimeStyles.None, out var parsedExactCurrent))
                    {
                        return parsedExactCurrent;
                    }

                    throw new FormatException($"Date value '{normalizedValue}' does not match format_pattern '{effectivePattern}'");
                }
            }

            return DateTime.Parse(normalizedValue, CultureInfo.CurrentCulture);
        }

        private static bool ParseFlexibleBoolean(string value)
        {
            var normalized = value.Trim().ToLowerInvariant();

            return normalized switch
            {
                "true" or "t" or "1" or "yes" or "y" => true,
                "false" or "f" or "0" or "no" or "n" => false,
                _ => throw new FormatException($"Invalid boolean value '{value}'")
            };
        }

        private async Task CreateTempTableAsync(SqlConnection connection, SqlTransaction transaction, string tableName, List<TImportColumnMapping> columnMappings)
        {
            var columns = string.Join(", ", columnMappings.Select(m =>
            {
                var sqlType = m.DataType.ToUpperInvariant() switch
                {
                    "INT" or "INTEGER" => "INT",
                    "BIGINT" or "LONG" => "BIGINT",
                    "DECIMAL" or "NUMERIC" => string.IsNullOrEmpty(m.DataTypeParameter) ? "DECIMAL(18,5)" : $"DECIMAL({m.DataTypeParameter})",
                    "MONEY" => "MONEY",
                    "FLOAT" or "REAL" => "FLOAT",
                    "BIT" or "BOOLEAN" => "BIT",
                    "DATETIME" or "DATETIME2" => "DATETIME",
                    "DATE" => "DATE",
                    "NVARCHAR" => string.IsNullOrEmpty(m.DataTypeParameter) ? "NVARCHAR(MAX)" : $"NVARCHAR({m.DataTypeParameter})",
                    "VARCHAR" => string.IsNullOrEmpty(m.DataTypeParameter) ? "VARCHAR(MAX)" : $"VARCHAR({m.DataTypeParameter})",
                    "CHAR" => string.IsNullOrEmpty(m.DataTypeParameter) ? "CHAR(10)" : $"CHAR({m.DataTypeParameter})",
                    "NCHAR" => string.IsNullOrEmpty(m.DataTypeParameter) ? "NCHAR(10)" : $"NCHAR({m.DataTypeParameter})",
                    _ => "NVARCHAR(MAX)"
                };
                return $"[{m.DbColumnName}] {sqlType} NULL";
            }));

            var createTableSql = $"CREATE TABLE {tableName} ({columns})";

            using (var command = new SqlCommand(createTableSql, connection, transaction))
            {
                await command.ExecuteNonQueryAsync();
            }
        }

        public async Task<(List<Dictionary<string, object?>>, int)> GetStagingTableData(string tableName, List<TImportColumnMapping> columnMappings)
        {
            var data = new List<Dictionary<string, object?>>();

            try
            {
                // Build column list with fixed columns and mapped columns
                var fixedColumns = @"imp_data_id, session_id, import_id, import_name, row_number, 
                                    create_by, create_date, imp_status, imp_message, processed_date";
                var dataColumns = string.Join(", ", columnMappings.Select(m => $"[{m.DbColumnName}]"));
                var allColumns = string.IsNullOrEmpty(dataColumns) ? fixedColumns : $"{fixedColumns}, {dataColumns}";

                // Build safe SQL query with ORDER BY
                var sql = $@"
                    SELECT {allColumns} 
                    FROM {tableName} 
                    ORDER BY row_number, imp_data_id";

                using (var connection = new SqlConnection(Database.GetConnectionString()))
                {
                    await connection.OpenAsync();

                    using (var command = new SqlCommand(sql, connection))
                    {
                        command.CommandType = CommandType.Text;
                        command.CommandTimeout = 60;

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var row = new Dictionary<string, object?>();

                                for (int i = 0; i < reader.FieldCount; i++)
                                {
                                    var columnName = reader.GetName(i);
                                    var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                                    row[columnName] = value;
                                }

                                data.Add(row);
                            }
                        }
                    }
                }

                return (data, data.Count);
            }
            catch (Exception)
            {
                return (data, 0);
            }
        }

        public async Task<ImportMasterResponse> CreateStagingTable(int importId, string createdBy)
        {
            try
            {
                // Get import master info
                var importMaster = await TImportMasters.FirstOrDefaultAsync(x => x.ImportId == importId);
                if (importMaster == null)
                {
                    return new ImportMasterResponse
                    {
                        code = "1",
                        message = "Import configuration not found",
                        data = null,
                        total = 0
                    };
                }

                // Check if import_temp_table_name is already configured
                if (string.IsNullOrEmpty(importMaster.ImportTempTableName))
                {
                    return new ImportMasterResponse
                    {
                        code = "1",
                        message = "import_temp_table_name is not configured in Import Master. Please set the table name first.",
                        data = null,
                        total = 0
                    };
                }

                // Get column mappings
                var columnMappings = await TImportColumnMappings
                    .Where(x => x.ImportId == importId)
                    .OrderBy(x => x.ColumnOrder)
                    .ToListAsync();

                if (!columnMappings.Any())
                {
                    return new ImportMasterResponse
                    {
                        code = "1",
                        message = "No column mapping found for this import type",
                        data = null,
                        total = 0
                    };
                }

                var stagingTableName = importMaster.ImportTempTableName.Replace("[", "").Replace("]", "");

                // Parse schema and table name
                var parts = stagingTableName.Split('.');
                var schemaName = parts.Length > 1 ? parts[0] : "imp";
                var tableName = parts.Length > 1 ? parts[1] : parts[0];

                // Check if table already exists
                var checkTableSql = @"
                    SELECT COUNT(*) 
                    FROM INFORMATION_SCHEMA.TABLES 
                    WHERE TABLE_SCHEMA = @schema 
                    AND TABLE_NAME = @table";

                int tableExists = 0;
                using (var connection = new SqlConnection(Database.GetConnectionString()))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(checkTableSql, connection))
                    {
                        command.Parameters.Add(new SqlParameter("@schema", schemaName));
                        command.Parameters.Add(new SqlParameter("@table", tableName));

                        var result = await command.ExecuteScalarAsync();
                        tableExists = Convert.ToInt32(result);
                    }
                }

                if (tableExists > 0)
                {
                    return new ImportMasterResponse
                    {
                        code = "1",
                        message = $"Staging table [{schemaName}].[{tableName}] already exists. Please drop it first or use existing table.",
                        data = null,
                        total = 0
                    };
                }

                // Build CREATE TABLE statement with standard import columns
                var columns = new List<string>
                {
                    // Primary key (identity)
                    "[imp_data_id] INT IDENTITY(1,1) NOT NULL",

                    // Session tracking
                    "[session_id] UNIQUEIDENTIFIER NOT NULL",

                    // Import metadata
                    "[import_id] INT NOT NULL",
                    "[import_name] NVARCHAR(200) NOT NULL",

                    // Row tracking
                    "[row_number] INT NOT NULL",

                    // Import status
                    "[imp_status] VARCHAR(10) NOT NULL",
                    "[imp_message] NVARCHAR(MAX) NULL",
                    "[processed_date] DATETIME NULL",

                    // Audit fields
                    "[create_by] NVARCHAR(40) NOT NULL",
                    "[create_date] DATETIME NOT NULL",

                };

                // Add data columns from mapping
                foreach (var mapping in columnMappings)
                {
                    var baseType = mapping.DataType.ToUpperInvariant();
                    var sqlType = baseType switch
                    {
                        "INT" or "INTEGER" => "INT",
                        "BIGINT" or "LONG" => "BIGINT",
                        "DECIMAL" or "NUMERIC" => string.IsNullOrEmpty(mapping.DataTypeParameter) ? "DECIMAL(18,5)" : $"DECIMAL({mapping.DataTypeParameter})",
                        "MONEY" => "MONEY",
                        "FLOAT" or "REAL" => "FLOAT",
                        "BIT" or "BOOLEAN" => "BIT",
                        "DATETIME" or "DATETIME2" => "DATETIME",
                        "DATE" => "DATE",
                        "NVARCHAR" => string.IsNullOrEmpty(mapping.DataTypeParameter) ? "NVARCHAR(MAX)" : $"NVARCHAR({mapping.DataTypeParameter})",
                        "VARCHAR" => string.IsNullOrEmpty(mapping.DataTypeParameter) ? "VARCHAR(MAX)" : $"VARCHAR({mapping.DataTypeParameter})",
                        "CHAR" => string.IsNullOrEmpty(mapping.DataTypeParameter) ? "CHAR(10)" : $"CHAR({mapping.DataTypeParameter})",
                        "NCHAR" => string.IsNullOrEmpty(mapping.DataTypeParameter) ? "NCHAR(10)" : $"NCHAR({mapping.DataTypeParameter})",
                        _ => "NVARCHAR(MAX)"
                    };

                    // --- ส่วนที่เพิ่มเข้ามา ---
                    // ถ้าเป็น Text Type ให้ระบุ Collation
                    string collation = "";
                    if (baseType is "NVARCHAR" or "VARCHAR" or "CHAR" or "NCHAR")
                    {
                        collation = " COLLATE Thai_100_CI_AS";
                    }
                    // -----------------------

                    var nullability = mapping.IsRequired ? "NOT NULL" : "NULL";

                    // ใส่ collation ต่อท้าย sqlType
                    columns.Add($"[{mapping.DbColumnName}] {sqlType}{collation} {nullability}");

                }

                // Build CREATE TABLE SQL with constraints and defaults
                var createTableSql = $@"
                CREATE TABLE [{schemaName}].[{tableName}] (
                    {string.Join(",\n    ", columns)},
                    CONSTRAINT [PK_{tableName}] PRIMARY KEY CLUSTERED ([imp_data_id] ASC)
                    WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, 
                          ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) 
                    ON [PRIMARY]
                ) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY];

                -- Add default constraints
                ALTER TABLE [{schemaName}].[{tableName}] ADD CONSTRAINT [DF_{tableName}_create_date] DEFAULT (GETDATE()) FOR [create_date];
                ALTER TABLE [{schemaName}].[{tableName}] ADD CONSTRAINT [DF_{tableName}_imp_status] DEFAULT ('PENDING') FOR [imp_status];

                -- Add extended properties (descriptions)
                EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'รหัส Import ID จาก Import Master', 
                    @level0type=N'SCHEMA', @level0name=N'{schemaName}', 
                    @level1type=N'TABLE', @level1name=N'{tableName}', 
                    @level2type=N'COLUMN', @level2name=N'import_id';

                EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ชื่อ Function Import จาก Import Master', 
                    @level0type=N'SCHEMA', @level0name=N'{schemaName}', 
                    @level1type=N'TABLE', @level1name=N'{tableName}', 
                    @level2type=N'COLUMN', @level2name=N'import_name';

                EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'User ID สำหรับกำหนดเป็น Batch Import และลบข้อมูลของ User นั้นทุกครั้งเมื่อ Import ใหม่', 
                    @level0type=N'SCHEMA', @level0name=N'{schemaName}', 
                    @level1type=N'TABLE', @level1name=N'{tableName}', 
                    @level2type=N'COLUMN', @level2name=N'create_by';

                EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Date the record was created', 
                    @level0type=N'SCHEMA', @level0name=N'{schemaName}', 
                    @level1type=N'TABLE', @level1name=N'{tableName}', 
                    @level2type=N'COLUMN', @level2name=N'create_date';

                EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'สถานะการ Import [PENDING, COMPLETE, ERROR]', 
                    @level0type=N'SCHEMA', @level0name=N'{schemaName}', 
                    @level1type=N'TABLE', @level1name=N'{tableName}', 
                    @level2type=N'COLUMN', @level2name=N'imp_status';

                EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'ถ้ากรณีรายการมี Error จะใส่ Message เพื่อแสดงข้อความ Error', 
                    @level0type=N'SCHEMA', @level0name=N'{schemaName}', 
                    @level1type=N'TABLE', @level1name=N'{tableName}', 
                    @level2type=N'COLUMN', @level2name=N'imp_message';
                ";

                // Execute CREATE TABLE using SqlConnection with connection string from DbContext
                using (var connection = new SqlConnection(Database.GetConnectionString()))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(createTableSql, connection))
                    {
                        command.CommandTimeout = 120;
                        await command.ExecuteNonQueryAsync();
                    }
                }

                // Update audit fields in import master using raw SQL to avoid EF tracking issues
                await Database.ExecuteSqlRawAsync(
                    "UPDATE imp.t_mas_import_master SET update_by = {0}, update_date = {1} WHERE import_id = {2}",
                    createdBy, DateTime.Now, importId);

                return new ImportMasterResponse
                {
                    code = "0",
                    message = $"Staging table [{schemaName}].[{tableName}] created successfully with {columnMappings.Count} data columns",
                    data = null,
                    total = 0
                };
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
                {
                    code = "1",
                    message = $"Failed to create staging table: {ex.Message}",
                    data = null,
                    total = 0
                };
            }
        }

        public async Task<ImportMasterResponse> DropStagingTable(int importId)
        {
            try
            {
                // Get import master
                var importMaster = await TImportMasters.FirstOrDefaultAsync(x => x.ImportId == importId);
                if (importMaster == null)
                {
                    return new ImportMasterResponse
                    {
                        code = "1",
                        message = "Import configuration not found",
                        data = null,
                        total = 0
                    };
                }

                if (string.IsNullOrEmpty(importMaster.ImportTempTableName))
                {
                    return new ImportMasterResponse
                    {
                        code = "1",
                        message = "No staging table configured in import_temp_table_name",
                        data = null,
                        total = 0
                    };
                }

                var stagingTableName = importMaster.ImportTempTableName;

                // Drop table if exists using SqlConnection with connection string
                var dropTableSql = $@"
                    IF OBJECT_ID('{stagingTableName}', 'U') IS NOT NULL 
                        DROP TABLE {stagingTableName}";

                using (var connection = new SqlConnection(Database.GetConnectionString()))
                {
                    await connection.OpenAsync();
                    using (var command = new SqlCommand(dropTableSql, connection))
                    {
                        await command.ExecuteNonQueryAsync();
                    }
                }

                // Update audit fields using raw SQL to avoid EF tracking issues
                await Database.ExecuteSqlRawAsync(
                    "UPDATE imp.t_mas_import_master SET update_by = {0}, update_date = {1} WHERE import_id = {2}",
                    "system", DateTime.Now, importId);

                return new ImportMasterResponse
                {
                    code = "0",
                    message = $"Staging table {stagingTableName} dropped successfully",
                    data = null,
                    total = 0
                };
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
                {
                    code = "1",
                    message = $"Failed to drop staging table: {ex.Message}",
                    data = null,
                    total = 0
                };
            }
        }
    }
}
