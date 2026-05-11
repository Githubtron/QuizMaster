"""
WebSocket router — authenticated real-time notifications.
Token is passed as a query param since browsers can't set WS headers.
"""

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from core.config import settings

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, WebSocket] = {}   # user_id → websocket
        self._roles: dict[str, str] = {}                # user_id → role

    async def connect(self, user_id: str, role: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections[user_id] = ws
        self._roles[user_id] = role

    def disconnect(self, user_id: str) -> None:
        self._connections.pop(user_id, None)
        self._roles.pop(user_id, None)

    async def send(self, user_id: str, payload: dict) -> None:
        ws = self._connections.get(user_id)
        if not ws:
            return
        try:
            await ws.send_json(payload)
        except Exception:
            self.disconnect(user_id)

    async def broadcast_role(self, role: str, payload: dict) -> None:
        targets = [uid for uid, r in list(self._roles.items()) if r == role]
        for uid in targets:
            await self.send(uid, payload)

    async def broadcast_all(self, payload: dict) -> None:
        for uid in list(self._connections):
            await self.send(uid, payload)


manager = ConnectionManager()


def _decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    payload = _decode_token(token)
    if not payload:
        await ws.close(code=1008)
        return

    user_id: str = payload.get("sub", "")
    role: str    = payload.get("role", "STUDENT")

    await manager.connect(user_id, role, ws)
    try:
        while True:
            await ws.receive_text()   # keep-alive; client may send pings
    except WebSocketDisconnect:
        manager.disconnect(user_id)
