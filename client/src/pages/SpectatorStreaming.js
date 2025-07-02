import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function SpectatorStreaming() {
  const [frames, setFrames] = useState([]); // Array of { username, frame }
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);

  const location = useLocation();
  const { gameCode } = location.state || {};

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

      console.log("THIS IS THE DATA BEING RECEIVED" + data);
      console.log("THIS IS THE DATA BEING RECEIVED" + data.frames);
      console.log(
        "THIS IS THE DATA BEING RECEIVED within frames" +
          data.frames.username +
          " " +
          data.frames.frame
      );

      if (data.type === "cameraFramesBatch" && Array.isArray(data.frames)) {
        setFrames(data.frames); // replaces the whole frame list each time
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

  const current = frames[currentIndex];

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
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        {current
          ? `Viewing: ${current.username}`
          : "Waiting for player streams..."}
      </h2>

      {current?.frame && (
        <img
          src={current.frame}
          alt={`Live stream from ${current.username}`}
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
          <button
            onClick={goToPrev}
            style={{
              fontSize: "24px",
              padding: "12px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#1f2937",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            ← Previous
          </button>
          <button
            onClick={goToNext}
            style={{
              fontSize: "24px",
              padding: "12px 20px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#1f2937",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
