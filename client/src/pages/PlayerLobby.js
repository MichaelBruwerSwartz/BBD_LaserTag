import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const colorMap = {
  red: "red",
  orange: "orange",
  yellow: "yellow",
  green: "green",
  blue: "blue",
  pink: "pink",
  purple: "purple",
};

export default function PlayerLobby() {
  const [players, setPlayers] = useState([]);
  const [adminUsername, setAdminUsername] = useState("");
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state ?? {};
  const navigate = useNavigate();

  useEffect(() => {
    if (!gameCode || !username) return;
    if (socketRef.current) return;

    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}?username=${username}`
    );
    socketRef.current = socket;

    console.log("WebSocket initialized", socket);

    let navigatingToSpectator = false;

    socket.onmessage = (event) => {
      if (navigatingToSpectator) return;

      const data = JSON.parse(event.data);
      console.log("Message received:", data);

      if (data.type === "playerListUpdate") {
        console.log("THIS IS THE PLAYERLIST", data.playerList);
        setPlayers(data.playerList);
        setAdminUsername(data.admin);
      } else if (data.type === "startGame") {
        const currentPlayer = data.playerList.find(
          (p) => p.username === username
        );

        navigate("/camera_view", {
          state: {
            username,
            gameCode,
            color: currentPlayer?.codeId,
          },
        });
      } else if (data.type === "gameUpdate") {
        // if this is received, it means the game has started -> navigate to spectator view
        navigatingToSpectator = true;
        alert(
          "The game has already started, you will be taken to the spectator view."
        );
        navigate("/spectator_lobby", {
          state: { gameCode },
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
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundColor: "#0f0f0f",
        minHeight: "100vh",
        color: "#ffffff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h1
          style={{
            fontSize: "2rem",
            margin: "0 0 0.5rem 0",
            fontWeight: "600",
          }}
        >
          Game Code: <span style={{ color: "#3b82f6" }}>{gameCode}</span>
        </h1>
        <h2
          style={{
            fontSize: "1.25rem",
            margin: "0",
            fontWeight: "400",
            color: "#d1d5db",
          }}
        >
          You are:{" "}
          <span style={{ color: "#3b82f6", fontWeight: "500" }}>
            {username}
          </span>
        </h2>
      </div>

      <div style={{ width: "100%", maxWidth: "500px" }}>
        <h3
          style={{
            fontSize: "1.25rem",
            marginBottom: "1rem",
            textAlign: "center",
            fontWeight: "500",
            color: "#f3f4f6",
          }}
        >
          Players in Lobby
        </h3>

        {players.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {players.map(({ username: playerName, color }) => (
              <li
                key={playerName}
                style={{
                  backgroundColor: colorMap[color],
                  color: "#ffffff",
                  padding: "1rem 1.25rem",
                  borderRadius: "12px",
                  fontWeight: playerName === username ? "600" : "400",
                  border:
                    playerName === username
                      ? "2px solid gray"
                      : "1px solid #4b5563",
                  textAlign: "center",
                  fontSize: "1rem",
                  boxShadow:
                    playerName === username
                      ? "0 0 0 1px rgba(59, 130, 246, 0.3)"
                      : "none",
                  transition: "all 0.2s ease",
                }}
              >
                {playerName}
                {playerName === adminUsername && (
                  <span
                    style={{
                      marginLeft: "0.5rem",
                      fontSize: "1.1em",
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))",
                    }}
                  >
                    👑
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p
            style={{
              color: "#9ca3af",
              textAlign: "center",
              fontSize: "1rem",
              fontStyle: "italic",
            }}
          >
            Loading players...
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <button
          onClick={() => navigate("/", { state: { username, gameCode } })}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#6b7280",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "500",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#4b5563")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#6b7280")}
        >
          Back
        </button>

        {adminUsername === username && (
          <button
            style={{
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: "600",
              borderRadius: "8px",
              backgroundColor: "#10b981",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = "#059669";
              e.target.style.boxShadow = "0 4px 8px rgba(16, 185, 129, 0.3)";
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = "#10b981";
              e.target.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)";
            }}
            onClick={() => {
              handleStartGame();
            }}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}
