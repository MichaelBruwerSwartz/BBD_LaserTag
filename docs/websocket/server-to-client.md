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

- `username` - username of the new admin

### `playerJoin`

- `playerJoin` - username of player who joined

### `playerListUpdate`

- `playerList` - array of player usernames

### `playerQuit`

- `username` - username of player who quit