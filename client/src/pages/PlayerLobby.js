import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const colorMap = {
  red: "#FF8A9A", // Lighter Laser Cherry
  orange: "#FFB74D", // Softer Amber Neon
  yellow: "#FFE082", // Muted Amber Spark
  green: "#C5E1A5", // Softer Acid Green
  blue: "#90CAF9", // Lighter Laser Azure
  pink: "#F8BBD0", // Softer Bubblegum Light
  purple: "#CE93D8", // Muted Plasma Purple
};

export default function PlayerLobby() {
  const [players, setPlayers] = useState([]);
  const [adminUsername, setAdminUsername] = useState("");
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username, color } = state || {};
  const navigate = useNavigate();

  useEffect(() => {
    if (gameCode == null || username == null || color == null) return;
    if (socketRef.current) return;

    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}?username=${username}&color=${color}`
    );
    socketRef.current = socket;

    console.log("WebSocket initialized", socket);

    socket.onmessage = (event) => {
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
            codeId: currentPlayer?.codeId,
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
  };

  const goBackToHome = () => {
    navigate("/");
  };

  return (
    <div
      style={{
        padding: "2rem",
        backgroundImage: "url('/images/Laser-Tag-Lobby.png')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        minHeight: "100vh",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          textAlign: "center",
          paddingTop: "1rem",
          paddingBottom: "2rem",
        }}
      >
        <img
          src="/images/Laser-Tag.png"
          alt="Logo"
          style={{
            maxWidth: "300px",
            maxHeight: "120px",
            objectFit: "contain",
          }}
        />
      </div>
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
                background: `linear-gradient(135deg, ${
                  colorMap[color] || "#ddd"
                } 0%, ${
                  colorMap[color] || "#ddd"
                } 70%, rgba(255,255,255,0.1) 100%)`,
                color: "#333",
                padding: "1rem",
                marginBottom: "1.5rem",
                borderRadius: "20px",
                fontWeight: playerName === username ? "bold" : "normal",
                border: playerName === username ? "3px solid #000" : "none",
                textAlign: "center",
                boxShadow: "0 6px 15px rgba(0, 0, 0, 0.3)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                position: "relative",
                overflow: "visible",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-8px)";
                e.currentTarget.style.boxShadow =
                  "0 10px 20px rgba(0, 0, 0, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 6px 15px rgba(0, 0, 0, 0.3)";
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {playerName}
              </span>
              {playerName === adminUsername && (
                <img
                  src="/images/admin-crown(2).png"
                  alt="Admin Icon"
                  style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    verticalAlign: "middle",
                    width: "30px",
                    height: "30px",
                    zIndex: 2,
                  }}
                />
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
            backgroundColor: "#4B004B",
            border: "none",
            cursor: "pointer",
            color: "#FFFFFF",
            fontWeight: "bold",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
            position: "relative",
            animation: "float 3s ease-in-out infinite",
          }}
          onClick={() => {
            handleStartGame();
          }}
        >
          Start Game
        </button>
      )}
      <button
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          borderRadius: "5px",
          backgroundColor: "#800080",
          border: "none",
          cursor: "pointer",
          color: "#FFFFFF",
          fontWeight: "bold",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.3)",
          position: "relative",
        }}
        onClick={goBackToHome}
      >
        Back to Home
      </button>
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
