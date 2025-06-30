import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function PlayerLobby() {
  const [players, setPlayers] = useState([]);
  const socketRef = useRef(null);

  const { state } = useLocation();
  const { gameCode, username } = state || {};

  useEffect(() => {
    const socket = new WebSocket(
      `ws://localhost:4000/session/${gameCode}?username=${username}`
    );
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "playerListUpdate") {
        setPlayers(data.playerList);
      }
    };

    return () => {
      socket.close();
    };
  }, [gameCode, username]);

  return (
    <div style={{ padding: "1rem", color: "white" }}>
      <h1>Game Code: {gameCode}</h1>
      <h2>Players in Lobby:</h2>
      {players.length > 0 ? (
        <ul>
          {players.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      ) : (
        <p>No players yet...</p>
      )}
    </div>
  );
}
