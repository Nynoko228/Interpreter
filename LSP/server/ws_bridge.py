import asyncio
import websockets
import json
import logging
from lsp_server import SimpleLSP

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('LSP-Server')

HOST = "localhost"
PORT = 8765

lsp = SimpleLSP()

async def handle_ws(websocket, path=''):
    logger.info(f"Новое подключение от {websocket.remote_address}")
    try:
        async for message in websocket:
            logger.debug(f"От клиента: {message}")
            response = await lsp.handle(message)
            if response:
                logger.debug(f"Отправка клиенту: {response}")
                await websocket.send(json.dumps(response))
    except websockets.exceptions.ConnectionClosed:
        logger.info("Соединение закрыто клиентом")
    except Exception as e:
        logger.error(f"Ошибка обработки сообщения: {e}")

async def main():
    logger.info(f"Запуск LSP-сервера на ws://{HOST}:{PORT}")
    async with websockets.serve(handle_ws, HOST, PORT):
        logger.info("Сервер запущен и ожидает подключений")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())