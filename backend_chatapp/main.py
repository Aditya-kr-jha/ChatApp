import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import json
import asyncio
import datetime
import logging
import uvicorn

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
PORT = int(os.environ.get("PORT", 8000))
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, specify the actual origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Connection manager to track active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[Dict[str, WebSocket]] = []

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections.append({"socket": websocket, "client_id": client_id})
        await self.broadcast({"type": "user_joined", "username": client_id, "message": f"{client_id} joined the chat"})

    async def disconnect(self, websocket: WebSocket, client_id: str):
        for conn in self.active_connections:
            if conn["socket"] == websocket:
                self.active_connections.remove(conn)
                break
        await self.broadcast({"type": "user_left", "username": client_id, "message": f"{client_id} left the chat"})

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection["socket"].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error broadcasting to {connection['client_id']}: {e}")
                disconnected.append(connection)

        # Remove any failed connections
        for conn in disconnected:
            self.active_connections.remove(conn)


manager = ConnectionManager()


@app.get("/")
async def get():
    return {"message": "Chat API is running"}


@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    logger.info(f"Client connecting: {client_id}")
    await manager.connect(websocket, client_id)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            # Add timestamp
            message_data["timestamp"] = str(datetime.datetime.now())
            # Broadcast the message to all connected clients
            await manager.broadcast({
                "type": "chat_message",
                "username": client_id,
                "message": message_data["message"],
                "timestamp": message_data["timestamp"]
            })
    except WebSocketDisconnect:
        logger.info(f"Client disconnected: {client_id}")
        await manager.disconnect(websocket, client_id)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from {client_id}: {e}")
        await manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"Error handling message from {client_id}: {e}")
        await manager.disconnect(websocket, client_id)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT)