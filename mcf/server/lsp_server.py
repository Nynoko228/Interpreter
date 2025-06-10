import logging
from typing import List, Optional

# Импорты из lsprotocol и pygls 1.3.1
from lsprotocol.types import (
    CompletionItem,
    CompletionList,
    CompletionParams,
    InitializeParams,
    InitializeResult
)
from pygls.server import LanguageServer
from pygls.workspace import Workspace

# Логирование
logging.basicConfig(level=logging.DEBUG)

# Список ключевых слов
KEYWORDS = ["math", "МАТЕМ", "disp", "ПОКАЗ", "wait", "ЖДАТЬ"]

class MCFServer(LanguageServer):
    def __init__(self):
        super().__init__()
        self.workspace: Optional[Workspace] = None

server = MCFServer()

@server.feature("textDocument/completion")
def completions(ls: MCFServer, params: CompletionParams) -> CompletionList:
    logging.debug("Запрос автодополнения")
    doc = ls.workspace.get_document(params.text_document.uri)
    line = doc.lines[params.position.line].strip() if params.position.line < len(doc.lines) else ""

    items = [CompletionItem(label=keyword) for keyword in KEYWORDS if keyword.startswith(line.lower())]
    return CompletionList(is_incomplete=False, items=items)

@server.feature("initialize")
def initialize(ls: MCFServer, params: InitializeParams) -> InitializeResult:
    logging.info("Инициализация LSP-сервера")
    return InitializeResult(
        capabilities=ls.client_capabilities,
        server_info={"name": "MCF LSP", "version": "0.1"}
    )

if __name__ == "__main__":
    logging.info("Запуск LSP-сервера")
    server.start_io()