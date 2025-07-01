import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const SpectatorLobby = () => {
  const [players, setPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState("Players");
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state || { gameCode: "", username: "" };

  useEffect(() => {
    // Use the correct WebSocket URL for spectators
    const socket = new WebSocket(`ws://localhost:4000/session/${gameCode}/spectator`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "playerListUpdate") {
        setPlayers(data.playerList || []);
      } else if (data.type === "playerStatsUpdate") {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => ({
            ...player,
            points: data.stats[player.name]?.points || 0,
            deaths: data.stats[player.name]?.deaths || 0,
          }))
        );
      }
    };

    socket.onopen = () => {
      console.log("Spectator WebSocket connected");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Spectator WebSocket disconnected");
    };

    // Remove test data simulation since we’re using a real WebSocket
    // The server will handle the initial data

    return () => {
      socket.close();
    };
  }, [gameCode]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a1a",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          backgroundColor: "#4b0082",
        }}
      >
        <button
          style={{
            flex: 1,
            padding: "0.5rem",
            backgroundColor: activeTab === "Players" ? "#4b0082" : "#6a0dad",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          }}
          onClick={() => setActiveTab("Players")}
        >
          Players
        </button>
        <button
          style={{
            flex: 1,
            padding: "0.5rem",
            backgroundColor: activeTab === "Leaderboard" ? "#4b0082" : "#6a0dad",
            border: "none",
            color: "#fff",
            cursor: "pointer",
          }}
          onClick={() => setActiveTab("Leaderboard")}
        >
          Leaderboard
        </button>
      </div>

      {activeTab === "Players" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
            padding: "1rem",
            width: "100%",
            maxWidth: "64rem",
          }}
        >
          {players.length > 0 ? (
            players.map((player, index) => (
              <div
                key={index}
                style={{
                  position: "relative",
                  backgroundColor: "#4a4a4a",
                  border: "1px solid #666",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.25rem",
                    color: "#00ffff",
                    textAlign: "center",
                  }}
                >
                  {player.name}
                </h2>
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "75%",
                      height: "75%",
                      backgroundColor: "#333",
                      opacity: 0.5,
                    }}
                  ></div>
                  <svg
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                      viewBox: "0 0 100 100",
                    }}
                  >
                    <line
                      x1="10"
                      y1="90"
                      x2="90"
                      y2="10"
                      stroke={index % 2 === 0 ? "#ff69b4" : "#00ffff"}
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>
            ))
          ) : (
            <p style={{ textAlign: "center", gridColumn: "1 / -1" }}>
              No players yet...
            </p>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: "1rem",
            width: "100%",
            maxWidth: "64rem",
          }}
        >
          {players.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {players
                .map((player) => ({
                  ...player,
                  points: player.points || 0,
                  deaths: player.deaths || 0,
                }))
                .sort((a, b) => b.points - a.points)
                .map((player, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "#87ceeb",
                      color: "#000",
                      padding: "0.5rem",
                      borderRadius: "20px 20px 20px 0",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>{player.name}</span>
                    <span>{player.points}</span>
                    <span style={{ display: "flex", alignItems: "center" }}>
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        style={{ fill: "none", stroke: "red", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }}
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {player.deaths}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p style={{ textAlign: "center" }}>No leaderboard data yet...</p>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button
          style={{
            backgroundColor: "#800080",
            color: "#fff",
            fontWeight: "bold",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Shuffle
        </button>
        <button
          style={{
            backgroundColor: "#800080",
            color: "#fff",
            fontWeight: "bold",
            padding: "0.5rem 1rem",
            borderRadius: "9999px",
            border: "none",
            cursor: "pointer",
          }}
        >
          Boost
        </button>
      </div>
    </div>
  );
};

export default SpectatorLobby;