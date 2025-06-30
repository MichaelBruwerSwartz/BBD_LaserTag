const sessions = {}
// sessions will be automatically removed when all player websocket connections have been closed

function getUniqueSessionId() {
    for (let i = 0; true; i++) {
        if (!sessions[i]) {
            return i
        }
    }
}

const exampleSession = {
    id: 1,
    admin: 'cable',
    players: {
        'cable': {
            connection: null, // websocket connection
            score: 0
        }
    },
    spectators: {
        'id': 'websocket connection'
    }
}

function createSession(id, adminUsername) {
    const session = {
        id,
        admin: adminUsername,
        players: {},
        spectators: {}
    }
    sessions[id] = session
    return session
}

function isSessionValid(sessionId) {
    return sessions[sessionId] !== undefined
}

module.exports = {
    createSession,
    isSessionValid,
    sessions,
    getUniqueSessionId
}