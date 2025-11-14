import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                console.error("Failed to fetch history");
            }
        };
        fetchHistory();
    }, []);

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <button style={styles.backButton} onClick={() => routeTo("/home")}>
                    ← Back
                </button>
                <h1 style={styles.title}>Meeting History</h1>
                <div style={{ width: "80px" }}></div>
            </div>

            {/* Content */}
            <div style={styles.content}>
                {meetings.length !== 0 ? (
                    <div style={styles.list}>
                        {meetings.map((meeting, index) => (
                            <div key={index} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div style={styles.icon}>📹</div>
                                    <div style={styles.cardContent}>
                                        <div style={styles.meetingCode}>{meeting.meetingCode}</div>
                                        <div style={styles.date}>{formatDate(meeting.date)}</div>
                                    </div>
                                </div>
                                <button
                                    style={styles.joinButton}
                                    onClick={() => routeTo(`/${meeting.meetingCode}`)}
                                >
                                    Rejoin
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={styles.empty}>
                        <div style={styles.emptyIcon}>📭</div>
                        <p style={styles.emptyText}>No meetings yet</p>
                        <p style={styles.emptySubtext}>Your meeting history will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 40px",
        background: "white",
        borderBottom: "1px solid #e5e5e5",
    },
    backButton: {
        padding: "8px 16px",
        border: "none",
        borderRadius: "8px",
        background: "#f5f5f5",
        color: "#333",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
    },
    title: {
        fontSize: "20px",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: 0,
    },
    content: {
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
    },
    list: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
    },
    card: {
        background: "white",
        borderRadius: "12px",
        padding: "20px 24px",
        border: "1px solid #e5e5e5",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "all 0.2s ease",
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },
    icon: {
        width: "44px",
        height: "44px",
        borderRadius: "10px",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
    },
    cardContent: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    meetingCode: {
        fontSize: "15px",
        fontWeight: "600",
        color: "#1a1a1a",
    },
    date: {
        fontSize: "13px",
        color: "#999",
    },
    joinButton: {
        padding: "8px 20px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        background: "white",
        color: "#333",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
    },
    empty: {
        textAlign: "center",
        padding: "80px 20px",
    },
    emptyIcon: {
        fontSize: "64px",
        marginBottom: "24px",
    },
    emptyText: {
        fontSize: "20px",
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: "8px",
    },
    emptySubtext: {
        fontSize: "14px",
        color: "#999",
    },
};
