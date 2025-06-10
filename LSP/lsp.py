from lsprotocol.types import CompletionItem, CompletionList, CompletionParams, InitializeParams, InitializeResult
from interpreter import METLABInterpreter
from pygls.protocol import LanguageServerProtocol as Protocol
from pygls.server import LanguageServer
from pygls.workspace import Workspace
import logging
from typing import List, Optional
class METLABLanguageServer(LanguageServer):
    def __init__(self):
        super().__init__()
        self.interpreter = METLABInterpreter()
        self.operators = list(self.interpreter.operators.keys())

COMPLETION = "textDocument/completion"
INITIALIZE = "initialize"
TEXT_DOCUMENT_DID_OPEN = "textDocument/didOpen"
# server = METLABLanguageServer()
logging.basicConfig(level=logging.DEBUG)
# Список ключевых слов
KEYWORDS = ["math", "disp", "if", "else", "while", "for"]

# Ключевые слова для автодополнения
KEYWORDS = ["math", "disp", "if", "else", "while", "for"]

class MCFServer(LanguageServer):
    def __init__(self):
        super().__init__()
        self.workspace: Optional[Workspace] = None

server = MCFServer()

@server.feature(COMPLETION)
def completions(ls: MCFServer, params: CompletionParams) -> CompletionList:
    logging.debug("Запрос автодополнения")
    doc = ls.workspace.get_document(params.text_document.uri)
    line = doc.lines[params.position.line].strip() if params.position.line < len(doc.lines) else ""

    items = [CompletionItem(label=keyword) for keyword in KEYWORDS if keyword.startswith(line.lower())]
    return CompletionList(is_incomplete=False, items=items)

@server.feature(INITIALIZE)
def initialize(ls: MCFServer, params: InitializeParams) -> InitializeResult:
    logging.info("Инициализация сервера")
    return InitializeResult(
        capabilities=ls.client_capabilities,
        server_info={"name": "MCF LSP", "version": "0.1"}
    )

@server.feature(TEXT_DOCUMENT_DID_OPEN)
def did_open(ls: MCFServer, params):
    logging.info(f"Документ открыт: {params.text_document.uri}")

if __name__ == "__main__":
    logging.info("Запуск сервера")
    server.start_io()