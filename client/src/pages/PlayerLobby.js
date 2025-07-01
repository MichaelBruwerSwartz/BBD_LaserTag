import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function PlayerLobby() {
  const [players, setPlayers] = useState([]);
  const [adminUsername, setAdminUsername] = useState("");
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state || {};

  const navigate = useNavigate();

  useEffect(() => {
    if (!gameCode || !username) return;

    if (socketRef.current) return;
    console.log(gameCode);
    console.log(username);

    const socket = new WebSocket(
      `ws://localhost:5005/session/${gameCode}?username=${username}`
    );
    socketRef.current = socket;

    console.log("WebSocket initialized", socket);

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "playerListUpdate") {
        setPlayers(data.playerList);
        setAdminUsername(data.admin);
      }
      if (data.type === "startGame") {
        navigate("/camera_view", {
          state: {
            username,
          },
        });
      }
    };

    socket.onclose = () => console.log("WebSocket closed");

    socket.onerror = (e) => console.error("WebSocket error", e);

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [gameCode, username, navigate]);

  const handleStartGame = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "startGame",
          gameCode,
        })
      );
    }
    navigate("/camera_view", {
      state: {
        username,
      },
    });
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#121212",
        minHeight: "100vh",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
        Game Code: <span style={{ color: "#00bfff" }}>{gameCode}</span>
      </h1>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
        You are: <span style={{ color: "#00bfff" }}>{username}</span>
      </h1>

      <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Players in Lobby:
      </h2>

      {players.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            width: "100%",
            maxWidth: "400px",
          }}
        >
          {players.map(({ username: playerName, color }) => (
            <li
              key={playerName}
              style={{
                backgroundColor: color || "#ddd",
                color: "white",
                padding: "0.75rem 1rem",
                marginBottom: "0.5rem",
                borderRadius: "8px",
                fontWeight: playerName === username ? "bold" : "normal",
                border:
                  playerName === username ? "2px solid #000" : "1px solid #444",
                textAlign: "center",
              }}
            >
              {playerName}
              {playerName === adminUsername && (
                <span style={{ marginLeft: "0.5rem", fontWeight: "bold" }}>
                  👑
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#888" }}>No players yet...</p>
      )}
      {adminUsername === username && (
        <button
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            borderRadius: "5px",
            backgroundColor: "#00ff88",
            border: "none",
            cursor: "pointer",
            color: "#000",
            fontWeight: "bold",
          }}
          onClick={() => {
            console.log("Game start triggered by admin");
            handleStartGame();
          }}
        >
          Start Game
        </button>
      )}
    </div>
  );
}
