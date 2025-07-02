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

// game timers, information updates, session closing
setInterval(() => {
    for (let session of Object.values(appData.sessions)) {
        // check if should close session
        if (Object.keys(session.players).length === 0) {
            session.persistTime -= 1

            if (session.persistTime <= 0) {
                delete appData.sessions[session.id]
                console.info(`Session ${session.id} closed`)

                sendToClients(session, JSON.stringify({
                    type: 'sessionClose'
                }), false, true)

                return
            }
        } else {
            session.persistTime = appData.SESSION_PERSIST_TIME
        }
        if (session.state === 'game') {
            session.timeLeft -= 1

            sendToClients(session, JSON.stringify({
                type: 'gameUpdate',
                timeLeft: session.timeLeft,
                players: Object.fromEntries(Object.entries(session.players).map(([username, player]) => [username, player.points]))
            }), true, true)

            if (session.timeLeft <= 0) {
                session.state = 'finished'
            }
        }
    }
}, 1000)

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

            // set admin if no admin exists
            if (session.admin == null) {
                session.admin = username
            }
        }

        console.info(`Player ${username} connected to session ${sessionId}`)

        // add player to session
        session.players[username] = {
            connection: ws,
            username,
            color: color ?? getAvailablePlayerColor(session) ?? appData.colors[0],
            points: 50
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

        ws.on('message', message => {
            try {
                message = JSON.parse(message)
            } catch (error) {
                console.error(`Error processing message from client ${username}:`, error)
                return
            }

            console.info(`Received message from client ${username}:`, message)

            const { type } = message

            if (type === 'hit') {
                const { color, shape, weapon } = message
                handleHit(session, session.players[username], color, shape, weapon)
            } else if (type === 'startGame') {
                session.state = 'game'
                session.timeLeft = 5 * 60
                sendToClients(session, JSON.stringify({
                    type: 'startGame',
                    playerList: getPlayerList(session)
                }), true, true)
            }
        })

        ws.on('close', () => {
            console.info(`Player ${username} disconnected from session ${sessionId}`)

            // remove player from session
            delete session.players[username]

            // check if admin left
            if (session.admin === username) {
                session.admin = (Object.keys(session.players).length > 0) ? Object.keys(session.players)[0] : null // pick new admin
            }

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
        })
    }
})

function handleHit(session, player, color, shape, weapon) {
    // get target from color
    let target
    for (let playerUsername in session.players) {
        if (session.players[playerUsername].color === color) {
            target = session.players[playerUsername]
            break
        }
    }
    if (!target || target.points <= 0) return

    if (shape === 'triangle') {
        const damages = {
            pistol: 16,
            sniper: 32,
            shotgun: 8
        }
        const pointsLost = damages[weapon] ?? 0
        const pointsGained = pointsLost / 2

        // update points
        target.points = Math.max(target.points - pointsLost, 0)
        player.points = player.points + pointsGained

        sendToClients(session, JSON.stringify({
            type: 'hit',
            player: player.username,
            target: target.username,
            weapon
        }), true, true)

        if (target.points <= 0) {
            sendToClients(session, JSON.stringify({
                type: 'elimination',
                player: target.username,
                weapon
            }), true, true)
        }
    } else if (shape === 'rectangle') {
        // TODO: powerups
    }
}

function start(port) {
    server.listen(port, () => {
        console.info(`WebSocket server running on port ${port}`)
    })
}

module.exports = { start }