from pygls.server import LanguageServer
from pygls.lsp.types import (
    CompletionItem, CompletionList, CompletionParams,
    InitializeResult, DidOpenTextDocumentParams,
    Diagnostic, DiagnosticSeverity, Position, Range
)
from pygls.lsp.methods import (
    COMPLETION, INITIALIZE, TEXT_DOCUMENT_DID_OPEN, TEXT_DOCUMENT_DID_CHANGE
)
from interpreter import Interpreter

class METLABLanguageServer(LanguageServer):
    def __init__(self):
        super().__init__()
        self.interpreter = Interpreter()
        self.operators = list(self.interpreter.operators.keys())

server = METLABLanguageServer()

@server.feature(COMPLETION)
def completions(params: CompletionParams) -> CompletionList:
    items = [CompletionItem(label=op) for op in server.operators]
    return CompletionList(is_incomplete=False, items=items)

@server.feature(INITIALIZE)
def initialize(params) -> InitializeResult:
    return InitializeResult(
        capabilities=server.capabilities,
        server_info={"name": "METLAB LSP"}
    )

if __name__ == "__main__":
    server.start_io()