const http = require("http");
const WebSocket = require("ws");
const { randomUUID } = require("crypto");
const { parse } = require("url");
const appData = require("./app-data");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

/*
    Kill messages e.g. player1 killed player2
    Leaderboard updates
*/
function sendToClients(session, message, sendToPlayers, sendToSpectators) {
    if (sendToPlayers) {
        for (let username in session.players) {
            const player = session.players[username];
            player.connection.send(message);
        }
    }
    if (sendToSpectators) {
        for (let id in session.spectators) {
            session.spectators[id].send(message);
        }
    }
}

function getPlayerList(session) {
    return Object.keys(session.players).map((username) => {
        const { color, hitsGiven, hitsTaken, points } = session.players[username];
        return {
            username,
            color,
            hitsGiven,
            hitsTaken,
            points
        };
    })
}

// game timers, information updates, session closing
setInterval(() => {
    for (let session of Object.values(appData.sessions)) {
        // check if should close session
        if (Object.keys(session.players).length === 0 && Object.keys(session.spectators).length) {
            session.persistTime -= 1;

            if (session.persistTime <= 0) {
                delete appData.sessions[session.id];
                console.info(`Session ${session.id} closed`);

                sendToClients(
                    session,
                    JSON.stringify({
                        type: "sessionClose",
                    }),
                    false,
                    true
                );

                return;
            }
        } else {
            session.persistTime = appData.SESSION_PERSIST_TIME;
        }
        if (session.state === "game") {
            session.timeLeft -= 1;

            sendToClients(
                session,
                JSON.stringify({
                    type: "gameUpdate",
                    timeLeft: session.timeLeft,
                    players: getPlayerList(session),
                }),
                true,
                true
            );

            if (session.timeLeft <= 0) {
                session.state = "finished";
            } else {
                // powerups
                const powerups = ['invincibility', 'instakill']
                for (let player of Object.values(session.players)) {
                    // decrease durations
                    for (let powerupId in player.activePowerups) {
                        let v = player.activePowerups[powerupId]
                        if (v > 0) player.activePowerups[powerupId]--
                        console.log(`powerup ${powerupId}: ${player.activePowerups[powerupId]}`)
                    }

                    // give new
                    if (Math.random() < 0.06) {
                        const selectedPowerup = powerups[Math.floor(Math.random() * powerups.length)]
                        const powerupDuration = 10
                        player.activePowerups[selectedPowerup] = powerupDuration
                        player.connection.send(JSON.stringify({
                            type: 'powerup',
                            powerup: selectedPowerup,
                            duration: powerupDuration
                        }));
                    }
                }
            }
        }
    }
}, 1000);

