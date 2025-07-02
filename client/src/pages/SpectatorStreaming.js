import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function SpectatorStreaming() {
  const [playerStreams, setPlayerStreams] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const socketRef = useRef(null);

  const usernames = Object.keys(playerStreams);
  const currentUsername = usernames[currentIndex];

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

      if (data.type === "cameraFrame" && data.username && data.frame) {
        setPlayerStreams((prev) => ({
          ...prev,
          [data.username]: data.frame,
        }));
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
    setCurrentIndex((prev) => (prev + 1) % usernames.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + usernames.length) % usernames.length);
  };

  console.log(usernames);

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
        {usernames.length > 0
          ? `Viewing: ${currentUsername}`
          : "Waiting for player streams..."}
      </h2>

      {currentUsername && playerStreams[currentUsername] && (
        <img
          src={playerStreams[currentUsername]}
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

      {usernames.length === 1 && (
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
            GO TO PREVIOUS PLAYER
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
            GO TO NEXT PLAYER
          </button>
        </div>
      )}
    </div>
  );
}
