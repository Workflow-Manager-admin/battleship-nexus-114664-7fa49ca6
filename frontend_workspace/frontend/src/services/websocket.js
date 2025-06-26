/**
 * websocket.js - manage real-time socket connection
 */
// PUBLIC_INTERFACE

export class BattleshipWebSocket {
  /**
   * Initializes the socket and handlers.
   * @param {string} token JWT token for authentication
   * @param {function} onMessage callback(data)
   * @param {string} roomCode room code
   */
  constructor(token, onMessage, roomCode) {
    this.token = token;
    this.onMessage = onMessage;
    this.roomCode = roomCode;
    /* Assuming backend socket endpoint is ws://host/ws/{room_code}?token=... */
    let base = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
        ? "ws://localhost:3001"
        : `wss://${window.location.hostname}:3001`;
    this.ws = new window.WebSocket(`${base}/ws/${roomCode}?token=${token}`);
    this.ws.onmessage = (evt) => {
      if (this.onMessage) this.onMessage(JSON.parse(evt.data));
    };
  }
  // PUBLIC_INTERFACE
  send(data) {
    if (this.ws.readyState === 1)
      this.ws.send(JSON.stringify(data));
  }
  // PUBLIC_INTERFACE
  close() {
    this.ws && this.ws.close();
  }
}
