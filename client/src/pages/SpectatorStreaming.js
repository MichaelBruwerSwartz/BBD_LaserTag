import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function SpectatorStreaming() {
  const [frameMap, setFrameMap] = useState(new Map());
  const [usernames, setUsernames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playerStats, setPlayerStats] = useState([]); // 👈 NEW

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

        // ✅ Handle camera frames
        if (data.type === "cameraFramesBatch" && Array.isArray(data.frames)) {
          const incomingUsernames = data.frames.map((f) => f.username);
          const currentUsername = usernames[currentIndex];

          setFrameMap((prev) => {
            const newMap = new Map();

            // Keep only frames for current batch of usernames
            for (const frame of data.frames) {
              newMap.set(frame.username, frame.frame);
            }

            // Log removal of usernames
            for (const key of prev.keys()) {
              if (!incomingUsernames.includes(key)) {
                console.log(`❌ Removing ${key} from frameMap (user left)`);
              }
            }

            return newMap;
          });

          if (
            incomingUsernames.length !== usernames.length ||
            !incomingUsernames.every((name, i) => name === usernames[i])
          ) {
            console.log("🔄 Updating usernames:", incomingUsernames);
            setUsernames(incomingUsernames);

            if (!incomingUsernames.includes(currentUsername)) {
              setCurrentIndex(0);
            }
          }
        }

        // ✅ Handle gameUpdate
        if (data.type === "gameUpdate" && Array.isArray(data.players)) {
          console.log("🧠 Updating player stats:", data.players);
          setPlayerStats(data.players);
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
  const currentStats = playerStats.find((p) => p.username === currentUsername);

  console.log("👁️ Current username:", currentUsername);
  console.log("🎯 Current stats:", currentStats);

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
      <h2 style={{ marginBottom: "20px" }}>
        {currentUsername
          ? `Viewing: ${currentUsername}`
          : "Waiting for player streams "}
        {!currentUsername && (
          <span className="loading-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        )}
      </h2>

      {currentFrame && (
        <div style={{ position: "relative", width: "90%", maxWidth: "800px" }}>
          <img
            src={currentFrame}
            alt={`Live stream from ${currentUsername}`}
            style={{
              width: "100%",
              maxHeight: "30vh",
              objectFit: "contain",
              border: "3px solid #fff",
              borderRadius: "12px",
              display: "block",
            }}
          />
          <img
            src="/scope.png"
            alt="Scope Reticle"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "50px",
              height: "50px",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              opacity: 0.8,
            }}
          />
        </div>
      )}

      {currentStats && (
        <div
          style={{ marginTop: "20px", fontSize: "18px", textAlign: "center" }}
        >
          <p>
            <strong>Hits Given:</strong> {currentStats.hitsGiven}
          </p>
          <p>
            <strong>Hits Taken:</strong> {currentStats.hitsTaken}
          </p>
          <p>
            <strong>Points:</strong> {currentStats.points}
          </p>
        </div>
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
