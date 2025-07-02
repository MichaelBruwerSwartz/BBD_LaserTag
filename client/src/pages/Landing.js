import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function LandingPage() {
  const [gameCode, setGameCode] = useState("");
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const { state } = useLocation();

  useEffect(() => {
    if (state) {
      setGameCode(state.gameCode || "");
      setUsername(state.username || "");
    }
  }, [state]);

  const goToCalibration = () => {
    navigate("/calibration", {
      state: {
        gameCode,
      },
    });
  };

  const joinSpectatorStreaming = () => {
    navigate("/spectator_stream", {
      state: {
        gameCode,
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
      {/* GIF Background */}
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
          zIndex: -1,
        }}
      />

      {/* Logo Section */}
      <div
        style={{
          height: "35vh", // Reduced from 40vh for balance
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "0",
          marginTop: "-5vh", // Moves logo higher
          zIndex: 1,
        }}
      >
        <img
          src="/images/Laser-Tag.png"
          alt="Game Logo"
          style={{
            maxHeight: "90%",
            maxWidth: "90%",
            objectFit: "contain",
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
          maxHeight: "50vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "-5vh", // Adjusted to match new logo height
        }}
      >
        <h1 style={{ marginBottom: "0.5rem", color: "#fff" }}>Enter Code:</h1>
        <input
          type="text"
          value={gameCode}
          onChange={(e) =>
            setGameCode(
              e.target.value.replace(/[^a-zA-Z]/g, "").toLocaleLowerCase()
            )
          }
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

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button
            onClick={() => goToCalibration()}
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
            onClick={() => joinSpectatorStreaming()}
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
            Join as spectator
          </button>
        </div>
      </div>
    </div>
  );
}
