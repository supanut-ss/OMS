import { useEffect, useRef } from "react";
import MessageBox from "./MassageBox";

export default function ChatBox({ chat, userId }) {
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat]); // เลื่อนทุกครั้งที่ chat เปลี่ยน

  return (
    <div
      ref={chatContainerRef}
      style={{
        flex: 1,
        padding: "10px",
        overflowY: "auto",
        background: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
      }}
    >
      {chat.map((msg, idx) => {
        const isMe = msg.senderId === userId;
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              justifyContent: isMe ? "flex-end" : "flex-start",
              marginBottom: "10px",
            }}
          >
            <div
              style={{
                background: isMe ? "#DCF8C6" : "#fff",
                padding: "8px 12px",
                borderRadius: "12px",
                maxWidth: "90%",
                boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ fontSize: "14px", lineHeight: "1.4" ,position: "relative"}}>
                <MessageBox message={msg.message} />
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#888",
                  textAlign: "right",
                  marginTop: "4px",
                }}
              >
                {msg.timestamp
                  ? (() => {
                    const msgDate = new Date(msg.timestamp);
                    const day = String(msgDate.getDate()).padStart(2, "0");
                    const month = String(msgDate.getMonth() + 1).padStart(2, "0"); // เดือนเริ่มจาก 0
                    const year = msgDate.getFullYear();
                    const time = msgDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const now = new Date();
                    const isToday =
                      msgDate.getFullYear() === now.getFullYear() &&
                      msgDate.getMonth() === now.getMonth() &&
                      msgDate.getDate() === now.getDate();

                    if (isToday) {
                      return msgDate.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                    } else {
                      return `${day}/${month}/${year} ${time}`;
                    }
                  })()
                  : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
