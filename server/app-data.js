SESSION_PERSIST_TIME = 10;

const sessions = {};
// sessions will be automatically removed when all player websocket connections have been closed

function getUniqueSessionId() {
  for (let i = 0; true; i++) {
    if (!sessions[i]) {
      return i;
    }
  }
}

const exampleSession = {
  id: 1,
  state: "lobby", // lobby, game, finished
  admin: "cable",
  timeLeft: 60, // seconds
  persistTime: 10, // seconds until session is closed
  players: {
    cable: {
      connection: null, // websocket connection
      username: "cable",
      color,
      points: 0,
      hitsGiven: 0,
      hitsReceived: 0,
    },
  },
  spectators: {
    id: "websocket connection",
  },
};

function createSession(id, adminUsername) {
  const session = {
    id,
    state: "lobby",
    admin: adminUsername,
    persistTime: SESSION_PERSIST_TIME,
    players: {},
    spectators: {},
    latestFrames: {},
  };
  sessions[id] = session;
  return session;
}

function isSessionValid(sessionId) {
  return sessions[sessionId] !== undefined;
}

module.exports = {
  SESSION_PERSIST_TIME,
  createSession,
  isSessionValid,
  sessions,
  getUniqueSessionId,
};
