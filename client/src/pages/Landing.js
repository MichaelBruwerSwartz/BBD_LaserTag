import { Link } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [gameCode, setGameCode] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const joinPlayerLobby = () => {
    navigate("/player_lobby", {
      state: {
        gameCode,
        username,
      },
    });
  };

  const joinSpectatorLobby = () => {
    navigate("/spectator_lobby", {
      state: {
        gameCode,
        username,
      },
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        position: "relative",
        padding: 0,
        margin: 0,
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          objectFit: "cover",
          zIndex: -1,
        }}
      >
        <source src="/images/laser-tag-landing.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Logo Section */}
      <div
        style={{
          height: "50vh", // Increased to make logo larger (adjust as needed)
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "1rem",
          zIndex: 1,
        }}
      >
        <img
          src="/images/Laser-Tag.png"
          alt="Game Logo"
          style={{
            maxHeight: "100%", // Scales to fit the 50vh container
            maxWidth: "90%", // Limits width to prevent overflow
            objectFit: "contain", // Preserves aspect ratio
          }}
        />
      </div>

      {/* Content Container */}
      <div
        style={{
          backgroundColor: "rgba(26, 26, 26, 0.8)",
          padding: "1.5rem",
          borderRadius: "10px",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          textAlign: "center",
          zIndex: 1,
          maxHeight: "40vh", // Adjusted to fit with larger logo within 100vh
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <h1 style={{ marginBottom: "0.5rem", color: "#fff" }}>Enter Code:</h1>
        <input
          type="text"
          value={gameCode}
          onChange={(e) => setGameCode(e.target.value)}
          placeholder="Game Code"
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            borderRadius: "5px",
            border: "none",
            marginBottom: "0.75rem",
            textAlign: "center",
            backgroundColor: "#333",
            color: "#fff",
            outline: "none",
          }}
        />
        <h1 style={{ marginBottom: "0.5rem", color: "#fff" }}>
          Enter Username:
        </h1>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            borderRadius: "5px",
            border: "none",
            marginBottom: "0.75rem",
            textAlign: "center",
            backgroundColor: "#333",
            color: "#fff",
            outline: "none",
          }}
        />

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => joinPlayerLobby()}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "5px",
              backgroundColor: "#00bfff",
              border: "none",
              cursor: "pointer",
              color: "#fff",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#00aaff")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#00bfff")}
          >
            Join as Player
          </button>

          <button
            onClick={() => joinSpectatorLobby()}
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "5px",
              backgroundColor: "#888",
              border: "none",
              cursor: "pointer",
              color: "#fff",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = "#666")}
            onMouseOut={(e) => (e.target.style.backgroundColor = "#888")}
          >
            Join as Spectator
          </button>
        </div>
      </div>
    </div>
  );
}
