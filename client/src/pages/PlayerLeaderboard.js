import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PlayerLeaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state || { gameCode: "123", username: "" }; // Default gameCode to "123"
  const navigate = useNavigate();

  useEffect(() => {
    // Use the correct WebSocket URL for post-game data (optional, for future backend integration)
    const socket = new WebSocket(`ws://localhost:4000/session/${gameCode}/postgame`);
    socketRef.current = socket;

    // Static dummy data for post-game leaderboard
    const dummyPlayerList = [
      { name: "Player1" },
      { name: "Player2" },
      { name: "Player3" },
    ];
    setPlayers(dummyPlayerList);

    // Set initial post-game stats
    setTimeout(() => {
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) => ({
          ...player,
          hitsToOthers: Math.floor(Math.random() * 20),
          timesHit: Math.floor(Math.random() * 15),
          overallPoints: Math.floor(Math.random() * 100),
        }))
      );
    }, 1000);

    socket.onmessage = (event) => {
      console.log("Message received:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === "postGameStatsUpdate") {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => {
            const stats = data.stats[player.name] || {};
            return {
              ...player,
              hitsToOthers: stats.hitsToOthers || 0,
              timesHit: stats.timesHit || 0,
              overallPoints: stats.overallPoints || 0,
            };
          })
        );
      }
    };

    socket.onopen = () => {
      console.log("Post-game WebSocket connected");
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("Post-game WebSocket disconnected");
    };

    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      socket.close();
      clearInterval(timeInterval);
    };
  }, [gameCode]);

  const goBackToLanding = () => {
    navigate("/");
  };

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
          width: "100%",
          padding: "0.5rem",
          backgroundColor: "#4b0082",
          textAlign: "center",
        }}
      >
        <p>Time: {currentTime.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
      </div>
      <div
        style={{
          padding: "1rem",
          width: "100%",
          maxWidth: "64rem",
        }}
      >
        {players.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Header Row */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                alignItems: "center",
                backgroundColor: "#4682b4",
                color: "#fff",
                padding: "0.5rem",
                borderRadius: "20px 20px 0 0",
                fontWeight: "bold",
              }}
            >
              <span>Ranking</span>
              <span>Player Name</span>
              <span>Hits to Others</span>
              <span>Times Hit</span>
              <span>Overall Points</span>
            </div>
            {/* Data Rows */}
            {players
              .map((player) => ({
                ...player,
                overallPoints: player.overallPoints || 0,
              }))
              .sort((a, b) => b.overallPoints - a.overallPoints)
              .map((player, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
                    alignItems: "center",
                    backgroundColor: "#87ceeb",
                    color: "#000",
                    padding: "0.5rem",
                    borderRadius: "20px 20px 20px 0",
                  }}
                >
                  <span>{index + 1}</span>
                  <span style={{ fontWeight: "bold" }}>{player.name}</span>
                  <span>{player.hitsToOthers}</span>
                  <span>{player.timesHit}</span>
                  <span>{player.overallPoints}</span>
                </div>
              ))}
          </div>
        ) : (
          <p style={{ textAlign: "center" }}>No leaderboard data yet...</p>
        )}
      </div>
      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={goBackToLanding}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            borderRadius: "5px",
            backgroundColor: "#800080",
            border: "none",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default PlayerLeaderboard;