import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import withAuth from "../utils/withAuth";

function HomeComponent() {
    const [meetingCode, setMeetingCode] = useState("");
    const navigate = useNavigate();
    const { addToUserHistory } = useContext(AuthContext);

    const startMeeting = () => {
        const roomId = Math.random().toString(36).substring(2, 15);
        navigate(`/${roomId}`);
    };

    const joinMeeting = async () => {
        if (meetingCode.trim()) {
            await addToUserHistory(meetingCode);
            navigate(`/${meetingCode}`);
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("name");
        navigate("/auth");
    };

    const viewHistory = () => {
        navigate("/history");
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.logoSection}>
                    <div style={styles.logoSmall}>L</div>
                    <span style={styles.brandName}>Limgrave</span>
                </div>
                <div style={styles.headerRight}>
                    <span style={styles.username}>
                        {localStorage.getItem("name") || localStorage.getItem("username")}
                    </span>
                    <button style={styles.historyButton} onClick={viewHistory}>
                        History
                    </button>
                    <button style={styles.logoutButton} onClick={logout}>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div style={styles.content}>
                <h1 style={styles.title}>Ready to connect?</h1>
                <p style={styles.subtitle}>Start or join a meeting in seconds</p>

                {/* Action Cards */}
                <div style={styles.cardsContainer}>
                    {/* New Meeting Card */}
                    <div style={styles.card}>
                        <div style={styles.cardIcon}>+</div>
                        <h3 style={styles.cardTitle}>New Meeting</h3>
                        <p style={styles.cardDescription}>Start instantly</p>
                        <button style={styles.primaryButton} onClick={startMeeting}>
                            Start
                        </button>
                    </div>

                    {/* Join Meeting Card */}
                    <div style={styles.card}>
                        <div style={styles.cardIcon}>→</div>
                        <h3 style={styles.cardTitle}>Join Meeting</h3>
                        <p style={styles.cardDescription}>Enter meeting code</p>
                        <input
                            type="text"
                            placeholder="Meeting code"
                            value={meetingCode}
                            onChange={(e) => setMeetingCode(e.target.value)}
                            onKeyPress={(e) =>
                                e.key === "Enter" && meetingCode.trim() && joinMeeting()
                            }
                            style={styles.input}
                        />
                        <button
                            style={{
                                ...styles.secondaryButton,
                                ...(meetingCode.trim() ? {} : styles.buttonDisabled),
                            }}
                            onClick={joinMeeting}
                            disabled={!meetingCode.trim()}
                        >
                            Join
                        </button>
                    </div>
                </div>
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
    logoSection: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    logoSmall: {
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "18px",
        fontWeight: "700",
    },
    brandName: {
        fontSize: "18px",
        fontWeight: "600",
        color: "#1a1a1a",
    },
    headerRight: {
        display: "flex",
        alignItems: "center",
        gap: "16px",
    },
    username: {
        fontSize: "14px",
        color: "#666",
        fontWeight: "500",
    },
    historyButton: {
        padding: "8px 16px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        background: "white",
        color: "#333",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
    },
    logoutButton: {
        padding: "8px 16px",
        border: "none",
        borderRadius: "8px",
        background: "#f5f5f5",
        color: "#666",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
    },
    content: {
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "80px 40px",
        textAlign: "center",
    },
    title: {
        fontSize: "48px",
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: "12px",
        letterSpacing: "-1px",
    },
    subtitle: {
        fontSize: "18px",
        color: "#666",
        marginBottom: "60px",
    },
    cardsContainer: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        maxWidth: "700px",
        margin: "0 auto",
    },
    card: {
        background: "white",
        borderRadius: "16px",
        padding: "40px 32px",
        border: "1px solid #e5e5e5",
        transition: "all 0.3s ease",
    },
    cardIcon: {
        width: "56px",
        height: "56px",
        margin: "0 auto 20px",
        borderRadius: "12px",
        background: "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "28px",
        fontWeight: "300",
        color: "#333",
    },
    cardTitle: {
        fontSize: "20px",
        fontWeight: "600",
        color: "#1a1a1a",
        marginBottom: "8px",
    },
    cardDescription: {
        fontSize: "14px",
        color: "#999",
        marginBottom: "24px",
    },
    input: {
        width: "100%",
        padding: "12px 16px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        fontSize: "14px",
        marginBottom: "16px",
        outline: "none",
        transition: "border 0.2s ease",
        fontFamily: "inherit",
        backgroundColor: "#fafafa",
    },
    primaryButton: {
        width: "100%",
        padding: "12px",
        border: "none",
        borderRadius: "8px",
        background: "#1a1a1a",
        color: "white",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
    },
    secondaryButton: {
        width: "100%",
        padding: "12px",
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        background: "white",
        color: "#1a1a1a",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        outline: "none",
    },
    buttonDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
};

export default withAuth(HomeComponent);
