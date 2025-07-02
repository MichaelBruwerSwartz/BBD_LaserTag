import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function SpectatorStreaming() {
  const [frameMap, setFrameMap] = useState(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);

  const location = useLocation();
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
          setFrameMap((prevMap) => {
            const newMap = new Map(prevMap);
            data.frames.forEach(({ username, frame }) => {
              newMap.set(username, frame);
            });

            // Remove players who are no longer sending frames
            const activeUsernames = new Set(data.frames.map((f) => f.username));
            for (let key of newMap.keys()) {
              if (!activeUsernames.has(key)) {
                newMap.delete(key);
              }
            }

            const usernames = Array.from(newMap.keys());
            const currentUsername = usernames[currentIndex];
            if (!activeUsernames.has(currentUsername)) {
              console.log("⚠️ Current player removed — resetting to index 0");
              setCurrentIndex(0);
            }

            return newMap;
          });
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
  }, [gameCode, currentIndex]);

  const usernames = Array.from(frameMap.keys());
  const currentUsername = usernames[currentIndex];
  const currentFrame = frameMap.get(currentUsername);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % usernames.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + usernames.length) % usernames.length);
  };

  console.log("🎯 Current Index:", currentIndex);
  console.log("🎥 Current Username:", currentUsername);
  console.log("🖼️ FrameMap:", frameMap);

  return (
    <div
      style={{
        backgroundColor: "#000",
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        {currentUsername
          ? `Viewing: ${currentUsername}`
          : "Waiting for player streams..."}
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
