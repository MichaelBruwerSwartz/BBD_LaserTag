import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function SpectatorStreaming() {
  const [frames, setFrames] = useState([]); // Array of { username, frame }
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);

  const location = useLocation();
  const { gameCode } = location.state || {};

  // Connect to WebSocket as spectator
  useEffect(() => {
    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}/spectator`
    );
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("Connected as spectator to session:", gameCode);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "cameraFramesBatch" && Array.isArray(data.frames)) {
        console.log("Received frames:", data.frames);
        setFrames(data.frames);

        // Reset current index if current player is gone
        if (
          frames.length > 0 &&
          !data.frames.find(
            (f) => f.username === frames[currentIndex]?.username
          )
        ) {
          setCurrentIndex(0);
        }
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = () => {
      console.log("Spectator WebSocket closed.");
    };

    return () => {
      socket.close();
    };
  }, [gameCode]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % frames.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + frames.length) % frames.length);
  };

  const currentFrame = frames[currentIndex];
  console.log("Current Frame" + currentFrame);

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
        {currentFrame
          ? `Viewing: ${currentFrame.username}`
          : "Waiting for player streams..."}
      </h2>

      {currentFrame && (
        <img
          src={currentFrame.frame}
          alt={`Live stream from ${currentFrame.username}`}
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

      {frames.length > 1 && (
        <div style={{ marginTop: "20px", display: "flex", gap: "40px" }}>
          <button onClick={goToPrev} style={buttonStyle}>
            ⬅️ Previous
          </button>
          <button onClick={goToNext} style={buttonStyle}>
            Next ➡️
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
