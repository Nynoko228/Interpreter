class LSPClient {
    constructor() {
        this.ws = null;
        this.documentVersion = 1;
        this.lastCompletionRequestId = 0;
        this.pendingCompletions = {};
        this.initializePromise = null;
        this.uri = "file:///current";
        this.initializeResolve = null;
    }

    connect(url) {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log("Connected to LSP server");
                this.initialize().then(resolve).catch(reject);
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                reject(error);
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };

            this.ws.onclose = () => {
                console.log("Disconnected from LSP server");
            };
        });
    }

    initialize() {
        if (this.initializePromise) {
            return this.initializePromise;
        }

        this.initializePromise = new Promise((resolve, reject) => {
            // Сохраняем функции разрешения/отклонения
            this.initializeResolve = resolve;
            this.initializeReject = reject;

            const id = 1;
            this.send({
                jsonrpc: "2.0",
                id: id,
                method: "initialize",
                params: {
                    capabilities: {},
                    rootUri: "file:///project-root"
                }
            });
        });

        return this.initializePromise;
    }

    sendDidOpen(text) {
        this.documentVersion = 1;
        this.send({
            jsonrpc: "2.0",
            method: "textDocument/didOpen",
            params: {
                textDocument: {
                    uri: this.uri,
                    languageId: "myalgo",
                    version: this.documentVersion,
                    text: text
                }
            }
        });
    }
    // Запрос на содержимое папки
    async requestFolder(path = '') {
        console.log('LSP requestFolder called with path:', path);
        return new Promise((resolve, reject) => {
            const requestId = ++this.lastCompletionRequestId;
            this.pendingCompletions[requestId] = { resolve, reject };

            console.log('Sending workspace/listFolder request with params:', { path });
            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "workspace/listFolder",
                params: { path }
            });
        });
    }
    // Запрос на сохранение файла
    async saveFile(path, content) {
    return new Promise((resolve, reject) => {
        const requestId = ++this.lastCompletionRequestId;
        this.pendingCompletions[requestId] = { resolve, reject };

        this.send({
            jsonrpc: "2.0",
            id: requestId,
            method: "workspace/saveFile",
            params: { path, content }
        });
    });
}

    sendDidChange(text) {
        this.documentVersion++;
        this.send({
            jsonrpc: "2.0",
            method: "textDocument/didChange",
            params: {
                textDocument: {
                    uri: this.uri,
                    version: this.documentVersion
                },
                contentChanges: [{
                    text: text
                }]
            }
        });
    }

    requestCompletion(position) {
        return new Promise((resolve) => {
            const requestId = ++this.lastCompletionRequestId;

            this.pendingCompletions[requestId] = { resolve, position };

            // ВАЖНО: LSP использует line и character (не column)
            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "textDocument/completion",
                params: {
                    textDocument: { uri: this.uri },
                    position: {
                        line: position.line,        // 0-based строка
                        character: position.character // 0-based позиция в строке
                    }
                }
            });
        });
    }

    async requestFiles() {
        this.documentVersion = 1
        return new Promise((resolve, reject) => {
            const requestId = ++this.lastCompletionRequestId;

            this.pendingCompletions[requestId] = { resolve, reject };

            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "workspace/listFiles",
                params: {}
            });
        });
    }

    async readFile(path) {
        return new Promise((resolve, reject) => {
            const requestId = ++this.lastCompletionRequestId;

            this.pendingCompletions[requestId] = { resolve, reject };

            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "workspace/readFile",
                params: { path }
            });
        });
    }

    requestSyntax() {
        return new Promise((resolve, reject) => {
            const requestId = ++this.lastCompletionRequestId;
            this.pendingCompletions[requestId] = { resolve, reject };

            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "workspace/getSyntax",
                params: {}
            });
        });
    }

    handleMessage(data) {
        // Обрабатываем разные форматы данных
        let message;
//        console.log(typeof data)
        if (typeof data === 'string') {
            try {
                message = JSON.parse(data);
            } catch (error) {
                console.error("Error parsing JSON:", error, "Data:", data);
                return;
            }
        } else if (typeof data === 'object') {
            message = data;
//            console.log(Object.keys(message))
        } else {
            console.error("Unknown message format:", typeof data, data);
            return;
        }
//        console.log(Object.keys(message));

        // Обработка ответа на инициализацию
        if (message.id === 1 && this.initializeResolve) {
            this.initializeResolve(message);
            this.initializeResolve = null; // Сбрасываем после использования
            return;
        }

        // Если это ответ на запрос автодополнения
        if (message.id && this.pendingCompletions[message.id]) {
            const { resolve, reject } = this.pendingCompletions[message.id];
            delete this.pendingCompletions[message.id];

            // Ответ от сервера
            console.log("LSP message for request", message.id, message);

            if (message.error) {
                reject(message.error);
                return;
            }

            // Обработка ответов от createFile и createFolder
            if (message.result && typeof message.result === 'object' &&
                (message.result.success !== undefined || message.result.path)) {
                resolve(message.result);
                return;
            }

            try {
                if (message.result === undefined || message.result === null) {
                    resolve(null);
                    return;
                }

                // Если result — массив (например workspace/listFiles -> [{path,name,...}, ...])
                if (Array.isArray(message.result)) {
                    // Если элементы имеют поле label — это completion, вернём массив label
                    if (message.result.length > 0 && message.result[0] && 'label' in message.result[0]) {
                        resolve(message.result.map(i => i.label));
                    } else {
                        // Иначе — возвращаем массив объектов как есть (файлы и т.д.)
                        resolve(message.result);
                    }
                    return;
                }

                // Частый формат автодополнений: { items: [...] }
                if (message.result.items && Array.isArray(message.result.items)) {
                    if (message.result.items.length > 0 && 'label' in message.result.items[0]) {
                        resolve(message.result.items.map(i => i.label));
                    } else {
                        resolve(message.result.items);
                    }
                    return;
                }

                // Во всех остальных случаях — возвращаем result напрямую
                resolve(message.result);
            } catch (e) {
                console.error("Error processing LSP message:", e, message);
                // fallback — отдадим что есть
                resolve(message.result);
            }
        }
        // Можно ещё какие-либо ответы на действия добавить
    }

    send(message) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not open. Cannot send message:", message);
        }
    }

    async createFile(path, content = '') {
        return new Promise((resolve, reject) => {
            const requestId = ++this.lastCompletionRequestId;
            this.pendingCompletions[requestId] = { resolve, reject };

            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "workspace/createFile",
                params: { path, content }
            });
        });
    }

    async createFolder(path) {
        return new Promise((resolve, reject) => {
            const requestId = ++this.lastCompletionRequestId;
            this.pendingCompletions[requestId] = { resolve, reject };

            this.send({
                jsonrpc: "2.0",
                id: requestId,
                method: "workspace/createFolder",
                params: { path }
            });
        });
    }
}