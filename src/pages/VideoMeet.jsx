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

const peerConfigConnections = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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

            connections[id].addStream(window.localStream);

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
                        connections[id].addStream(window.localStream);

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

            connections[id].addStream(window.localStream);

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
                                        .catch((e) => console.log(e));
                                })
                                .catch((e) => console.log(e));
                        }
                    })
                    .catch((e) => console.log(e));
            }

            if (signal.ice) {
                connections[fromId]
                    .addIceCandidate(new RTCIceCandidate(signal.ice))
                    .catch((e) => console.log(e));
            }
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on("signal", gotMessageFromServer);

        socketRef.current.on("connect", () => {
            socketRef.current.emit("join-call", window.location.href, username);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("chat-message", addMessage);

            socketRef.current.on("user-left", (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
            });

            socketRef.current.on("user-joined", (id, clients, usernames) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
                    // Wait for their ice candidate
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit(
                                "signal",
                                socketListId,
                                JSON.stringify({ ice: event.candidate })
                            );
                        }
                    };

                    // Wait for their video stream
                    connections[socketListId].onaddstream = (event) => {
                        console.log("BEFORE", videos);
                        console.log("FINDING", socketListId);

                        let videoExists = videoRef.current.find(
                            (video) => video.socketId === socketListId
                        );

                        if (videoExists) {
                            console.log("FOUND EXISTING");

                            // Update the stream of the existing video
                            setVideos((videos) => {
                                const updatedVideos = videos.map((video) =>
                                    video.socketId === socketListId
                                        ? {
                                              ...video,
                                              stream: event.stream,
                                              username:
                                                  usernames[socketListId] ||
                                                  video.username ||
                                                  "Participant",
                                          }
                                        : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            console.log("CREATING NEW");
                            // Create a new video
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.stream,
                                autoplay: true,
                                playsinline: true,
                                username: usernames[socketListId] || "Participant",
                            };

                            setVideos((videos) => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    // Add the local video stream
                    if (window.localStream !== undefined && window.localStream !== null) {
                        connections[socketListId].addStream(window.localStream);
                    } else {
                        let blackSilence = (...args) =>
                            new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        connections[socketListId].addStream(window.localStream);
                    }
                });

                if (id === socketIdRef.current) {
                    console.log("OKOKOK");
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        try {
                            connections[id2].addStream(window.localStream);
                        } catch (e) {}

                        connections[id2].createOffer().then((description) => {
                            connections[id2]
                                .setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit(
                                        "signal",
                                        id2,
                                        JSON.stringify({ sdp: connections[id2].localDescription })
                                    );
                                })
                                .catch((e) => console.log(e));
                        });
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
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
        } catch (e) {}
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
