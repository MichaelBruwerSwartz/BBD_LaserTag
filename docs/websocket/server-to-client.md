# Server to Client

## Sending Data

All server to client websocket data follows this format:

```json
type: 'messageType'
field1: 'any data'
field2: 'any data'
```

Types:

### `elimination`

Sent to **players and spectators** when a player is eliminated.

- `player` - username of player who was eliminated

### `gameUpdate`

Sent to **players and spectators** every second and contains all game information.

- `players` - players and their information
  - key: player username
  - value: object
    - codeId
    - color
    - hitsGiven
    - hitsReceived
    - points
- `timeLeft` - time that remains in seconds

### `hit`

Sent to **players and spectators** when a player hits another player.

- `player` - username of player who hit the target
- `target` - username of player who was hit
- `weapon` - the weapon that was used to hit the target

### `playerJoin`

Sent to **players and spectators** when a user joins a session.

- `playerJoin` - username of player who joined

### `playerListUpdate`

Sent to **players and spectators** when the player list changes.

- `admin` - username of the admin user
- `playerList` - array of player objects
  - username
  - codeId
  - color
  - hitsGiven
  - hitsReceived
  - points

### `playerQuit`

Sent to **players and spectators** when a user leaves a session.

- `username` - username of player who quit

### `sessionClose`

Sent to **spectators** when a session is closed.

### `startGame`

Sent to **players and spectators** (including the session admin) after an admin starts a game.

- `playerList` - array of player objects
  - username
  - codeId
  - color
  - hitsGiven
  - hitsReceived
  - points