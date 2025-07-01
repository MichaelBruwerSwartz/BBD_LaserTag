# Server to Client

## Sending Data

All server to client websocket data follows this format:

```json
type: 'messageType'
field1: 'any data'
field2: 'any data'
```

Types:

### `adminChange`

Sent to **players and spectators** when the admin of a session changes.

- `username` - username of the new admin

### `playerJoin`

Sent to **players and spectators** when a user joins a session.

- `playerJoin` - username of player who joined

### `playerListUpdate`

Sent to **players and spectators** when the player list changes.

- `admin` - username of the admin user
- `playerList` - array of player usernames

### `playerQuit`

Sent to **players and spectators** when a user leaves a session.

- `username` - username of player who quit

### `sessionClose`

Sent to **spectators** when a session is closed.