import React from "react";

const BSFloatingChatList = ({ users, onSelectUser, onClose }) => {
    return (
        <div
            style={{
                position: "fixed",
                bottom: "90px",
                right: "20px",
                width: "250px",
                background: "white",
                border: "1px solid #ccc",
                borderRadius: "10px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                maxHeight: "300px",
                overflowY: "auto",
                zIndex: 1000,
            }}
        >
            <div style={{ padding: "10px", fontWeight: "bold" }}>
                Select User
                <button
                    onClick={onClose}
                    style={{
                        float: "right",
                        background: "transparent",
                        border: "none",
                        fontSize: "16px",
                        cursor: "pointer",
                    }}
                >
                    ✖
                </button>
            </div>
            {users.map((u) => (
                <div
                    key={u.userId}
                    style={{
                        padding: "10px",
                        borderBottom: "1px solid #eee",
                        cursor: "pointer",
                    }}
                    onClick={() => onSelectUser(u.userId, u.username)}
                >
                    {u.username}
                </div>
            ))}
        </div>
    );
}
export default BSFloatingChatList;