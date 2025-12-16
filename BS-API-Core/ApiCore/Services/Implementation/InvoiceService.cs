using ApiCore.Models.Requests;
using ApiCore.Models.Responses;
using ApiCore.Services.Interfaces;
using Microsoft.Data.SqlClient;
using System.Data;

namespace ApiCore.Services.Implementation
{
    public class InvoiceService: IInvoiceService
    {
        private readonly string _connectionString = Environment.GetEnvironmentVariable("SERVERDB")
                  ?? throw new ArgumentNullException(nameof(_connectionString));
        public async Task<InvoiceResponse> DeleteInvoice(int projectInvoiceId)
        {
            try
            {
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    using (var cmd = new SqlCommand("tmt.usp_invoice", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        cmd.Parameters.AddWithValue("@Operation", "DELETE");
                        cmd.Parameters.AddWithValue("@in_intProjectInvoiceId", projectInvoiceId);
                        cmd.Parameters.Add("@OutputRowCount", SqlDbType.Int).Direction = ParameterDirection.Output;
                        cmd.Parameters.Add("@OutputMessage", SqlDbType.NVarChar, 4000).Direction = ParameterDirection.Output;
                        cmd.Parameters.Add("@OutputErrorCode", SqlDbType.Int).Direction = ParameterDirection.Output;
                        await cmd.ExecuteNonQueryAsync();
                        int errorCode = (int)cmd.Parameters["@OutputErrorCode"].Value;
                        return new InvoiceResponse
                        {
                            message_code = errorCode.ToString() ?? "",
                            message_text = cmd.Parameters["@OutputMessage"].Value.ToString() ?? ""
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                return new InvoiceResponse
                {
                    message_code = "999",
                    message_text = ex.Message
                };
            }
        }
        public async Task<InvoiceResponse> InsertOrUpdateInvoice(InvoiceRequest invoice, string userId)
        {
            try
            {
                InvoiceResponse response = new InvoiceResponse();
                using (var conn = new SqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    using (var cmd = new SqlCommand("tmt.usp_upsert_invoice", conn))
                    {
                        cmd.CommandType = CommandType.StoredProcedure;
                        // --- Helper function ---
                        void AddParam(string name, SqlDbType type, object? value, int size = 0)
                        {
                            var p = cmd.Parameters.Add(name, type);
                            if (size > 0) p.Size = size;
                            p.Value = value ?? DBNull.Value;
                        }
                        // Input parameters (type-safe)
                        AddParam("@in_intProjectInvoiceId", SqlDbType.Int, invoice.project_invoice_id ?? null);
                        AddParam("@in_intProjectHeaderId", SqlDbType.Int, invoice.project_header_id);
                        AddParam("@in_vchDocumentType", SqlDbType.NVarChar, invoice.document_type ?? null, 25);
                        AddParam("@in_vchDocumentNo", SqlDbType.NVarChar, invoice.document_no ?? null, 50);
                        AddParam("@in_dtDocumentDate", SqlDbType.DateTime, invoice.document_date);
                        AddParam("@in_dtDueDate", SqlDbType.DateTime, invoice.due_date ?? null);
                        AddParam("@in_decAmount", SqlDbType.Decimal, invoice.amount ?? null);
                        AddParam("@in_vchDescription", SqlDbType.NVarChar, invoice.description ?? null, 500);
                        AddParam("@in_vchIsIncentiveRequested", SqlDbType.Char, invoice.is_incentive_requested ?? null, 3);
                        AddParam("@in_vchIsCancel", SqlDbType.Char, invoice.is_cancel ?? null, 3);
                        AddParam("@in_vchActionUser", SqlDbType.NVarChar, userId, 40);
                        // Output parameters
                        var pOutId = new SqlParameter("@out_intProjectInvoiceId", SqlDbType.Int)
                        {
                            Direction = ParameterDirection.Output
                        };
                        var pOutCode = new SqlParameter("@out_vchErrorCode", SqlDbType.NVarChar, 50)
                        {
                            Direction = ParameterDirection.Output
                        };
                        var pOutMsg = new SqlParameter("@out_vchErrorMessage", SqlDbType.NVarChar, 500)
                        {
                            Direction = ParameterDirection.Output
                        };
                        cmd.Parameters.Add(pOutId);
                        cmd.Parameters.Add(pOutCode);
                        cmd.Parameters.Add(pOutMsg);
                        await cmd.ExecuteNonQueryAsync();
                        int newId = pOutId.Value is DBNull ? 0 : (int)pOutId.Value;
                        response.message_code = pOutCode.Value?.ToString();
                        response.message_text = pOutMsg.Value?.ToString();


                    }
                }
                return response;
            }
            catch (Exception ex)
            {
                return new InvoiceResponse
                {
                    message_code = "999",
                    message_text = ex.Message
                };
            }
        }
    }
}
