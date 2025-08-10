import asyncio
import websockets
import json
from lsp_server import SimpleLSP

HOST = "localhost"
PORT = 8765

lsp = SimpleLSP()

async def handle_ws(websocket):
    async for message in websocket:
        print("From client:", message)
        response = await lsp.handle(message)
        if response:
            await websocket.send(json.dumps(response))

async def main():
    async with websockets.serve(handle_ws, HOST, PORT):
        print(f"WebSocket LSP listening on ws://{HOST}:{PORT}")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
