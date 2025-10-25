import React, { useEffect, useRef, useState, useContext } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import withAuth from "../utils/withAuth";
import server from "../environment";

const server_url = server;

var connections = {};
var iceCandidateQueue = {}; // Queue for ICE candidates received before remote description

const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

function VideoMeetComponent() {
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();
    const navigate = useNavigate();
    const { roomId } = useParams();
    const { addToUserHistory } = useContext(AuthContext);

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState([]);
    let [audio, setAudio] = useState();
    let [screen, setScreen] = useState();
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState();
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [username, setUsername] = useState("");
    let [isConnected, setIsConnected] = useState(false);
    let [copySuccess, setCopySuccess] = useState(false);

    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    // Cleanup on unmount
    useEffect(() => {
        const videoElement = localVideoref.current;
        const socket = socketRef.current;

        return () => {
            // Cleanup function when component unmounts
            try {
                // Stop all local tracks
                if (videoElement && videoElement.srcObject) {
                    let tracks = videoElement.srcObject.getTracks();
                    tracks.forEach((track) => track.stop());
                }

                // Close all peer connections
                Object.keys(connections).forEach((socketId) => {
                    if (connections[socketId]) {
                        connections[socketId].close();
                    }
                });

                // Disconnect socket
                if (socket) {
                    socket.disconnect();
                }
            } catch (e) {
                console.error("Error during cleanup:", e);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Get username from localStorage and auto-connect
    useEffect(() => {
        console.log("roomId from params:", roomId);
        const storedUsername = localStorage.getItem("username") || localStorage.getItem("name");
        if (storedUsername) {
            setUsername(storedUsername);
            console.log("Auto-connecting with username:", storedUsername);
        } else {
            // If no stored username, redirect to auth
            navigate("/auth");
            return;
        }

        // Add meeting to history
        if (roomId && addToUserHistory) {
            addToUserHistory(roomId).catch(console.error);
        }
    }, [navigate, roomId, addToUserHistory]);

    useEffect(() => {
        if (username && !isConnected) {
            getPermissions();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, isConnected]);

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoPermission) {
                setVideoAvailable(true);
                console.log("Video permission granted");
            } else {
                setVideoAvailable(false);
                console.log("Video permission denied");
            }

            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            if (audioPermission) {
                setAudioAvailable(true);
                console.log("Audio permission granted");
            } else {
                setAudioAvailable(false);
                console.log("Audio permission denied");
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({
                    video: videoAvailable,
                    audio: audioAvailable,
                });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }

            // Auto-connect after getting permissions
            getMedia();
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
            console.log("SET STATE HAS ", video, audio);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [video, audio]);

    const getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
        setIsConnected(true);
    };

    const getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach((track) => track.stop());
        } catch (e) {
            console.log(e);
        }

        window.localStream = stream;
        localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            // Use modern addTrack API
            stream.getTracks().forEach((track) => {
                connections[id].addTrack(track, stream);
            });

            connections[id].createOffer().then((description) => {
                console.log(description);
                connections[id]
                    .setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit(
                            "signal",
                            id,
                            JSON.stringify({ sdp: connections[id].localDescription })
                        );
                    })
                    .catch((e) => console.log(e));
            });
        }

        stream.getTracks().forEach(
            (track) =>
                (track.onended = () => {
                    setVideo(false);
                    setAudio(false);

                    try {
                        let tracks = localVideoref.current.srcObject.getTracks();
                        tracks.forEach((track) => track.stop());
                    } catch (e) {
                        console.log(e);
                    }

                    let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                    window.localStream = blackSilence();
                    localVideoref.current.srcObject = window.localStream;

                    for (let id in connections) {
                        // Use modern addTrack API
                        window.localStream.getTracks().forEach((track) => {
                            connections[id].addTrack(track, window.localStream);
                        });

                        connections[id].createOffer().then((description) => {
                            connections[id]
                                .setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit(
                                        "signal",
                                        id,
                                        JSON.stringify({ sdp: connections[id].localDescription })
                                    );
                                })
                                .catch((e) => console.log(e));
                        });
                    }
                })
        );
    };

    const getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices
                .getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .then((stream) => {})
                .catch((e) => console.log(e));
        } else {
            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
            } catch (e) {}

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoref.current.srcObject = window.localStream;

            getUserMediaSuccess(window.localStream);
        }
    };

    const getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices
                    .getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .then((stream) => {})
                    .catch((e) => console.log(e));
            }
        }
    };

    const getDislayMediaSuccess = (stream) => {
        console.log("HERE");
        try {
            window.localStream.getTracks().forEach((track) => track.stop());
        } catch (e) {
            console.log(e);
        }

        window.localStream = stream;
        localVideoref.current.srcObject = stream;

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            // Use modern addTrack API
            stream.getTracks().forEach((track) => {
                connections[id].addTrack(track, stream);
            });

            connections[id].createOffer().then((description) => {
                connections[id]
                    .setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit(
                            "signal",
                            id,
                            JSON.stringify({ sdp: connections[id].localDescription })
                        );
                    })
                    .catch((e) => console.log(e));
            });
        }

        stream.getTracks().forEach(
            (track) =>
                (track.onended = () => {
                    setScreen(false);

                    try {
                        let tracks = localVideoref.current.srcObject.getTracks();
                        tracks.forEach((track) => track.stop());
                    } catch (e) {
                        console.log(e);
                    }

                    let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                    window.localStream = blackSilence();
                    localVideoref.current.srcObject = window.localStream;

                    getUserMedia();
                })
        );
    };

    const gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId]
                    .setRemoteDescription(new RTCSessionDescription(signal.sdp))
                    .then(() => {
                        // Process any queued ICE candidates
                        if (iceCandidateQueue[fromId]) {
                            console.log(
                                `Processing ${iceCandidateQueue[fromId].length} queued ICE candidates for ${fromId}`
                            );
                            iceCandidateQueue[fromId].forEach((candidate) => {
                                connections[fromId]
                                    .addIceCandidate(new RTCIceCandidate(candidate))
                                    .catch((e) =>
                                        console.error("Error adding queued ICE candidate:", e)
                                    );
                            });
                            iceCandidateQueue[fromId] = [];
                        }

                        if (signal.sdp.type === "offer") {
                            connections[fromId]
                                .createAnswer()
                                .then((description) => {
                                    connections[fromId]
                                        .setLocalDescription(description)
                                        .then(() => {
                                            socketRef.current.emit(
                                                "signal",
                                                fromId,
                                                JSON.stringify({
                                                    sdp: connections[fromId].localDescription,
                                                })
                                            );
                                        })
                                        .catch((e) =>
                                            console.error("Error setting local description:", e)
                                        );
                                })
                                .catch((e) => console.error("Error creating answer:", e));
                        }
                    })
                    .catch((e) => console.error("Error setting remote description:", e));
            }

            if (signal.ice) {
                // Check if remote description is set
                if (connections[fromId] && connections[fromId].remoteDescription) {
                    connections[fromId]
                        .addIceCandidate(new RTCIceCandidate(signal.ice))
                        .catch((e) => console.error("Error adding ICE candidate:", e));
                } else {
                    // Queue ICE candidate until remote description is set
                    console.log("Queuing ICE candidate for", fromId);
                    if (!iceCandidateQueue[fromId]) {
                        iceCandidateQueue[fromId] = [];
                    }
                    iceCandidateQueue[fromId].push(signal.ice);
                }
            }
        }
    };

    const connectToSocketServer = () => {
        // Prevent duplicate connections
        if (socketRef.current && socketRef.current.connected) {
            console.log("Socket already connected, skipping...");
            return;
        }

        // Disconnect any existing socket first
        if (socketRef.current) {
            socketRef.current.off(); // Remove all listeners
            socketRef.current.disconnect();
        }

        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on("signal", gotMessageFromServer);

        socketRef.current.on("connect", () => {
            console.log("✅ Connected to socket server");
            console.log("📤 Sending username:", username);
            socketRef.current.emit("join-call", window.location.href, username);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("chat-message", addMessage);

            socketRef.current.on("user-left", (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
            });

            socketRef.current.on("user-joined", (id, clients, usernamesMap) => {
                console.log("👥 User joined event received");
                console.log("   - Joined ID:", id);
                console.log("   - My Socket ID:", socketIdRef.current);
                console.log("   - All clients:", clients);
                console.log("   - Usernames Map:", usernamesMap);
                console.log("   - Current connections:", Object.keys(connections));

                // Determine which socket IDs to connect to
                let socketListToProcess = [];
                
                if (id === socketIdRef.current) {
                    // This is OUR join event - connect to all EXISTING users (everyone except us)
                    console.log("⚠️  This is our own join event - connecting to existing users");
                    socketListToProcess = clients.filter(socketId => socketId !== socketIdRef.current);
                } else {
                    // Another user joined - only connect to THAT user
                    console.log("➕ Another user joined - creating connection to:", id);
                    socketListToProcess = [id];
                }

                console.log("   - Socket list to process:", socketListToProcess);

                socketListToProcess.forEach((socketListId) => {
                    // Skip if connection already exists
                    if (connections[socketListId]) {
                        console.log("Connection already exists for", socketListId);
                        return;
                    }

                    console.log("Creating new peer connection for:", socketListId);
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    // Monitor connection state
                    connections[socketListId].onconnectionstatechange = () => {
                        console.log(
                            `Connection state for ${socketListId}:`,
                            connections[socketListId].connectionState
                        );
                    };

                    connections[socketListId].oniceconnectionstatechange = () => {
                        console.log(
                            `ICE connection state for ${socketListId}:`,
                            connections[socketListId].iceConnectionState
                        );
                    };

                    // Wait for their ice candidate
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            console.log("Sending ICE candidate to:", socketListId);
                            socketRef.current.emit(
                                "signal",
                                socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        } else {
                            console.log("All ICE candidates sent for:", socketListId);
                        }
                    };

                    // MODERN API: Use ontrack instead of deprecated onaddstream
                    connections[socketListId].ontrack = (event) => {
                        console.log("📹 Track received from:", socketListId);
                        console.log("   - Track kind:", event.track.kind);
                        console.log("   - Streams:", event.streams);
                        console.log("   - Usernames Map received:", usernamesMap);

                        // CRITICAL: Never add our own socket ID to videos
                        if (socketListId === socketIdRef.current) {
                            console.log("⚠️  SKIPPING: This is our own stream!");
                            return;
                        }

                        // SAFE: Get username with multiple fallbacks
                        let participantUsername = "Participant";
                        if (usernamesMap && typeof usernamesMap === "object") {
                            participantUsername = usernamesMap[socketListId] || "Participant";
                        }

                        console.log("   - Final display name:", participantUsername);

                        // Use the first stream
                        const remoteStream = event.streams[0];

                        let videoExists = videoRef.current.find(
                            (video) => video.socketId === socketListId
                        );

                        if (videoExists) {
                            console.log("   - FOUND EXISTING - Updating stream");
                            setVideos((videos) => {
                                const updatedVideos = videos.map((video) =>
                                    video.socketId === socketListId
                                        ? {
                                              ...video,
                                              stream: remoteStream,
                                              username: participantUsername,
                                          }
                                        : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            console.log(
                                "   - CREATING NEW VIDEO with username:",
                                participantUsername
                            );
                            
                            // Double-check: Never add our own socket to videos
                            if (socketListId === socketIdRef.current) {
                                console.error("⛔ CRITICAL: Attempted to add own socket to videos!");
                                return;
                            }
                            
                            let newVideo = {
                                socketId: socketListId,
                                stream: remoteStream,
                                autoplay: true,
                                playsinline: true,
                                username: participantUsername,
                            };

                            setVideos((videos) => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                console.log("   - Updated videos array:", updatedVideos);
                                return updatedVideos;
                            });
                        }
                    };

                    // Add the local video stream using modern API
                    if (window.localStream !== undefined && window.localStream !== null) {
                        try {
                            // Add each track individually (modern API)
                            window.localStream.getTracks().forEach((track) => {
                                console.log("Adding track to peer:", track.kind, socketListId);
                                connections[socketListId].addTrack(track, window.localStream);
                            });
                        } catch (e) {
                            console.error("Error adding stream:", e);
                        }
                    } else {
                        let blackSilence = (...args) =>
                            new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        try {
                            window.localStream.getTracks().forEach((track) => {
                                connections[socketListId].addTrack(track, window.localStream);
                            });
                        } catch (e) {
                            console.error("Error adding black silence stream:", e);
                        }
                    }
                });

                if (id === socketIdRef.current) {
                    console.log("Initiating offers to all peers");
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        try {
                            if (window.localStream) {
                                // Add tracks using modern API
                                window.localStream.getTracks().forEach((track) => {
                                    const senders = connections[id2].getSenders();
                                    const alreadyAdded = senders.find((s) => s.track === track);
                                    if (!alreadyAdded) {
                                        connections[id2].addTrack(track, window.localStream);
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Error adding stream to peer:", e);
                        }

                        connections[id2]
                            .createOffer()
                            .then((description) => {
                                connections[id2]
                                    .setLocalDescription(description)
                                    .then(() => {
                                        socketRef.current.emit(
                                            "signal",
                                            id2,
                                            JSON.stringify({
                                                sdp: connections[id2].localDescription,
                                            })
                                        );
                                    })
                                    .catch((e) =>
                                        console.error("Error setting local description:", e)
                                    );
                            })
                            .catch((e) => console.error("Error creating offer:", e));
                    }
                }
            });
        });
    };

    const silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    const black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext("2d").fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    const handleVideo = () => setVideo(!video);
    const handleAudio = () => setAudio(!audio);
    const handleScreen = () => setScreen(!screen);

    const handleEndCall = () => {
        try {
            // Stop all local tracks
            if (localVideoref.current && localVideoref.current.srcObject) {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach((track) => track.stop());
            }

            // Close all peer connections
            Object.keys(connections).forEach((socketId) => {
                if (connections[socketId]) {
                    connections[socketId].close();
                    delete connections[socketId];
                }
            });

            // Disconnect socket
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        } catch (e) {
            console.error("Error ending call:", e);
        }
        navigate("/home");
    };

    const handleCopyMeetingId = async () => {
        const meetingId = roomId || window.location.pathname.substring(1);
        console.log("Copy button clicked, roomId:", roomId, "meetingId:", meetingId);

        if (!meetingId) {
            alert("No meeting ID available to copy");
            return;
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(meetingId);
                console.log("Successfully copied using clipboard API");
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
            } else {
                // Fallback for older browsers
                console.log("Using fallback copy method");
                const textArea = document.createElement("textarea");
                textArea.value = meetingId;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand("copy");
                document.body.removeChild(textArea);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            }
        } catch (err) {
            console.error("Failed to copy meeting ID:", err);
            alert("Failed to copy meeting ID. Please copy it manually: " + meetingId);
        }
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [...prevMessages, { sender: sender, data: data }]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    const sendMessage = () => {
        socketRef.current.emit("chat-message", message, username);
        setMessage("");
    };

    const handleMessage = (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    };

    return (
        <div className={styles.meetVideoContainer}>
            {/* Meeting Info Header */}
            <div className={styles.meetingHeader}>
                <div className={styles.meetingInfo}>
                    <h3>Meeting ID: {roomId || window.location.pathname.substring(1)}</h3>
                    <p>Joined as: {username}</p>
                </div>
                <button
                    className={`${styles.copyButton} ${copySuccess ? styles.copySuccess : ""}`}
                    onClick={handleCopyMeetingId}
                >
                    {copySuccess ? (
                        <>
                            <CheckIcon style={{ fontSize: "16px", marginRight: "5px" }} />
                            Copied!
                        </>
                    ) : (
                        <>
                            <ContentCopyIcon style={{ fontSize: "16px", marginRight: "5px" }} />
                            Copy Meeting ID
                        </>
                    )}
                </button>
            </div>

            {/* Chat Room */}
            {showModal && (
                <div className={styles.chatRoom}>
                    <div className={styles.chatHeader}>
                        <h3>Chat</h3>
                        <button onClick={() => setModal(false)} className={styles.closeChat}>
                            ×
                        </button>
                    </div>

                    <div className={styles.chatMessages}>
                        {messages.length !== 0 ? (
                            messages.map((item, index) => (
                                <div key={index} className={styles.messageItem}>
                                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                                        {item.sender}
                                    </div>
                                    <div>{item.data}</div>
                                </div>
                            ))
                        ) : (
                            <p style={{ textAlign: "center", color: "#666" }}>No messages yet</p>
                        )}
                    </div>

                    <div className={styles.chatInput}>
                        <TextField
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleMessage}
                            placeholder="Type a message..."
                            fullWidth
                            variant="outlined"
                            size="small"
                        />
                        <Button
                            variant="contained"
                            onClick={sendMessage}
                            disabled={!message.trim()}
                            style={{ marginTop: "8px", width: "100%" }}
                        >
                            Send
                        </Button>
                    </div>
                </div>
            )}

            {/* Control Buttons */}
            <div className={styles.buttonContainers}>
                <div>
                    <IconButton
                        onClick={handleVideo}
                        style={{ color: video ? "white" : "#ff4444" }}
                    >
                        {video ? <VideocamIcon /> : <VideocamOffIcon />}
                    </IconButton>

                    <IconButton
                        onClick={handleAudio}
                        style={{ color: audio ? "white" : "#ff4444" }}
                    >
                        {audio ? <MicIcon /> : <MicOffIcon />}
                    </IconButton>

                    {screenAvailable && (
                        <IconButton onClick={handleScreen} style={{ color: "white" }}>
                            {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                    )}

                    <Badge badgeContent={newMessages} max={999} color="error">
                        <IconButton
                            onClick={() => {
                                setModal(!showModal);
                                setNewMessages(0);
                            }}
                            style={{ color: "white" }}
                        >
                            <ChatIcon />
                        </IconButton>
                    </Badge>

                    <IconButton onClick={handleEndCall} style={{ color: "#ff4444" }}>
                        <CallEndIcon />
                    </IconButton>
                </div>
            </div>

            {/* Video Grid */}
            <div className={styles.conferenceView} data-participants={videos.length + 1}>
                {/* Local Video */}
                <div className={styles.videoContainer}>
                    <video
                        className={styles.localVideo}
                        ref={localVideoref}
                        autoPlay
                        muted
                        playsInline
                    />
                    <div className={styles.videoNameLabel}>You ({username})</div>
                </div>

                {/* Remote Videos */}
                {videos.map((video) => (
                    <div key={video.socketId} className={styles.videoContainer}>
                        <video
                            ref={(ref) => {
                                if (ref && video.stream) {
                                    ref.srcObject = video.stream;
                                }
                            }}
                            autoPlay
                            playsInline
                        />
                        <div className={styles.videoNameLabel}>
                            {video.username || "Participant"}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default withAuth(VideoMeetComponent);
