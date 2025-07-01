# Client to Server

## Connecting

**For players:** Client must connect to `ws://localhost:4000/session/<session_id>?username=<player_username>`

**For spectators:** Client must connect to `ws://localhost:4000/session/<session_id>/spectator?username=<player_username>`

## Sending Data

All server to client websocket data follows this format:

```json
type: 'messageType'
field1: 'any data'
field2: 'any data'
```

Types:

### `startGame`

Sent to start the game.