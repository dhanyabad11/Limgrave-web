import React from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
    const router = useNavigate();

    return (
        <div style={styles.container}>
            <div style={styles.content}>
                {/* Logo */}
                <div style={styles.logo}>L</div>

                {/* Brand */}
                <h1 style={styles.title}>Limgrave</h1>
                <p style={styles.subtitle}>Video conferencing made simple</p>

                {/* CTA */}
                <button style={styles.button} onClick={() => router("/auth")}>
                    Get Started
                </button>

                {/* Features */}
                <div style={styles.features}>
                    <div style={styles.feature}>HD Video</div>
                    <div style={styles.dot}>·</div>
                    <div style={styles.feature}>Screen Share</div>
                    <div style={styles.dot}>·</div>
                    <div style={styles.feature}>Chat</div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "white",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
        padding: "20px",
    },
    content: {
        textAlign: "center",
        maxWidth: "500px",
    },
    logo: {
        width: "80px",
        height: "80px",
        borderRadius: "20px",
        background: "#1a1a1a",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "40px",
        fontWeight: "700",
        margin: "0 auto 32px",
    },
    title: {
        fontSize: "56px",
        fontWeight: "700",
        color: "#1a1a1a",
        marginBottom: "16px",
        letterSpacing: "-2px",
    },
    subtitle: {
        fontSize: "18px",
        color: "#666",
        marginBottom: "48px",
        fontWeight: "400",
    },
    button: {
        padding: "16px 48px",
        border: "none",
        borderRadius: "12px",
        background: "#1a1a1a",
        color: "white",
        fontSize: "16px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        outline: "none",
        marginBottom: "48px",
    },
    features: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        fontSize: "14px",
        color: "#999",
    },
    feature: {
        fontWeight: "500",
    },
    dot: {
        fontSize: "18px",
    },
};
