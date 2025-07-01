const http = require('http')
const WebSocket = require('ws')
const { randomUUID } = require('crypto')
const { parse } = require('url')
const appData = require('./app-data')

const server = http.createServer()
const wss = new WebSocket.Server({ server })

/*
    Kill messages e.g. player1 killed player2
    Leaderboard updates
*/
function sendToClients(session, message, sendToPlayers, sendToSpectators) {
    if (sendToPlayers) {
        for (let username in session.players) {
            const player = session.players[username]
            player.connection.send(message)
        }
    }
    if (sendToSpectators) {
        for (let id in session.spectators) {
            session.spectators[id].send(message)
        }
    }
}

function getPlayerList(session) {
    return Object.keys(session.players).map(username => {
        return {
            username,
            color: session.players[username].color
        }
    })
}

function getAvailablePlayerColor(session) {
    const usedColors = new Set(Object.values(session.players).map(player => player.color))

    for (const color of appData.colors) {
        if (!usedColors.has(color)) {
            return color
        }
    }

    return null
}

// player: /session/:id
// spectator: /session/:id/spectator
wss.on('connection', (ws, req) => {
    const { pathname, query } = parse(req.url, true)
    const pathnameParts = pathname.split('/')

    if (pathnameParts.length < 3 || pathnameParts[1] !== 'session') {
        ws.close(1000, 'Invalid session URL')
        return
    }

    const isSpectator = pathnameParts.length === 4 && pathnameParts[3] === 'spectator'
    const sessionId = pathnameParts[2]
    let session = appData.sessions[sessionId]

    if (isSpectator) {
        // spectators do not have usernames
        const id = randomUUID()

        if (session == null) {
            ws.close(1000, 'Session does not exist') // cannot create session as spectator
            return
        }

        console.info(`Spectator connected to session ${sessionId}`)

        // add spectator to session
        session.spectators[id] = ws

        ws.on('close', () => {
            // remove spectator from session
            console.info(`Spectator disconnected from session ${sessionId}`)
            delete session.spectators[id]
        })
    } else {
        let { color, username } = query

        if (!username || username.trim() === '') {
            ws.close(1000, 'Username is required')
            return
        }

        if (session == null) {
            // create a new session if it doesn't exist
            session = appData.createSession(sessionId, username)
            console.info(`Session ${sessionId} created for admin user ${username}`)
        } else {
            // generate a new username if it already exists in the session
            while (Object.keys(session.players).includes(username)) {
                const randomSuffix = Math.floor(Math.random() * 10)
                username += randomSuffix
            }
        }

        console.info(`Player ${username} connected to session ${sessionId}`)

        // add player to session
        session.players[username] = {
            connection: ws,
            color: color ?? getAvailablePlayerColor(session) ?? appData.colors[0]
        }

        // send player joined message
        sendToClients(session, JSON.stringify({
            type: 'playerJoin',
            username
        }), true, true)
        sendToClients(session, JSON.stringify({
            type: 'playerListUpdate',
            admin: session.admin,
            playerList: getPlayerList(session)
        }), true, true)

        ws.on('close', () => {
            console.info(`Player ${username} disconnected from session ${sessionId}`)

            // check if should close session
            if (Object.keys(session.players).length === 1) {
                delete appData.sessions[sessionId]
                console.info(`Session ${sessionId} closed`)

                sendToClients(session, JSON.stringify({
                    type: 'sessionClose'
                }), false, true)
                return
            }

            // remove player from session
            delete session.players[username]

            // send player quit message
            sendToClients(session, JSON.stringify({
                type: 'playerQuit',
                username
            }), true, true)
            sendToClients(session, JSON.stringify({
                type: 'playerListUpdate',
                admin: session.admin,
                playerList: getPlayerList(session)
            }), true, true)

            // check if admin left
            if (session.admin === username) {
                let newAdminUsername = Object.keys(session.players)[0] // pick new admin
                session.admin = newAdminUsername

                sendToClients(session, JSON.stringify({
                    type: 'adminChange',
                    username: newAdminUsername
                }), true, true)
            }
        })
    }

    ws.on('message', message => {
        try {
            message = JSON.parse(message)
        } catch (error) {
            console.error(`Error processing message from client:`, error)
            return
        }

        const { type } = message

        if (type === 'startGame') {
            sendToClients(session, JSON.stringify({
                type: 'startGame'
            }), true, true)
        }
    })
})

function startWebocket(port) {
    server.listen(port, () => {
        console.info(`WebSocket server running on port ${port}`)
    })
}

module.exports = startWebocket