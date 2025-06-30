const http = require('http')
const WebSocket = require('ws')
const { parse } = require('url')
const appData = require('./app-data')

const PORT = 4000

const server = http.createServer()
const wss = new WebSocket.Server({ server })

/*
    Kill messages e.g. player1 killed player2
    Leaderboard updates
*/

function sendToPlayers(session, message) {
    for (let username in session.players) {
        const player = session.players[username]
        player.connection.send(message)
    }
}

wss.on('connection', (ws, req) => {
    const { pathname, query } = parse(req.url, true)
    const { username } = query
    const pathnameParts = pathname.split('/')

    if (pathnameParts.length < 3 || pathnameParts[1] !== 'session') {
        ws.close(1000, 'Invalid session URL')
        return
    }
    if (!username || username.trim() === '') {
        ws.close(1000, 'Username is required')
        return
    }

    const sessionId = parseInt(pathnameParts[2])
    console.info(`Client connected to session ${sessionId}, username: ${username}`)

    let session = appData.sessions[sessionId]

    if (session == null) {
        // create a new session if it doesn't exist
        session = appData.createSession(sessionId, username)
        console.info(`Created new session with ID ${sessionId} for user ${username}`)
    } else {
        // Generate a new username if it already exists in the session
        while (Object.keys(session.players).includes(username)) {
            const randomSuffix = Math.floor(Math.random() * 10)
            username += randomSuffix
        }
    }

    // add player to session
    session.players[username] = {
        connection: ws
    }

    // send player joined message
    sendToPlayers(session, JSON.stringify({
        type: 'playerJoined',
        username
    }))

    ws.on('message', message => {
        try {
            message = JSON.parse(message)
        } catch (error) {
            console.error(`Error processing message from client ${username}:`, error)
            return
        }

        console.info(`Received message from client ${username}:`, message)
    })

    ws.on('close', () => {
        console.log(`closing, length: ${Object.keys(session.players).length}`)
        // check if should close session
        if (Object.keys(session.players).length === 1) {
            delete appData.sessions[sessionId]
            console.info(`Session ${sessionId} closed`)
            return
        }

        // remove player from session
        delete session.players[username]

        // send player quit message
        sendToPlayers(session, JSON.stringify({
            type: 'playerQuit',
            username
        }))

        // check if admin left
        if (session.admin === username) {
            let newAdminUsername = Object.keys(session.players)[0] // pick new admin
            session.admin = newAdminUsername

            sendToPlayers(session, JSON.stringify({
                type: 'adminChanged',
                username: newAdminUsername
            }))
        }
    })
})

server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`)
})
