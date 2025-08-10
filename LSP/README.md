
Простой WebSocket LSP-сервер на Python + тестовый клиент.

— Запуск сервера:
```bash
python -m venv .venv
source .venv/bin/activate     # или .\.venv\Scripts\Activate.ps1 на Windows
pip install -r requirements.txt
Сервер
python server_ws.py
Клиент
source .venv/bin/activate
python test_client_ws.py
