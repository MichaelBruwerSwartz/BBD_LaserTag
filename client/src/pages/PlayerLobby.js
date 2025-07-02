import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const colorMap = {
  red: [255, 138, 154], // Soft Rose Red
  green: [197, 225, 165], // Pastel Mint Green
  blue: [144, 202, 249], // Baby Blue
  yellow: [255, 224, 130], // Light Buttercup
  purple: [206, 147, 216], // Lavender Mist
  cyan: [178, 235, 242], // Soft Ice Blue
  orange: [255, 183, 77], // Creamsicle Orange
  pink: [248, 187, 208], // Bubblegum Light
  lime: [220, 255, 150], // Spring Lime
  navy: [128, 179, 255], // Soft Sky Navy
};

export default function PlayerLobby() {
  const [players, setPlayers] = useState([]);
  const [adminUsername, setAdminUsername] = useState("");
  const socketRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectTimeoutRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username, color } = state || {};
  const navigate = useNavigate();

  useEffect(() => {
    // Early return if required data is missing
    if (!gameCode || !username || !color) {
      console.warn("❌ Missing required data:", { gameCode, username, color });
      return;
    }

    function connectWebSocket() {
      // Don't create multiple connections
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        console.log("🔗 WebSocket already connected, skipping...");
        return;
      }

      console.log(
        `🔄 Connecting to WebSocket (attempt ${reconnectAttempts.current + 1})`
      );

      const socket = new WebSocket(
        `wss://bbd-lasertag.onrender.com/session/${gameCode}?username=${username}&color=${color}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("🔗 PlayerLobby WebSocket connected");
        reconnectAttempts.current = 0; // Reset on successful connection
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 PlayerLobby message received:", data);

          if (data.type === "playerListUpdate") {
            console.log("👥 Player list update:", data.playerList);
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
        } catch (error) {
          console.error("❌ Error parsing WebSocket message:", error);
        }
      };

      socket.onclose = (event) => {
        console.log(
          `🔌 PlayerLobby WebSocket closed. Code: ${event.code}, Reason: "${event.reason}", WasClean: ${event.wasClean}`
        );

        // Only attempt reconnection for unexpected closures
        if (
          event.code !== 1000 &&
          event.code !== 1001 &&
          reconnectAttempts.current < maxReconnectAttempts
        ) {
          reconnectAttempts.current++;
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttempts.current),
            10000
          );
          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error("❌ Max reconnection attempts reached for PlayerLobby");
          alert("Connection lost. Please refresh the page.");
        }
      };

      socket.onerror = (error) => {
        console.error("❌ PlayerLobby WebSocket error:", error);
      };
    }

    connectWebSocket();

    return () => {
      console.log("🧹 PlayerLobby cleanup - closing WebSocket");

      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket with normal closure code
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounting");
        socketRef.current = null;
      }
    };
  }, [gameCode, username, color, navigate]); // ✅ Include ALL dependencies

  const handleStartGame = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log("🎮 Starting game...");
      socketRef.current.send(
        JSON.stringify({
          type: "startGame",
          gameCode,
        })
      );
    } else {
      console.warn("⚠️ Cannot start game - WebSocket not connected");
      alert("Connection lost. Please refresh the page.");
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
          onClick={handleStartGame}
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
