import * as signalR from "@microsoft/signalr";
import Config from "../utils/Config";

class SignalRService {
    connection = null;

    start = async (userId) => {
        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(`${Config.API_URL}/notificationHub?userId=${userId}`)
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();
        console.log("start noti")
        await this.connection.start();
    };
    
    stop = async () => {
        if (this.connection) {
            await this.connection.stop();
            console.log("SignalR Disconnected.");
            this.connection = null;
        }
    };

    // subscribe for all-user notification
    onAll = (callback) => {
        this.connection.on("ReceiveAll", callback);
    };

    // subscribe for user-specific notification
    onUser = (callback) => {
        this.connection.on("ReceiveUser", callback);
    };

    // frontend can also call hub methods
    sendToAll = async (message) => {
        await this.connection.invoke("SendToAll", message);
    };

    sendToUser = async (targetUserId, message) => {
        await this.connection.invoke("SendToUser", targetUserId, message);
    };
}

export default new SignalRService();
