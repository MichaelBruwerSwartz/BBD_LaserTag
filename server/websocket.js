const http = require("http");
const WebSocket = require("ws");
const { randomUUID } = require("crypto");
const { parse } = require("url");
const appData = require("./app-data");

const PORT = 4000;

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/*
    Kill messages e.g. player1 killed player2
    Leaderboard updates
*/

function sendToClients(session, message, players, spectators) {
  console.log("send to clients");
  if (players)
    for (let username in session.players) {
      const player = session.players[username];
      player.connection.send(message);
    }
  if (spectators) {
    console.log("send to spectators");
    for (let id in session.spectators) {
      console.log("sending to spectator", id);
      session.spectators[id].send(message);
    }
  }
}

function getPlayerList(session) {
  return Object.keys(session.players);
}

// player: /session/:id
// spectator: /session/:id/spectator
wss.on("connection", (ws, req) => {
  const { pathname, query } = parse(req.url, true);
  const pathnameParts = pathname.split("/");

  if (pathnameParts.length < 3 || pathnameParts[1] !== "session") {
    ws.close(1000, "Invalid session URL");
    return;
  }

  const isSpectator =
    pathnameParts.length === 4 && pathnameParts[3] === "spectator";
  const sessionId = pathnameParts[2];
  let session = appData.sessions[sessionId];

  if (isSpectator) {
    // spectators do not have usernames
    const id = randomUUID();
    console.log(typeof id);

    if (session == null) {
      ws.close(1000, "Session does not exist");
      return;
    }

    // add spectator to session
    session.spectators[id] = ws;
    console.log("spectators: ", session.spectators);
  } else {
    const { username } = query;

    if (!username || username.trim() === "") {
      ws.close(1000, "Username is required");
      return;
    }

    console.info(
      `Client connected to session ${sessionId}, username: ${username}`
    );

    if (session == null) {
      // create a new session if it doesn't exist
      session = appData.createSession(sessionId, username);
      console.info(
        `Created new session with ID ${sessionId} for user ${username}`
      );
    } else {
      // Generate a new username if it already exists in the session
      while (Object.keys(session.players).includes(username)) {
        const randomSuffix = Math.floor(Math.random() * 10);
        username += randomSuffix;
      }
    }

    // add player to session
    session.players[username] = {
      connection: ws,
    };

    // send player joined message
    sendToClients(
      session,
      JSON.stringify({
        type: "playerJoined",
        username,
      }),
      true,
      true
    );
    sendToClients(
      session,
      JSON.stringify({
        type: "playerListUpdate",
        playerList: getPlayerList(session),
      }),
      true,
      true
    );

    ws.on("message", (message) => {
      try {
        message = JSON.parse(message);
      } catch (error) {
        console.error(
          `Error processing message from client ${username}:`,
          error
        );
        return;
      }

      console.info(`Received message from client ${username}:`, message);
    });

    ws.on("close", () => {
      // check if should close session
      if (Object.keys(session.players).length === 1) {
        delete appData.sessions[sessionId];
        console.info(`Session ${sessionId} closed`);
        return;
      }

      // remove player from session
      delete session.players[username];

      // send player quit message
      sendToClients(
        session,
        JSON.stringify({
          type: "playerQuit",
          username,
        }),
        true,
        true
      );
      sendToClients(
        session,
        JSON.stringify({
          type: "playerListUpdate",
          playerList: getPlayerList(session),
        }),
        true,
        true
      );

      // check if admin left
      if (session.admin === username) {
        let newAdminUsername = Object.keys(session.players)[0]; // pick new admin
        session.admin = newAdminUsername;

        sendToClients(
          session,
          JSON.stringify({
            type: "adminChanged",
            username: newAdminUsername,
          }),
          true,
          true
        );
      }
    });
  }
});

function startWebocket() {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
  });
}

module.exports = startWebocket;
