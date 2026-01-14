const JsonTable = ({ data }) => {
    if (typeof data !== "object" || data === null) {
        return <span>{String(data)}</span>;
    }

    return (
        <div>
            <table style={{ borderCollapse: "collapse", width: "100%", background: "#f9f9f9", border: "1px solid #ddd", marginBottom: "8px" }}>
                <tbody>
                    {Object.entries(data).map(([key, value]) => (
                        <tr key={key}>
                            <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold", verticalAlign: "top" }}>
                                {key}
                            </td>
                            <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                                {typeof value === "object" ? <JsonTable data={value} /> : String(value)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const MessageBox = ({ message }) => {
    if (!message) return null;

    const isImage =
        message.startsWith("data:image/") ||
        message.startsWith("blob:") ||
        /\.(png|jpg|jpeg|gif|webp)$/i.test(message);

    if (isImage) {
        return <img src={message} alt="message" style={{ maxWidth: "100%", borderRadius: "8px" }} />;
    }

    if (message.startsWith("http")) {
        return (
            <a href={message} target="_blank" rel="noopener noreferrer" style={{ color: "#1877f2", textDecoration: "underline" }}>
                {message}
            </a>
        );
    }

    if (!message) return null;

    const parts = message.split("```");

    return (
        <div style={{ wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
            {parts.map((part, index) => {
                if (part.startsWith("json")) {
                    // ตัด "json" ออก
                    const jsonText = part.replace(/^json\s*/, "").trim();

                    try {
                        const parsed = JSON.parse(jsonText);
                        return <JsonTable key={index} data={parsed} />;
                    } catch (e) {
                        return (
                            <pre key={index} style={{ background: "#f4f4f4", padding: "8px" }}>
                                {jsonText}
                            </pre>
                        );
                    }
                } else {
                    return <span key={index}>{part}</span>;
                }
            })}
        </div>
    );
};

export default MessageBox;