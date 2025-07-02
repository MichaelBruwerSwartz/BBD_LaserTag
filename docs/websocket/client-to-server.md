# Client to Server

## Connecting

### For Players

Client must connect to `ws://localhost:4000/session/<session_id>?codeId=<player_code_id>&username=<player_username>`.

Where:
- **username** is required and
- **player_code_id** is optional

### For Spectators

Client must connect to `ws://localhost:4000/session/<session_id>/spectator`.

### For Color Checking

*Used to check if a color is available.*

Client must connect to `ws://localhost:4000/session/<session_id>/check_color?color=<color_to_check>`

After connecting, the server will reply with

```json
{
    "type": "colorResult",
    "available": true // or false
}
```

## Sending Data

All server to client websocket data follows this format:

```json
type: 'messageType'
field1: 'any data'
field2: 'any data'
```

Types:

### `hit`

Sent when a player scans a code.

- `codeId` - ID of code that was scanned
- `weapon` - the weapon was being used when scanning the code

### `startGame`

Sent to start the game.