using Import_Export_Manager.Extensions;
using Import_Export_Manager.Interfaces;
using Import_Export_Manager.Models.Requests;
using Import_Export_Manager.Models.Responses;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Import_Export_Manager.Services
{
    public class ImportMasterService : IImportMaster
    {
        private readonly ApplicationDbContext _context;
        public ImportMasterService(ApplicationDbContext context)
        {
            _context = context;
        }
        public async Task<ImportMasterResponse> GetImportMasters(int page, int limit, string search, string sortBy, string sortOrder)
        {
            try
            {
                ImportMasterResponse response = new ImportMasterResponse();
                response.data = new List<ImportMasterListResponse?>();
                var data = _context.TImportMasters.AsQueryable();

                if (!string.IsNullOrEmpty(search))
                {
                    data = data.Where(x => x.ImportName.Contains(search) || (x.Description != null && x.Description.Contains(search)));
                }
                string sortByNormalized = sortBy.ToLowerInvariant();
                string sortOrderNormalized = sortOrder.ToLowerInvariant();

                switch(sortByNormalized)
                {
                    case "import_id":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ImportId) : data.OrderBy(x => x.ImportId);
                        break;
                    case "import_name":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ImportName) : data.OrderBy(x => x.ImportName);
                        break;
                    case "description":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.Description) : data.OrderBy(x => x.Description);
                        break;
                    case "exec_sql_command":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ExecSqlCommand) : data.OrderBy(x => x.ExecSqlCommand);
                        break;
                    case "excel_example_file_path":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ExcelExampleFilePath) : data.OrderBy(x => x.ExcelExampleFilePath);
                        break;
                    case "seq":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.Seq) : data.OrderBy(x => x.Seq);
                        break;
                    case "is_active":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.IsActive) : data.OrderBy(x => x.IsActive);
                        break;
                    case "confirm_message":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.ConfirmMessage) : data.OrderBy(x => x.ConfirmMessage);
                        break;
                    case "create_by":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.CreateBy) : data.OrderBy(x => x.CreateBy);
                        break;
                    case "created_date":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.CreatedDate) : data.OrderBy(x => x.CreatedDate);
                        break;
                    case "update_by":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.UpdateBy) : data.OrderBy(x => x.UpdateBy);
                        break;
                    case "update_date":
                        data = sortOrderNormalized == "desc" ? data.OrderByDescending(x => x.UpdateDate) : data.OrderBy(x => x.UpdateDate);
                        break;
                    default:
                        data = data.OrderBy(x => x.ImportId);
                        break;
                }
                response.total = await data.CountAsync();

                var importMasters = await data.Skip((page - 1) * limit).Take(limit).ToListAsync();

                foreach (var item in importMasters)
                {
                    response.data.Add(new ImportMasterListResponse
                    {
                        import_id = item.ImportId,
                        import_name = item.ImportName,
                        description = item.Description,
                        exec_sql_command = item.ExecSqlCommand,
                        excel_example_file_path = item.ExcelExampleFilePath,
                        seq = item.Seq,
                        is_active = item.IsActive,
                        confirm_message = item.ConfirmMessage,
                        create_by = item.CreateBy,
                        created_date = item.CreatedDate,
                        update_by = item.UpdateBy,
                        update_date = item.UpdateDate
                    });
                }
                if(importMasters.Count > 0)
                {
                    response.code = "0";
                    response.message = "Success";
                }
                else
                {
                    response.code = "1";
                    response.message = "Data not found";
                }

                return response;
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }
        public async Task<ImportMasterResponse> GetImportMasterById(int import_id)
        {
            try
            {
                ImportMasterResponse response = new ImportMasterResponse();
                var data = await _context.TImportMasters.FirstOrDefaultAsync(x => x.ImportId == import_id);
                if(data != null)
                {
                    response.data = new List<ImportMasterListResponse?>();
                    response.data.Add(new ImportMasterListResponse
                    {
                        import_id = data.ImportId,
                        import_name = data.ImportName,
                        description = data.Description,
                        exec_sql_command = data.ExecSqlCommand,
                        excel_example_file_path = data.ExcelExampleFilePath,
                        seq = data.Seq,
                        is_active = data.IsActive,
                        confirm_message = data.ConfirmMessage,
                        create_by = data.CreateBy,
                        created_date = data.CreatedDate,
                        update_by = data.UpdateBy,
                        update_date = data.UpdateDate
                    });
                    response.code = "0";
                    response.message = "Success";
                    response.total = 1;
                }
                else
                {
                    response.code = "1";
                    response.message = "Data not found";
                    response.data = null;
                    response.total = 0;
                }

                return response;
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }
        public async Task<ImportMasterResponse> CreateImportMaster(ImportMasterRequest request)
        {
            try
            {
                return await _context.InsertImportMaster(request);
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }
        public async Task<ImportMasterResponse> UpdateImportMaster(int import_id, ImportMasterRequest request)
        {
            try
            {
                return await _context.UpdateImportMaster(import_id, request);
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
                {
                    code = "1",
                    message = ex.Message,
                    data = null,
                    total = 0
                };
            }
        }
        public async Task<ImportMasterResponse> DeleteImportMaster(int import_id)
        {
            try
            {
                return await _context.DeleteImportMaster(import_id);
            }
            catch (Exception ex)
            {
                return new ImportMasterResponse
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
