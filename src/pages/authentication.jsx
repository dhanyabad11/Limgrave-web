import React, { useState, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function Authentication() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");

    const { handleRegister, handleLogin } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (isLogin) {
                await handleLogin(username, password);
            } else {
                await handleRegister(name, username, password);
                setIsLogin(true);
                setName("");
                setUsername("");
                setPassword("");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Error occurred");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Logo/Brand */}
                <div style={styles.brandContainer}>
                    <div style={styles.logo}>L</div>
                    <h1 style={styles.brand}>Limgrave</h1>
                </div>

                {/* Tab Switcher */}
                <div style={styles.tabContainer}>
                    <button
                        type="button"
                        onClick={() => setIsLogin(true)}
                        style={{
                            ...styles.tab,
                            ...(isLogin ? styles.tabActive : {}),
                        }}
                    >
                        Login
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsLogin(false)}
                        style={{
                            ...styles.tab,
                            ...(!isLogin ? styles.tabActive : {}),
                        }}
                    >
                        Sign Up
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={styles.form}>
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={styles.input}
                            required
                        />
                    )}
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        style={styles.input}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                        required
                    />

                    {error && <div style={styles.error}>{error}</div>}

                    <button type="submit" style={styles.button}>
                        {isLogin ? "Continue" : "Create Account"}
                    </button>
                </form>
            </div>
        </div>
    );
}

// Minimalistic inline styles
const styles = {
    container: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "20px",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    },
    card: {
        background: "white",
        borderRadius: "16px",
        padding: "48px 40px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
    },
    brandContainer: {
        textAlign: "center",
        marginBottom: "40px",
    },
    logo: {
        width: "56px",
        height: "56px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "28px",
        fontWeight: "700",
        margin: "0 auto 16px",
    },
    brand: {
        fontSize: "24px",
        fontWeight: "600",
        color: "#1a1a1a",
        margin: "0",
        letterSpacing: "-0.5px",
    },
    tabContainer: {
        display: "flex",
        gap: "8px",
        marginBottom: "32px",
        background: "#f5f5f5",
        padding: "4px",
        borderRadius: "10px",
    },
    tab: {
        flex: 1,
        padding: "10px",
        border: "none",
        background: "transparent",
        color: "#666",
        fontSize: "14px",
        fontWeight: "500",
        cursor: "pointer",
        borderRadius: "8px",
        transition: "all 0.2s ease",
        outline: "none",
    },
    tabActive: {
        background: "white",
        color: "#1a1a1a",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.06)",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
    },
    input: {
        padding: "14px 16px",
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        fontSize: "15px",
        outline: "none",
        transition: "border 0.2s ease",
        fontFamily: "inherit",
        backgroundColor: "#fafafa",
    },
    button: {
        padding: "14px",
        border: "none",
        borderRadius: "10px",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        marginTop: "8px",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        outline: "none",
    },
    error: {
        color: "#ef4444",
        fontSize: "13px",
        padding: "12px",
        background: "#fef2f2",
        borderRadius: "8px",
        textAlign: "center",
    },
};
