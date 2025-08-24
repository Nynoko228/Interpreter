import json
import os
import re
import logging
from pathlib import Path

# Настройка логирования
logger = logging.getLogger('LSP-Handler')


class SimpleLSP:
    def __init__(self, syntax_file="syntax.json"):
        self.syntax = self.load_syntax(syntax_file)
        self.documents = {}

    def load_syntax(self, file_path):
        try:
            # Автоматическое определение пути к файлу
            if not os.path.isabs(file_path):
                base_dir = os.path.dirname(os.path.abspath(__file__))
                file_path = os.path.join(base_dir, file_path)

            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Ошибка загрузки синтаксиса: {e}")
            # Возвращаем синтаксис по умолчанию при ошибке
            return {
                "keywords": [],
                "operators": [],
                "types": [],
                "builtin_functions": []
            }

    async def handle_list_files(self, data):
        try:
            # Укажите путь к вашей рабочей директории
            workspace_path = Path(__file__).resolve().parent.parent / "data"
            # print(workspace_path)
            files = []

            for item in workspace_path.iterdir():
                files.append({
                    "name": item.name,
                    "path": str(item),
                    "isDirectory": item.is_dir(),
                    "size": item.stat().st_size if item.is_file() else 0
                })

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": files
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка чтения директории: {str(e)}"
                }
            }

    async def handle_read_file(self, data):
        try:
            file_path = data["params"]["path"]
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "content": content,
                    "path": file_path
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка чтения файла: {str(e)}"
                }
            }

    async def completion(self, data):
        uri = data["params"]["textDocument"]["uri"]
        line = data["params"]["position"]["line"]
        character = data["params"]["position"]["character"]

        logger.info(f"Запрос автодополнения для URI: {uri}, позиция: строка {line}, символ {character}")

        text = self.documents.get(uri, "")
        lines = text.split("\n")

        if line < 0 or line >= len(lines):
            logger.warning(f"Запрошена несуществующая строка: {line} (всего строк: {len(lines)})")
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": []
            }

        current_line = lines[line]
        logger.debug(f"Текущая строка: '{current_line}'")

        # Получаем текущее слово
        prefix = current_line[:character]
        last_word = re.findall(r'[\wа-яА-Я]*$', prefix)[0]  # Разрешаем русские буквы
        logger.info(f"Текущее слово: '{last_word}'")

        # Фильтруем ключевые слова
        all_items = (
                self.syntax["keywords"] +
                self.syntax["operators"] +
                self.syntax["types"] +
                self.syntax["builtin_functions"]
        )
        suggestions = [kw for kw in all_items if kw.lower().startswith(last_word.lower())]
        logger.info(f"Предложения: {suggestions}")
        return {
            "jsonrpc": "2.0",
            "id": data["id"],
            "result": [
                {"label": kw, "kind": 14} for kw in suggestions
            ]
        }

    async def handle(self, message):
        try:
            data = json.loads(message)
            logger.debug(f"Получено сообщение: {data}")

            if data.get("method") == "initialize":
                logger.info("Обработка инициализации LSP")
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": {
                        "capabilities": {
                            "completionProvider": {"resolveProvider": False}
                        }
                    }
                }

            elif data.get("method") == "textDocument/didOpen":
                uri = data["params"]["textDocument"]["uri"]
                text = data["params"]["textDocument"]["text"]
                self.documents[uri] = text
                logger.info(f"Документ открыт: {uri}, длина: {len(text)} символов")
                return None

            elif data.get("method") == "textDocument/didChange":
                uri = data["params"]["textDocument"]["uri"]
                for change in data["params"]["contentChanges"]:
                    if "text" in change:
                        self.documents[uri] = change["text"]
                        logger.debug(f"Документ изменён: {uri}, новая длина: {len(change['text'])} символов")
                return None

            elif data.get("method") == "textDocument/completion":
                return await self.completion(data)
            elif data.get("method") == "workspace/listFiles":
                return await self.handle_list_files(data)
            elif data.get("method") == "workspace/readFile":
                return await self.handle_read_file(data)
            elif data.get("method") == "workspace/getSyntax":
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": self.syntax
                }

        except Exception as e:
            logger.error(f"Ошибка обработки сообщения: {e}")
            import traceback
            logger.error(traceback.format_exc())
        return None