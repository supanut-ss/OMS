using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using ApiCore.Data;
using ApiCore.Data.Repositories;
using ApiCore.Models.Base;
using ApiCore.Services.Interfaces;
using System.Data;
using System.Diagnostics;

namespace ApiCore.Services.Implementation.Base
{
    /// <summary>
    /// Base service providing common CRUD operations with optimized performance
    /// </summary>
    public abstract class BaseService<TEntity, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest>
        : IBaseService<TEntity, TResponse, TCreateRequest, TUpdateRequest, TSummaryResponse, TDataGridRequest>
        where TEntity : BaseEntity
        where TResponse : BaseResponse
        where TCreateRequest : BaseRequest
        where TUpdateRequest : BaseUpdateRequest
        where TDataGridRequest : DataGridRequest
    {
        protected readonly IRepository<TEntity> _repository;
        protected readonly ApplicationDbContext _context;

        protected BaseService(IRepository<TEntity> repository, ApplicationDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        // Abstract methods that must be implemented by derived classes
        protected abstract TResponse MapToResponse(TEntity entity);
        protected abstract TSummaryResponse MapToSummaryResponse(TEntity entity);
        protected abstract TEntity MapToEntity(TCreateRequest request);
        protected abstract void UpdateEntity(TEntity entity, TUpdateRequest request);
        protected abstract string GetUniqueIdentifier(TCreateRequest request);
        protected abstract string GetUniqueIdentifier(TUpdateRequest request);
        protected abstract string GetStoredProcedureName();
        protected abstract TResponse MapFromDataReader(SqlDataReader reader);

        public virtual async Task<List<TResponse>> GetAllAsync()
        {
            var entities = await _repository.GetAllAsync();
            return entities.Select(MapToResponse).ToList();
        }

        public virtual async Task<List<TSummaryResponse>> GetSummaryAsync()
        {
            var entities = await _repository.GetAllAsync();
            return entities.Select(MapToSummaryResponse).ToList();
        }

        public virtual async Task<TResponse?> GetByIdAsync(string id)
        {
            var entity = await _repository.GetByIdAsync(id);
            return entity != null ? MapToResponse(entity) : null;
        }

        public virtual async Task<TResponse> CreateAsync(TCreateRequest request)
        {
            var identifier = GetUniqueIdentifier(request);
            if (await ExistsAsync(identifier))
            {
                throw new InvalidOperationException($"Entity with identifier '{identifier}' already exists");
            }

            var entity = MapToEntity(request);
            var created = await _repository.CreateAsync(entity);
            return MapToResponse(created);
        }

        public virtual async Task<TResponse> UpdateAsync(TUpdateRequest request)
        {
            var entity = await _repository.GetByIdAsync(request.Id);
            if (entity == null)
            {
                throw new KeyNotFoundException($"Entity with ID '{request.Id}' not found");
            }

            var identifier = GetUniqueIdentifier(request);
            var existingEntity = await _repository.FindAsync(e => GetEntityIdentifier(e) == identifier && e.Id != request.Id);
            if (existingEntity.Any())
            {
                throw new InvalidOperationException($"Entity with identifier '{identifier}' already exists");
            }

            UpdateEntity(entity, request);
            entity.UpdateDate = DateTime.Now;

            var updated = await _repository.UpdateAsync(entity);
            return MapToResponse(updated);
        }

        public virtual async Task<bool> DeleteAsync(string id)
        {
            var entity = await _repository.GetByIdAsync(id);
            if (entity == null) return false;

            // Check for dependencies (override this method in derived classes if needed)
            await CheckDependenciesBeforeDelete(entity);

            await _repository.DeleteAsync(id);
            return true;
        }

        public virtual async Task<bool> ExistsAsync(string identifier)
        {
            var entities = await _repository.FindAsync(e => GetEntityIdentifier(e) == identifier);
            return entities.Any();
        }

        public virtual async Task<DataGridResponse<TResponse>> GetDataGridAsync(TDataGridRequest request)
        {
            var stopwatch = Stopwatch.StartNew();

            try
            {
                var pageSize = request.End - request.Start;
                var page = (request.Start / pageSize) + 1;

                var whereClause = BuildWhereClause(request);
                var orderByClause = BuildOrderByClause(request.SortModel);

                var parameters = new List<SqlParameter>
                {
                    new SqlParameter("@PageNumber", page),
                    new SqlParameter("@PageSize", pageSize),
                    new SqlParameter("@Search", (object?)request.FilterModel.QuickFilterValues ?? DBNull.Value),
                    new SqlParameter("@WhereClause", whereClause),
                    new SqlParameter("@OrderByClause", orderByClause)
                };

                var response = new DataGridResponse<TResponse>();

                try
                {
                    using var connection = new SqlConnection(_context.Database.GetConnectionString());
                    using var command = new SqlCommand(GetStoredProcedureName(), connection);
                    command.CommandType = CommandType.StoredProcedure;
                    command.Parameters.AddRange(parameters.ToArray());

                    await connection.OpenAsync();
                    using var reader = await command.ExecuteReaderAsync();

                    // Read total count (first result set)
                    if (await reader.ReadAsync())
                    {
                        response.RowCount = reader.GetInt32("TotalCount");
                    }

                    // Read data (second result set)
                    if (await reader.NextResultAsync())
                    {
                        var items = new List<TResponse>();
                        while (await reader.ReadAsync())
                        {
                            items.Add(MapFromDataReader(reader));
                        }
                        response.Rows = items;
                    }
                }
                catch (SqlException ex) when (ex.Message.Contains("Could not find stored procedure"))
                {
                    // Fallback to Entity Framework
                    var entities = await _repository.GetAllAsync();
                    var responses = entities.Select(MapToResponse).ToList();
                    var pagedResponses = responses.Skip(request.Start).Take(pageSize).ToList();

                    response.Rows = pagedResponses;
                    response.RowCount = responses.Count;
                }

                stopwatch.Stop();
                response.Success = true;
                response.Message = "Data retrieved successfully";
                response.Metadata = new DataGridMetadata
                {
                    Start = request.Start,
                    End = request.End,
                    PageSize = pageSize,
                    CurrentPage = page,
                    TotalPages = (int)Math.Ceiling((double)response.RowCount / pageSize),
                    AppliedSort = request.SortModel,
                    AppliedFilters = request.FilterModel.Items,
                    QueryExecutionTimeMs = stopwatch.ElapsedMilliseconds,
                    FetchedAt = DateTime.UtcNow
                };

                return response;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                throw new Exception($"Error retrieving DataGrid data: {ex.Message}", ex);
            }
        }

        // Virtual methods that can be overridden
        protected virtual async Task CheckDependenciesBeforeDelete(TEntity entity)
        {
            // Override in derived classes to check for dependencies
            await Task.CompletedTask;
        }

        protected virtual string GetEntityIdentifier(TEntity entity)
        {
            // Override in derived classes to return the unique identifier field
            return entity.Id;
        }

        protected virtual string BuildWhereClause(TDataGridRequest request)
        {
            var conditions = new List<string>();

            foreach (var filter in request.FilterModel.Items)
            {
                var condition = filter.Operator.ToLower() switch
                {
                    "contains" => $"{filter.Field} LIKE '%{filter.Value}%'",
                    "equals" => $"{filter.Field} = '{filter.Value}'",
                    "startswith" => $"{filter.Field} LIKE '{filter.Value}%'",
                    "endswith" => $"{filter.Field} LIKE '%{filter.Value}'",
                    "isempty" => $"({filter.Field} IS NULL OR {filter.Field} = '')",
                    "isnotempty" => $"({filter.Field} IS NOT NULL AND {filter.Field} != '')",
                    ">" => $"{filter.Field} > '{filter.Value}'",
                    ">=" => $"{filter.Field} >= '{filter.Value}'",
                    "<" => $"{filter.Field} < '{filter.Value}'",
                    "<=" => $"{filter.Field} <= '{filter.Value}'",
                    "!=" => $"{filter.Field} != '{filter.Value}'",
                    _ => $"{filter.Field} LIKE '%{filter.Value}%'"
                };
                conditions.Add(condition);
            }

            if (!string.IsNullOrEmpty(request.FilterModel.QuickFilterValues))
            {
                var quickFilter = BuildQuickFilterClause(request.FilterModel.QuickFilterValues);
                if (!string.IsNullOrEmpty(quickFilter))
                    conditions.Add(quickFilter);
            }

            var logicOperator = request.FilterModel.LogicOperator.ToUpper() == "OR" ? " OR " : " AND ";
            return conditions.Count > 0 ? string.Join(logicOperator, conditions) : "1=1";
        }

        protected virtual string BuildQuickFilterClause(string searchTerm)
        {
            // Override in derived classes to define quick filter fields
            return string.Empty;
        }

        protected virtual string BuildOrderByClause(List<DataGridSortModel> sortModel)
        {
            if (sortModel == null || !sortModel.Any())
            {
                return GetDefaultSortClause();
            }

            var orderItems = sortModel.Select(sort =>
                $"{sort.Field} {(sort.Sort.ToUpper() == "DESC" ? "DESC" : "ASC")}"
            );

            return string.Join(", ", orderItems);
        }

        protected virtual string GetDefaultSortClause()
        {
            return "CreateDate DESC";
        }
    }
}
