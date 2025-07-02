import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function SpectatorStreaming() {
  const [frameMap, setFrameMap] = useState(new Map());
  const [usernames, setUsernames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { gameCode } = location.state || {};

  useEffect(() => {
    const socketUrl = `wss://bbd-lasertag.onrender.com/session/${gameCode}/spectator`;
    console.log("🔌 Connecting to WebSocket at:", socketUrl);
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("✅ Connected as spectator to session:", gameCode);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📦 Raw WebSocket message received:", data);

        if (data.type === "cameraFramesBatch" && Array.isArray(data.frames)) {
          const currentUsername = usernames[currentIndex];
          const frameForCurrentUser = data.frames.find(
            (f) => f.username === currentUsername
          );

          if (frameForCurrentUser) {
            setFrameMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(
                frameForCurrentUser.username,
                frameForCurrentUser.frame
              );
              return newMap;
            });
          }

          const incomingUsernames = data.frames.map((f) => f.username);
          if (
            incomingUsernames.length !== usernames.length ||
            !incomingUsernames.every((name, i) => name === usernames[i])
          ) {
            setUsernames(incomingUsernames);

            if (!incomingUsernames.includes(currentUsername)) {
              setCurrentIndex(0);
            }
          }
        }
      } catch (err) {
        console.error("❌ Failed to parse WebSocket message:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("🛑 Spectator WebSocket closed.");
    };

    return () => {
      socket.close();
    };
  }, [gameCode, usernames, currentIndex]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % usernames.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + usernames.length) % usernames.length);
  };

  const currentUsername = usernames[currentIndex];
  const currentFrame = frameMap.get(currentUsername);

  return (
    <div
      style={{
        backgroundColor: "#000",
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        color: "white",
        padding: "20px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Background Image */}
      <img
        src="/images/laser-tag-landing.gif"
        alt="Background"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          opacity: 0.3,
          zIndex: -1,
        }}
      />

      {/* Header with Logo */}
      <div
        style={{
          width: "100%",
          backgroundColor: "#800080",
          padding: "15px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <img
          src="/images/Laser-Tag-Logo.png"
          alt="Logo"
          style={{
            maxHeight: "80px",
            maxWidth: "200px",
            objectFit: "contain",
          }}
        />
      </div>

      <h2 style={{ marginBottom: "20px" }}>
        {currentUsername
          ? `Viewing: ${currentUsername}`
          : "Waiting for player streams "}
        {!currentUsername && (
          <span className="loading-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        )}
      </h2>

      {currentFrame && (
        <img
          src={currentFrame}
          alt={`Live stream from ${currentUsername}`}
          style={{
            width: "90%",
            maxWidth: "800px",
            maxHeight: "70vh",
            objectFit: "contain",
            border: "3px solid #fff",
            borderRadius: "12px",
          }}
        />
      )}

      {usernames.length > 1 && (
        <div style={{ marginTop: "20px", display: "flex", gap: "40px" }}>
          <button onClick={goToPrev} style={buttonStyle}>
            Previous Player
          </button>
          <button onClick={goToNext} style={buttonStyle}>
            Next Player
          </button>
        </div>
      )}

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: "30px",
          fontSize: "18px",
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#800080",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Back to Home
      </button>

      <style>
        {`
          .loading-dots {
            display: inline-block;
            margin-left: 5px;
          }
          .loading-dots span {
            animation: dot-appear 1.2s infinite ease-in-out;
            display: inline-block;
          }
          .loading-dots span:nth-child(2) {
            animation-delay: 0.2s;
          }
          .loading-dots span:nth-child(3) {
            animation-delay: 0.4s;
          }
          @keyframes dot-appear {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

const buttonStyle = {
  fontSize: "20px",
  padding: "10px 20px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#1f2937",
  color: "#fff",
  cursor: "pointer",
};