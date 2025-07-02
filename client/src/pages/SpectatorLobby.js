import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

const SpectatorLobby = () => {
  const [players, setPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState("Players");
  const [currentTime, setCurrentTime] = useState(new Date());
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state || { gameCode: "123", username: "" };

  const weapons = ["Pistol", "Rifle", "Shotgun", "Sniper", "SMG"];

  useEffect(() => {
    const socket = new WebSocket(
      `wss://bbd-lasertag.onrender.com/session/${gameCode}/spectator`
    );
    socketRef.current = socket;

    const dummyPlayerList = [
      { name: "Player1" },
      { name: "Player2" },
      { name: "Player3" },
    ];
    setPlayers(dummyPlayerList);

    setTimeout(() => {
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) => ({
          ...player,
          points: Math.floor(Math.random() * 100),
          weapon: weapons[Math.floor(Math.random() * weapons.length)],
          increaseDamage: Math.random() > 0.5,
          unlimitedBullets: Math.random() > 0.7,
          zoom: Math.random() > 0.6,
          grenade: Math.floor(Math.random() * 3),
        }))
      );
    }, 1000);

    const refreshInterval = setInterval(() => {
      setPlayers((prevPlayers) =>
        prevPlayers.map((player) => {
          const boosts = {
            increaseDamage: Math.random() > 0.5,
            unlimitedBullets: Math.random() > 0.7,
            zoom: Math.random() > 0.6,
            grenade: Math.floor(Math.random() * 3),
          };
          const activeBoost = boosts.increaseDamage
            ? "Increase Damage"
            : boosts.unlimitedBullets
            ? "Unlimited Bullets"
            : boosts.zoom
            ? "Zoom"
            : boosts.grenade > 0
            ? `Grenade (${boosts.grenade})`
            : "None";
          return {
            ...player,
            points: Math.floor(Math.random() * 100),
            weapon: weapons[Math.floor(Math.random() * weapons.length)],
            ...boosts,
            activeBoost,
          };
        })
      );
      setCurrentTime(new Date());
    }, 5000);

    socket.onmessage = (event) => {
      console.log("Message received:", event.data);
      const data = JSON.parse(event.data);
      if (data.type === "playerListUpdate") {
        setPlayers(data.playerList.map((name) => ({ name })));
      } else if (data.type === "playerStatsUpdate") {
        setPlayers((prevPlayers) =>
          prevPlayers.map((player) => {
            const stats = data.stats[player.name] || {};
            const boosts = {
              increaseDamage: stats.increaseDamage || false,
              unlimitedBullets: stats.unlimitedBullets || false,
              zoom: stats.zoom || false,
              grenade: stats.grenade || 0,
            };
            const activeBoost = boosts.increaseDamage
              ? "Increase Damage"
              : boosts.unlimitedBullets
              ? "Unlimited Bullets"
              : boosts.zoom
              ? "Zoom"
              : boosts.grenade > 0
              ? `Grenade (${boosts.grenade})`
              : "None";
            return {
              ...player,
              points: stats.points || 0,
              weapon: stats.weapon || "Pistol",
              ...boosts,
              activeBoost,
            };
          })
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

    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      socket.close();
      clearInterval(refreshInterval);
      clearInterval(timeInterval);
    };
  }, [gameCode]);

  const handleShuffle = () => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) => ({
        ...player,
        weapon: weapons[Math.floor(Math.random() * weapons.length)],
      }))
    );
  };

  const handleBoost = () => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) => {
        const boosts = {
          increaseDamage: false,
          unlimitedBullets: false,
          zoom: false,
          grenade: 0,
        };
        const activeBoosts = [
          player.increaseDamage,
          player.unlimitedBullets,
          player.zoom,
          player.grenade > 0,
        ].filter(Boolean).length;

        if (activeBoosts === 0) {
          const boostType = ["increaseDamage", "unlimitedBullets", "zoom"][
            Math.floor(Math.random() * 3)
          ];
          boosts[boostType] = true;
          boosts.grenade = Math.floor(Math.random() * 3);
        } else {
          const availableBoosts = [
            "increaseDamage",
            "unlimitedBullets",
            "zoom",
          ].filter(
            (b) =>
              b !==
              (player.increaseDamage
                ? "increaseDamage"
                : player.unlimitedBullets
                ? "unlimitedBullets"
                : player.zoom
                ? "zoom"
                : "")
          );
          const newBoost =
            availableBoosts[Math.floor(Math.random() * availableBoosts.length)];
          boosts[newBoost] = true;
          boosts.grenade = Math.floor(Math.random() * 3);
        }

        const activeBoost = boosts.increaseDamage
          ? "Increase Damage"
          : boosts.unlimitedBullets
          ? "Unlimited Bullets"
          : boosts.zoom
          ? "Zoom"
          : boosts.grenade > 0
          ? `Grenade (${boosts.grenade})`
          : "None";

        return {
          ...player,
          ...boosts,
          activeBoost,
        };
      })
    );
  };

  const handleBackToLanding = () => {
    window.location.href = "/"; // Replace with your actual landing page route
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100%",
        width: "100vw",
        backgroundImage: "url('/images/laser-tag-landing.gif')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      {/* Top division with larger logo image */}
      <div
        style={{
          width: "100%",
          padding: "1rem",
          backgroundColor: "#4b0082",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src="/images/Laser-Tag.png"
          alt="Game Logo"
          style={{
            maxWidth: "300px",
            maxHeight: "100px",
            objectFit: "contain",
          }}
        />
      </div>
      <div
        style={{
          width: "100%",
          padding: "0.5rem",
          backgroundColor: "#4b0082",
          textAlign: "center",
        }}
      >
        <p>
          Time:{" "}
          {currentTime.toLocaleString("en-ZA", {
            timeZone: "Africa/Johannesburg",
          })}
        </p>
      </div>
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
            backgroundColor:
              activeTab === "Leaderboard" ? "#4b0082" : "#6a0dad",
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
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            padding: "1rem",
            width: "100%",
            maxWidth: "64rem",
            flexGrow: 1,
            overflowY: "auto",
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
            <p style={{ textAlign: "center" }}>No players yet...</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
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
                onClick={handleShuffle}
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
                onClick={handleBoost}
              >
                Boost
              </button>
            </div>
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
              onClick={handleBackToLanding}
            >
              Back to Landing
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "1rem",
            width: "100%",
            maxWidth: "64rem",
            flexGrow: 1,
            overflowY: "auto",
          }}
        >
          {players.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  alignItems: "center",
                  backgroundColor: "#4682b4",
                  color: "#fff",
                  padding: "0.5rem",
                  borderRadius: "20px 20px 0 0",
                  fontWeight: "bold",
                }}
              >
                <span>Player Name</span>
                <span>Points</span>
                <span>Active Boost</span>
                <span>Weapon</span>
              </div>
              {players
                .map((player) => ({
                  ...player,
                  points: player.points || 0,
                }))
                .sort((a, b) => b.points - a.points)
                .map((player, index) => (
                  <div
                    key={index}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      alignItems: "center",
                      backgroundColor: "#87ceeb",
                      color: "#000",
                      padding: "0.5rem",
                      borderRadius: "20px 20px 20px 0",
                    }}
                  >
                    <span style={{ fontWeight: "bold" }}>{player.name}</span>
                    <span>{player.points}</span>
                    <span>{player.activeBoost}</span>
                    <span>{player.weapon}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p style={{ textAlign: "center" }}>No leaderboard data yet...</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem" }}>
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
                onClick={handleShuffle}
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
                onClick={handleBoost}
              >
                Boost
              </button>
            </div>
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
              onClick={handleBackToLanding}
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpectatorLobby;