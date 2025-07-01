# Client to Server

## Connecting

**For players:** Client must connect to `ws://localhost:4000/session/<session_id>?color=<player_color>&username=<player_username>`

Where:
- **username** is required and
- **color** is optional

**For spectators:** Client must connect to `ws://localhost:4000/session/<session_id>/spectator`

## Sending Data

All server to client websocket data follows this format:

```json
type: 'messageType'
field1: 'any data'
field2: 'any data'
```

Types:

### `hit`

Sent when a player hits another player.

- `target` - username of player who was hit
- `weapon` - the weapon that was used to attack the target

### `startGame`

Sent to start the game.