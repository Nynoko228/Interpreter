const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

let client;

function activate(context) {
    console.log("MCF LSP: Активация расширения");
    const serverOptions = {
        command: 'python3',
        args: ['/home/coder/mcf-extension/mcf/server/lsp_server.py'],
        transport: TransportKind.stdio
    };

    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'mcf' }],
        synchronize: { fileEvents: vscode.workspace.createFileSystemWatcher('**/*.mcf') }
    };

    client = new LanguageClient('mcf', 'MCF Language Server', serverOptions, clientOptions);
    client.start();
}

function deactivate() {
    if (client && client.isRunning()) {
        client.stop();
    }
}

module.exports = { activate, deactivate };