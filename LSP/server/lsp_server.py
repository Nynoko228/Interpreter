import asyncio
import json

class SimpleLSP:
    def __init__(self):
        self.keywords = ["алгоритм", "начало", "конец", "цикл", "если", "иначе"]

    async def handle(self, message):
        try:
            data = json.loads(message)

            if data.get("method") == "initialize":
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": {
                        "capabilities": {
                            "completionProvider": {"resolveProvider": False}
                        }
                    }
                }

            elif data.get("method") == "textDocument/completion":
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": [
                        {"label": kw, "kind": 14} for kw in self.keywords
                    ]
                }

        except Exception as e:
            print("LSP Error:", e)
        return None
