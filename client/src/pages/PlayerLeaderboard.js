import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const dataExample = [ // columns: position, name, points, hitsGiven, hitsTaken
  {
    username: 'player1',
    color: 'red',
    points: 50,
    hitsGiven: 1,
    hitsTaken: 1,
  }
]

const PlayerLeaderboard = () => {
  const [players, setPlayers] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state || { gameCode: "123", username: "" }; // Default gameCode to "123"
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize players from state if available, otherwise use dummy data
    if (state?.players) {
      setPlayers(state.players);
    } else {
      const dummyPlayers = [
        { username: 'player1', color: 'red', points: 50, hitsGiven: 5, hitsTaken: 2 },
        { username: 'player2', color: 'blue', points: 75, hitsGiven: 8, hitsTaken: 3 },
        { username: 'player3', color: 'green', points: 30, hitsGiven: 3, hitsTaken: 5 },
      ];
      setPlayers(dummyPlayers);
    }

    // Use the correct WebSocket URL for post-game data (optional, for future backend integration)
    const socket = new WebSocket(`wss://bbd-lasertag.onrender.com/session/${gameCode}/postgame`);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      console.log("Message received:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === "postGameStatsUpdate") {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => {
            const stats = data.stats[player.username] || {};
            return {
              ...player,
              points: stats.points || player.points || 0,
              hitsGiven: stats.hitsGiven || player.hitsGiven || 0,
              hitsTaken: stats.hitsTaken || player.hitsTaken || 0,
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
  }, [gameCode, state]);

  const goBackToLanding = () => {
    navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100vh",
        backgroundImage: "url('/images/Laser-Tag-Lobby.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "0.5rem",
          backgroundColor: "#4b0082",
          textAlign: "center",
          position: "relative",
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src="/images/Laser-Tag.png"
          alt="Logo"
          style={{
            width: "100px",
            height: "auto",
            marginRight: "1rem",
          }}
        />
        <p>Time: {currentTime.toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</p>
      </div>
      <div
        style={{
          padding: "1rem",
          width: "100%",
          maxWidth: "64rem",
          position: "relative",
          zIndex: "5",
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
              <span>Hits Given</span>
              <span>Hits Taken</span>
              <span>Points</span>
            </div>
            {/* Data Rows */}
            {players
              .map((player) => ({
                ...player,
                points: player.points || 0,
              }))
              .sort((a, b) => b.points - a.points)
              .map((player, index) => (
                <div
                  key={player.username}
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
                  <span style={{ fontWeight: "bold" }}>{player.username}</span>
                  <span>{player.hitsGiven}</span>
                  <span>{player.hitsTaken}</span>
                  <span>{player.points}</span>
                </div>
              ))}
          </div>
        ) : (
          <p style={{ textAlign: "center" }}>No leaderboard data yet...</p>
        )}
      </div>
      <div style={{ marginTop: "1rem", position: "relative", zIndex: 5 }}>
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