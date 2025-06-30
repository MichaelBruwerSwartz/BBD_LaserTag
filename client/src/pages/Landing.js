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
    <Link to="/spectator_lobby" />;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        padding: "1rem",
      }}
    >
      <h1 style={{ marginBottom: "1rem" }}>Enter Code:</h1>
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
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      />
      <h1 style={{ marginBottom: "1rem" }}>Enter Username:</h1>
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
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      />

      <div style={{ display: "flex", gap: "1rem" }}>
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
          }}
        >
          Join as Player
        </button>

        <button
          onClick={() => joinSpectatorLobby}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            borderRadius: "5px",
            backgroundColor: "#888",
            border: "none",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          Join as Spectator
        </button>
      </div>
    </div>
  );
}
