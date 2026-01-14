import React, { useState } from "react";

const BSFloatingChatButton = ({ users, unreadCounts, selectUser, userId }) => {
    const [showUserList, setShowUserList] = useState(false);

    // นับรวมจำนวนข้อความที่ยังไม่ได้อ่านทั้งหมด
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    return (
        <div style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 999 }}>
            {/* ปุ่มหลัก */}
            <button
                style={{
                    background: "#1877f2",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: "60px",
                    height: "60px",
                    fontSize: "24px",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    position: "relative",
                }}
                onClick={() => setShowUserList(!showUserList)}
            >
                💬
                {/* Badge แสดงจำนวนข้อความที่ยังไม่ได้อ่าน */}
                {totalUnread > 0 && (
                    <span
                        style={{
                            position: "absolute",
                            top: "-5px",
                            right: "-5px",
                            background: "red",
                            color: "white",
                            borderRadius: "50%",
                            width: "20px",        // ขนาดวงกลม
                            height: "20px",       // ขนาดวงกลม
                            display: "flex",      // จัดกลาง
                            alignItems: "center", // จัดแนวตั้งกลาง
                            justifyContent: "center", // จัดแนวนอนกลาง
                            fontSize: "12px",
                            fontWeight: "bold",
                            textAlign: "center",
                            padding: "0",         // ไม่ต้องใช้ padding
                            minWidth: "20px"
                        }}
                    >
                        {totalUnread}
                    </span>
                )}
            </button>

            {/* รายชื่อผู้ใช้ */}
            {showUserList && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "70px",
                        right: "0",
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                        width: "200px",
                        maxHeight: "300px",
                        overflowY: "auto",
                    }}
                >
                    <div style={{ padding: "10px", borderBottom: "1px solid #ddd", fontWeight: "bold" }}>
                        Online
                    </div>

                    {users.filter(u => u.userId !== userId).map(u => {
                        const unread = unreadCounts[u.userId] || 0;
                        return (
                            <div
                                key={u.userId}
                                style={{
                                    padding: "8px 10px",
                                    cursor: "pointer",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    borderBottom: "1px solid #eee",
                                }}
                                onClick={() => {
                                    selectUser(u.userId);
                                    setShowUserList(false);
                                }}
                            >
                                <span>{u.username}</span>
                                {unread > 0 && (
                                    <span style={{

                                        background: "red",
                                        color: "white",
                                        borderRadius: "10px",
                                        padding: "5px 5px",
                                        fontSize: "12px"
                                    }}>
                                        {unread}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {users.filter(u => u.userId !== userId).length === 0 && (
                        <div style={{ padding: "10px", color: "#888" }}>No users online</div>
                    )}
                </div>
            )}
        </div>
    );
}
export default BSFloatingChatButton;