using ApiCore.Models.Requests;

namespace ApiCore.Services.Interfaces
{
    public interface IOutbound
    {
        Task<object> GetOutboundAsync(int outbound_master_id);
        Task<object?> InsertOutboundAsync(OutboundRequest request, string userId);
        Task<object?> UpdateOutboundAsync(int outboundMasterId, OutboundRequest request, string userId);
        Task<object?> DeleteOutboundAsync(int outboundMasterId, string userId);
        Task<object> ReleaseUserAsync(OutboundActionRequest request, string userId);
        Task<object> ReleaseSystemAsync(OutboundActionRequest request, string userId);
        Task<object> UnreleaseUserAsync(OutboundActionRequest request, string userId);
        Task<object> UnreleaseSystemAsync(OutboundActionRequest request, string userId);
        Task<object> CancelOrderAsync(OutboundActionRequest request, string userId);
        Task<object> ConfirmShipAsync(long outbound_master_id, string userId, string device = "WEB", string lang = "en-US");
    }
}
