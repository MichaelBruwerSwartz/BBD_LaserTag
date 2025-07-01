# Server to Client

## Sending Data

All server to client websocket data follows this format:

```json
type: 'messageType'
field1: 'any data'
field2: 'any data'
```

Types:

### `endGame`

Sent to **players and spectators** when the game ends.

### `gameUpdate`

Sent to **players and spectators** every second and contains all game information.

- `players` - players and their information
  - key: player username
  - value: player points
- `timeLeft` - time that remains in seconds

### `playerJoin`

Sent to **players and spectators** when a user joins a session.

- `playerJoin` - username of player who joined

### `playerListUpdate`

Sent to **players and spectators** when the player list changes.

- `admin` - username of the admin user
- `playerList` - object with player information
  - key: player username
  - value: player color

### `playerQuit`

Sent to **players and spectators** when a user leaves a session.

- `username` - username of player who quit

### `sessionClose`

Sent to **spectators** when a session is closed.

### `startGame`

Sent to **players and spectators** (including the session admin) after an admin starts a game.