wss.on("connection", (ws, req) => {
    const { pathname, query } = parse(req.url, true);
    const pathnameParts = pathname.split("/");

    if (pathnameParts.length < 3 || pathnameParts[1] !== "session") {
        ws.close(1000, "Invalid session URL");
        return;
    }

    const sessionId = pathnameParts[2];
    let session = appData.sessions[sessionId];

    // color checking
    if (pathnameParts.length === 4 && pathnameParts[3] === "check_color") {
        ws.on("message", (message) => {
            const { color } = JSON.parse(message);
            let colorAvailable = true

            if (session != null) {
                // check if color is used
                for (let player of Object.values(session.players)) {
                    if (player.color === color) {
                        colorAvailable = false;
                        break;
                    }
                }
            }

            console.info(`Checking color availability for ${color}: ${colorAvailable ? 'available' : 'unavailable'}`)
            ws.send(JSON.stringify({
                type: 'colorResult',
                available: colorAvailable
            }));
        });

        return
    }

    const isSpectator = pathnameParts.length === 4 && pathnameParts[3] === "spectator";

    // create a new session if it doesn't exist
    if (session == null) {
        session = appData.createSession(sessionId);
        console.info(`Session ${sessionId} created`);
    }
    if (isSpectator) {
        console.info(`Spectator connected to session ${sessionId}`);

        // add spectator to session
        const spectatorId = randomUUID();
        session.spectators[spectatorId] = ws;

        ws.on("close", () => {
            // remove spectator from session
            console.info(`Spectator disconnected from session ${sessionId}`);
            delete session.spectators[spectatorId];
        });
    } else {
        let { color, username } = query;

        if (color == null || color.trim() === '' || username == null || username.trim() === "") {
            ws.close(1000, "Username and color is required");
            return;
        }

        // generate a new username if it already exists in the session
        while (Object.keys(session.players).includes(username)) {
            const randomSuffix = Math.floor(Math.random() * 10);
            username += randomSuffix;
        }

        console.info(`Player ${username} connected to session ${sessionId}`);

        // set admin if no admin exists
        if (session.admin == null) {
            console.info(`Player ${username} was made admin for session ${sessionId}`);
            session.admin = username;
        }

        // add player to session
        session.players[username] = {
            connection: ws,
            username,
            color,
            hitsGiven: 0,
            hitsTaken: 0,
            points: 50,
            activePowerups: {}
        };

        // send player joined message
        sendToClients(
            session,
            JSON.stringify({
                type: "playerJoin",
                username,
            }),
            true,
            true
        );
        sendToClients(
            session,
            JSON.stringify({
                type: "playerListUpdate",
                admin: session.admin,
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

            const { type } = message;

            if (type === "hit") {
                const { color, weapon } = message;
                handleHit(session, session.players[username], color, weapon);
            } else if (type === "startGame") {
                session.state = "game";
                session.timeLeft = 3 * 60;
                sendToClients(
                    session,
                    JSON.stringify({
                        type: "startGame",
                        playerList: getPlayerList(session),
                    }),
                    true,
                    true
                );
            } else if (type === "cameraFrame") {
                const { frame } = message;
                session.latestFrames[username] = frame;

                // Send all frames to spectators
                const spectatorMessage = JSON.stringify({
                    type: "cameraFramesBatch",
                    frames: Object.entries(session.latestFrames).map(([user, frame]) => ({
                        username: user,
                        frame,
                    })),
                });

                sendToClients(session, spectatorMessage, false, true);
            }
        });

        ws.on("close", () => {
            console.info(`Player ${username} disconnected from session ${sessionId}`);

            // remove player from session
            delete session.players[username];

            // check if admin left
            if (session.admin === username) {
                session.admin =
                    Object.keys(session.players).length > 0
                        ? Object.keys(session.players)[0]
                        : null; // pick new admin
            }

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
                    admin: session.admin,
                    playerList: getPlayerList(session),
                }),
                true,
                true
            );
        });
    }
});

function handleHit(session, player, color, weapon) {
    if (color === 'cyan') return // invalid color
    if (player.points <= 0) return // already eliminated

    // get target player from color
    let target;

    for (let playerUsername in session.players) {
        if (session.players[playerUsername].color === color) {
            target = session.players[playerUsername];
            break;
        }
    }

    if (!target || target.points <= 0 || target.activePowerups.invincibility > 0) return;

    // update points
    if (player.activePowerups.instakill > 0) {
        // has instakill powerup
        let currentPoints = target.points
        target.points = 0
        player.points += Math.floor(currentPoints / 2)
    } else {
        const weaponDamages = {
            pistol: 6,
            sniper: 32,
            shotgun: 12,
        };
        const damage = weaponDamages[weapon] ?? 0;
        target.points = Math.max(0, target.points - damage)
        player.points += Math.floor(damage / 2)
    }

    // update hits
    player.hitsGiven++
    target.hitsTaken++

    sendToClients(
        session,
        JSON.stringify({
            type: "hit",
            player: player.username,
            target: target.username,
            weapon,
        }),
        true,
        true
    );

    if (target.points <= 0) {
        sendToClients(
            session,
            JSON.stringify({
                type: "elimination",
                player: target.username,
                weapon,
            }),
            true,
            true
        );
    }
}

function start(port) {
    server.listen(port, () => {
        console.info(`WebSocket server running on port ${port}`);
    });
}

module.exports = { start };
