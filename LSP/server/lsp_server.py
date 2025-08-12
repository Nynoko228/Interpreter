import json
import re
import logging

# Настройка логирования
logger = logging.getLogger('LSP-Handler')


class SimpleLSP:
    def __init__(self):
        self.keywords = ["алгоритм", "начало", "конец", "цикл", "если", "иначе"]
        self.documents = {}

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
                suggestions = [kw for kw in self.keywords if kw.startswith(last_word)]
                logger.info(f"Предложения: {suggestions}")

                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": [
                        {"label": kw, "kind": 14} for kw in suggestions
                    ]
                }

        except Exception as e:
            logger.error(f"Ошибка обработки сообщения: {e}")
            import traceback
            logger.error(traceback.format_exc())
        return None