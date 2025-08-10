require.config({ paths: { vs: "https://unpkg.com/monaco-editor@0.45.0/min/vs" } });

require(["vs/editor/editor.main"], function () {
    const editor = monaco.editor.create(document.getElementById('container'), {
        value: "",
        language: "myLang",
        theme: "vs-dark"
    });

    const ws = new WebSocket("ws://localhost:8765");

    ws.onopen = () => {
        console.log("Connected to LSP server");
        ws.send(JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {}
        }));
    };

    monaco.languages.register({ id: "myLang" });

    monaco.languages.registerCompletionItemProvider("myLang", {
        provideCompletionItems: () => {
            return new Promise((resolve) => {
                ws.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: 2,
                    method: "textDocument/completion",
                    params: {}
                }));

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.result) {
                        resolve({ suggestions: data.result });
                    }
                };
            });
        }
    });
});
