import { Box } from "@mui/material";
import { useEffect, useRef } from "react";
import ChatBox from "./ChatBox";

const BSFloatingChatWindow = (props) => {
    const { isOpen, onClose, messages, userId, currentUser, text, setText, sendMessage } = props;
    const chatBodyRef = useRef(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]); // เลื่อนทุกครั้งที่ messages เปลี่ยน

    if (!isOpen) return null;

    return (
        <Box className="chat-window">
            <Box className="chat-header">
                <span>{currentUser || "Chat"}</span>
                <button onClick={onClose} className="close-chat-button">✖</button>
            </Box>

            <Box className="chat-body" ref={chatBodyRef}>
                <ChatBox chat={messages} userId={userId} />
            </Box>

            <Box className="chat-footer">
                <textarea
                    className="chat-input"
                    placeholder="Message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />
            </Box>
        </Box>
    );
}
export default BSFloatingChatWindow;