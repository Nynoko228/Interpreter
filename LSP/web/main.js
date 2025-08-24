document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('code-editor');
    const statusBar = document.getElementById('status-bar');
    const lineNumbersContainer = document.querySelector('.line-numbers-container');
    const lineNumbers = document.querySelector('.line-numbers');
    const activeLineHighlighter = document.getElementById('active-line-highlighter');
    const autocompleteContainer = document.getElementById('autocomplete-container');

    // Создаем клиент LSP
    const lspClient = new LSPClient();
    window.editor = editor;
    window.statusBar = statusBar;
    window.lspClient = lspClient;
    lspClient.connect("ws://localhost:8765").then(async () => {
        statusBar.textContent = 'LSP подключен';
        lspClient.sendDidOpen(editor.value);

        // Попробуем получить спецификацию через LSP
        try {
            const spec = await lspClient.requestSyntax();
            console.log("Спецификация языка от LSP:", spec);

            if (spec && Object.keys(spec).length > 0) {
                await Highlighter.loadSpec(spec);
                    const highlighterApi = Highlighter.attach({
                    editorId: 'code-editor',
                    highlightId: 'highlight',
                    lineNumbersSelector: '.line-numbers',
                    activeLineId: 'active-line-highlighter',
                    debounceMs: 40
                });
                window.highlighterApi = highlighterApi
                console.info("Highlighter: спецификация загружена из LSP");
            } else {
                console.warn("Highlighter: пустая спецификация от LSP — использовать локальную или дефолтную");
            }
        } catch (err) {
            console.error("Не удалось загрузить спецификацию через LSP:", err);
        }
        })
        .catch(error => {
            statusBar.textContent = 'Ошибка подключения к LSP';
            console.error("LSP connection error:", error);
        });

        Highlighter.loadSpec(lspClient).then(() => {
        Highlighter.attach({ editorId: 'code-editor', highlightId: 'highlight' });
    });

    // Инициализация номеров строк
    function updateLineNumbers() {
        const lines = editor.value.split('\n');
        const lineCount = lines.length;
        const currentLineCount = lineNumbers.children.length;

        if (lineCount > currentLineCount) {
            for (let i = currentLineCount + 1; i <= lineCount; i++) {
                const lineNumberDiv = document.createElement('div');
                lineNumberDiv.className = 'line-number';
                lineNumberDiv.textContent = i;
                lineNumbers.appendChild(lineNumberDiv);
            }
        } else if (lineCount < currentLineCount) {
            for (let i = currentLineCount; i > lineCount; i--) {
                lineNumbers.removeChild(lineNumbers.lastChild);
            }
        }

        lineNumbersContainer.scrollTop = editor.scrollTop;
        highlightActiveLine();
    }

    // Подсветка активной строки
    function highlightActiveLine() {
        const oldActive = document.querySelector('.active-line');
        if (oldActive) oldActive.classList.remove('active-line');

        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;

        if (lineNumber < lineNumbers.children.length) {
            lineNumbers.children[lineNumber].classList.add('active-line');
        }

        updateActiveLineHighlighter(lineNumber);
    }

    // Обновление подсветки активной строки
    function updateActiveLineHighlighter(lineNumber) {
        if (!activeLineHighlighter) return;

        const lineHeight = parseFloat(window.getComputedStyle(editor).lineHeight);
        const paddingTop = 20;
        const topPosition = paddingTop + (lineNumber * lineHeight) - editor.scrollTop;

        activeLineHighlighter.style.top = `${topPosition}px`;
        activeLineHighlighter.style.display = 'block';
        activeLineHighlighter.style.height = `${lineHeight}px`;
    }

    // Обработка Tab
    function handleTab(e, isShift) {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;

        const hasSelection = start !== end;
        const startLine = getLineNumberFromPos(start, value);
        const endLine = getLineNumberFromPos(end, value);

        if (hasSelection) {
            handleMultilineTab(isShift, startLine, endLine);
        } else {
            handleSingleCursorTab(isShift, start);
        }

        updateLineNumbers();
    }

    // Обработка табуляции для одного курсора
    function handleSingleCursorTab(isShift, cursorPos) {
        const value = editor.value;
        const lines = value.split('\n');
        const currentLine = getLineNumberFromPos(cursorPos, value);
        const lineText = lines[currentLine];

        if (isShift) {
            const leadingSpaces = lineText.match(/^ */)[0].length;
            const spacesToRemove = Math.min(4, leadingSpaces);

            if (spacesToRemove > 0) {
                const newLine = lineText.substring(spacesToRemove);
                lines[currentLine] = newLine;
                editor.value = lines.join('\n');
                const newCursorPos = cursorPos - spacesToRemove;
                editor.selectionStart = editor.selectionEnd = Math.max(0, newCursorPos);
            }
        } else {
            const before = value.substring(0, cursorPos);
            const after = value.substring(cursorPos);
            editor.value = before + '    ' + after;
            editor.selectionStart = editor.selectionEnd = cursorPos + 4;
        }
    }

    // Обработка табуляции для выделенных строк
    function handleMultilineTab(isShift, startLine, endLine) {
        const value = editor.value;
        const lines = value.split('\n');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        let newLines = [];
        let totalShift = 0;

        for (let i = 0; i < lines.length; i++) {
            if (i >= startLine && i <= endLine) {
                if (isShift) {
                    if (lines[i].startsWith('    ')) {
                        newLines.push(lines[i].substring(4));
                        totalShift -= 4;
                    } else {
                        newLines.push(lines[i]);
                    }
                } else {
                    newLines.push('    ' + lines[i]);
                    totalShift += 4;
                }
            } else {
                newLines.push(lines[i]);
            }
        }

        editor.value = newLines.join('\n');

        if (isShift) {
            editor.selectionStart = Math.max(0, start + totalShift);
            editor.selectionEnd = Math.max(0, end + totalShift);
        } else {
            editor.selectionStart = start;
            editor.selectionEnd = end + totalShift;
        }
    }

    // Получаем номер строки по позиции курсора
    function getLineNumberFromPos(pos, text) {
        const textBefore = text.substring(0, pos);
        return (textBefore.match(/\n/g) || []).length;
    }

    // Показываем подсказки под текущей строкой
    function showSuggestions(suggestions, position) {
        if (!suggestions || suggestions.length === 0) {
            hideSuggestions();
            return;
        }

        // Очистка и наполнение
        autocompleteContainer.innerHTML = '';
        selectedSuggestionIndex = 0;

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';
            if (index === 0) item.classList.add('selected');
            item.textContent = suggestion;

            item.addEventListener('click', () => {
                insertSuggestion(suggestion);
            });

            autocompleteContainer.appendChild(item);
        });

    // ---------- вычисление позиции ----------

    // helper: попробуем достать текст строки из редактора (несколько вариантов API)
        function getLineText(line) {
            try {
//                if (typeof editor.getLine === 'function') {
//                    return editor.getLine(line) || '';
//                }
                if (editor.value !== undefined) { // textarea / input
                    const lines = editor.value.split(/\r?\n/);
                    return lines[line] || '';
                }
//                if (editor.document && typeof editor.document.getLine === 'function') {
//                    return editor.document.getLine(line) || '';
//                }
            } catch (e) {
                // silently fallback
            }
            return '';
        }

        // helper: измерить ширину одного символа в px (создаём невидимый span в том же шрифте, что editor)
        function measureCharWidth() {
            let cached = showSuggestions._charWidth;
            if (cached) return cached;

            const span = document.createElement('span');
            span.style.position = 'absolute';
            span.style.visibility = 'hidden';
            span.style.whiteSpace = 'nowrap';
            // попытка унаследовать ключевые свойства шрифта от редактора
            try {
                const editorStyle = window.getComputedStyle(typeof editor.getWrapperElement === 'function' ? editor.getWrapperElement() : (editor instanceof HTMLElement ? editor : document.body));
                span.style.fontFamily = editorStyle.fontFamily;
                span.style.fontSize = editorStyle.fontSize;
                span.style.fontWeight = editorStyle.fontWeight;
            } catch (e) { /* fallback */ }

            span.textContent = 'm'.repeat(10);
            document.body.appendChild(span);
            const w = span.getBoundingClientRect().width / 10;
            document.body.removeChild(span);
            showSuggestions._charWidth = w || 8;
            return showSuggestions._charWidth;
        }

        const lineText = getLineText(position.line) || '';
        // определяем что считается частью "слова" (тут: буквы, цифры, подчёркивание)
        const isWordChar = ch => /[A-Za-zА-Яа-яЁё0-9_]/.test(ch);
        let wordStartChar = position.character;
        // если курсор на позиции > длины строки — сработает защита
        wordStartChar = Math.min(wordStartChar, lineText.length);

        // двигаемся влево, пока символы — часть слова
        while (wordStartChar > 0 && isWordChar(lineText.charAt(wordStartChar - 1))) {
            wordStartChar--;
        }

        // если не нашли начало слова (например у символа, который не слово), то используем исходную позицию
        if (wordStartChar === position.character) {
            // но если в позиции сам символ не word, то всё равно попробуем взять ближайший непустой префикс
            // оставим как есть — это безопасно
        }

        // Вычисляем пиксельное смещение
        const charWidth = measureCharWidth();
        // Попробуем получить границы редактора, чтобы позиционировать относительно него
        const editorRect = (typeof editor.getBoundingClientRect === 'function') ? editor.getBoundingClientRect() : (editor && editor.getWrapperElement ? editor.getWrapperElement().getBoundingClientRect() : document.body.getBoundingClientRect());
        // внутренний отступ редактора (если есть)
        const editorPaddingLeft = parseFloat(window.getComputedStyle(editor).paddingLeft || 8) || 8;

        // scrollLeft — если редактор поддерживает горизонтальный скролл
        const scrollLeft = (editor.scrollLeft !== undefined) ? editor.scrollLeft : 0;

        // базовый left: левый край редактора + внутренний отступ + смещение до начала слова
        let leftPx = editorRect.left + editorPaddingLeft + (wordStartChar * charWidth) - scrollLeft;

        // учтём горизонтальный скролл страницы (pageXOffset)
        leftPx = leftPx + window.pageXOffset;

        // верх: позиционируем по линии курсора (как у вас раньше) — но безопаснее учитывать реальный top редактора
        const lineHeight = parseFloat(window.getComputedStyle(editor).lineHeight); // оставляем ваш базовый хардкод (можно заменить вычислением)
        const paddingTop = 20;
        const cursorLine = Math.max(0, ((position.line + 1) * lineHeight) - editor.scrollTop + paddingTop);
        let topPx = editorRect.top + cursorLine + window.pageYOffset;

        // ---------- защита от наложения на боковую панель / выходов за экран ----------

        const viewportW = window.innerWidth;
        const viewportH = window.innerHeight;
        const suggW = 200; // желаемая ширина подсказок (вы её раньше явно устанавливали)
        const suggH = Math.min(300, suggestions.length * 24 + 8);

        // если подсказки выходят за правую границу окна, сдвинем их влево
        if (leftPx + suggW > window.pageXOffset + viewportW - 8) {
            leftPx = Math.max(window.pageXOffset + 8, window.pageXOffset + viewportW - suggW - 8);
        }

        // Если боковая панель есть и перекрывает это место, попытаемся разместить подсказки слева от панели
        const sidePanel = document.querySelector('.side-panel, #side-panel, .panel'); // попробуем общие селекторы
        if (sidePanel) {
            const panelRect = sidePanel.getBoundingClientRect();
            const panelLeftGlobal = panelRect.left + window.pageXOffset;
            const panelRightGlobal = panelRect.right + window.pageXOffset;

            // если подсказки попадают под панель (пересечение по горизонтали)
            if (!(leftPx + suggW < panelLeftGlobal || leftPx > panelRightGlobal)) {
                // попробуем сдвинуть подсказки влево от панели (если достаточно места)
                const tryLeft = panelLeftGlobal - suggW - 8;
                if (tryLeft > window.pageXOffset + 8) {
                    leftPx = tryLeft;
                } else {
                    // иначе просто выставим максимально возможную левую позицию (не выходя за экран)
                    leftPx = Math.max(window.pageXOffset + 8, leftPx - panelRect.width - 8);
                }
            }
        }

        // по вертикали: если подсказки выходят за низ экрана — поднять их над курсором
        if (topPx + suggH > window.pageYOffset + viewportH - 8) {
            topPx = Math.max(window.pageYOffset + 8, topPx - suggH - 8);
        }

        // Применяем стили
        autocompleteContainer.style.display = 'block';
        autocompleteContainer.style.top = `${Math.round(topPx)}px`;
        autocompleteContainer.style.left = `${Math.round(leftPx)}px`;
        autocompleteContainer.style.width = `${suggW}px`;
        autocompleteContainer.style.maxHeight = `${suggH}px`;
    }


    // Скрываем подсказки
    function hideSuggestions() {
        autocompleteContainer.style.display = 'none';
        selectedSuggestionIndex = -1;
    }

    // Вставляем выбранную подсказку
    function insertSuggestion(suggestion) {
        // Сохраняем текущие элементы/объекты в локальные переменные
        const editorEl = editor; // ваш textarea
        const lsp = lspClient;   // ваш LSP-клиент

        // Текущая позиция курсора и значение
        const cursorPos = editorEl.selectionStart;
        const value = editorEl.value;

        // Находим начало слова слева (поддержка кириллицы)
        let wordStart = cursorPos;
        while (wordStart > 0 && /[A-Za-zА-Яа-яЁё0-9_]/.test(value.charAt(wordStart - 1))) {
            wordStart--;
        }

        // Находим конец слова справа (необязательно, но безопасно)
        let wordEnd = cursorPos;
        while (wordEnd < value.length && /[A-Za-zА-Яа-яЁё0-9_]/.test(value.charAt(wordEnd))) {
            wordEnd++;
        }

        const before = value.substring(0, wordStart);
        const after = value.substring(cursorPos); // keep text after cursor (not after wordEnd)

        // Вставляем подсказку
        const newValue = before + suggestion + after;
        editorEl.value = newValue;

        // Ставим каретку сразу после вставленного слова
        const newCaret = wordStart + suggestion.length;
        editorEl.selectionStart = editorEl.selectionEnd = newCaret;

        // Синхронизация: обновляем номера/подсветку и уведомляем LSP
        try {
            updateLineNumbers();
        } catch (e) { console.warn("updateLineNumbers error:", e); }

        // сообщаем серверу об изменении прямо (т.к. программное изменение не вызывает input)
        try {
            if (lsp && typeof lsp.sendDidChange === 'function') {
                lsp.sendDidChange(editorEl.value);
            }
        } catch (e) { console.warn("sendDidChange error:", e); }

        // Обновляем overlay — сначала быстрый апдейт текущей строки
        try {
            // используем window.highlighterApi если доступен, иначе fallback на Highlighter.highlightNow()
            if (window.highlighterApi && typeof window.highlighterApi.quickUpdateCurrentLine === 'function') {
                window.highlighterApi.quickUpdateCurrentLine();
            } else if (typeof highlighterApi !== 'undefined' && highlighterApi && typeof highlighterApi.quickUpdateCurrentLine === 'function') {
                highlighterApi.quickUpdateCurrentLine();
            } else if (window.Highlighter && typeof Highlighter.highlightNow === 'function') {
                Highlighter.highlightNow();
            }
        } catch (e) {
            console.warn("Highlighter update failed:", e);
        }

        // Скрываем подсказки
        hideSuggestions();

        // Вернуть фокус в редактор (чтобы каретка видна)
        try { editorEl.focus(); } catch (e) {}

        // И — ВАЖНО — диспатчим событие input, чтобы все обработчики (статус, debounce completion и т.д.) сработали
        // Это необходимо, потому что programmatic change не вызывает native input автоматически
        const ev = new Event('input', { bubbles: true });
        editorEl.dispatchEvent(ev);
    }


    // Получаем текущее слово и позицию курсора
    function getCurrentWord() {
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        // Находим начало текущего слова (с поддержкой кириллицы)
        let wordStart = cursorPos;
        while (wordStart > 0 && /[\wа-яА-ЯёЁ$]/.test(value.charAt(wordStart - 1))) {
            wordStart--;
        }

        // Находим конец текущего слова
        let wordEnd = cursorPos;
        while (wordEnd < value.length && /[\wа-яА-ЯёЁ$]/.test(value.charAt(wordEnd))) {
            wordEnd++;
        }

        const currentWord = value.substring(wordStart, wordEnd);

        // Получаем позицию в строке (LSP использует 0-based индексы)
        const textBeforeCursor = value.substring(0, cursorPos);
        const lines = textBeforeCursor.split('\n');
        const line = Math.max(0, lines.length - 1);

        // Для LSP: character = позиция в текущей строке
        const currentLineText = lines[line] || '';
        const character = cursorPos - (textBeforeCursor.length - currentLineText.length);

        return {
            word: currentWord,
            position: {
                line: line,        // LSP: 0-based строка
                character: character // LSP: 0-based позиция в строке
            }
        };
    }

    // Обновляем выбранный элемент в списке
    function updateSelectedSuggestion(direction) {
        const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
        if (items.length === 0) return;

        if (selectedSuggestionIndex >= 0) {
            items[selectedSuggestionIndex].classList.remove('selected');
        }

        if (direction === 'up') {
            selectedSuggestionIndex = Math.max(0, selectedSuggestionIndex - 1);
        } else if (direction === 'down') {
            selectedSuggestionIndex = Math.min(items.length - 1, selectedSuggestionIndex + 1);
        }

        items[selectedSuggestionIndex].classList.add('selected');
        items[selectedSuggestionIndex].scrollIntoView({
            block: 'nearest',
            behavior: 'auto'
        });
    }

    // Переменные для управления автодополнением
    let selectedSuggestionIndex = -1;
    let completionDebounce;

    // Обработчики событий
    editor.addEventListener('input', () => {
        statusBar.textContent = 'Редактирование...';
        clearTimeout(window.statusTimeout);
        window.statusTimeout = setTimeout(() => {
            statusBar.textContent = 'Готов';
        }, 1000);

        updateLineNumbers();

        // Отправляем изменения в LSP
        lspClient.sendDidChange(editor.value);

        const currentWordInfo = getCurrentWord();
        const word = currentWordInfo.word;

        // Запрос автодополнения с задержкой
        clearTimeout(completionDebounce);
        completionDebounce = setTimeout(async () => {
            // пересчитаем текущее слово и позицию на момент выполнения (могли измениться)
            const current = getCurrentWord();
            const wordNow = current.word || '';
            if (wordNow.length < 1) {
                hideSuggestions();
                return;
            }

            // Опционально: не показываем, если список уже видим и слово пустое
            try {
                statusBar.textContent = 'Загрузка подсказок...';

                const items = await lspClient.requestCompletion(current.position);

                // Если сервер вернул null/undefined — ничего не делаем
                if (!items || items.length === 0) {
                    hideSuggestions();
                    statusBar.textContent = 'Готов';
                    return;
                }

                // Нормализуем labels — items может быть массивом строк или объектов {label: ...}
                const labels = items.map(it => (typeof it === 'string') ? it : (it.label || '')).filter(Boolean);

                // Если среди labels есть точное соответствие текущему слову -> НЕ показываем подсказки
                const lowerWord = wordNow.toLowerCase();
                const exactMatch = labels.find(l => l.toLowerCase() === lowerWord);
                if (exactMatch) {
                    hideSuggestions();
                    statusBar.textContent = 'Готов';
                    return;
                }

                // Иначе показываем подсказки
                showSuggestions(labels, current.position);
                statusBar.textContent = 'Готов';
            } catch (error) {
                console.error("Ошибка автодополнения:", error);
                // Не показываем ничего в ошибочном случае
                hideSuggestions();
            }
        }, 300);

        try {
        highlighterApi.quickUpdateCurrentLine();
        (function hideIfFullyTyped() {
            const cwInfo = getCurrentWord(); // у вас уже есть функция getCurrentWord()
            const cw = cwInfo.word || '';
            if (!cw) {
                hideSuggestions();
                return;
            }

            if (autocompleteContainer.style.display !== 'block') return;

            // получаем текст всех видимых подсказок
            const items = Array.from(autocompleteContainer.querySelectorAll('.autocomplete-item'))
                               .map(el => (el.textContent || '').trim());

            const lowerCW = cw.toLowerCase();

            // проверяем, есть ли подсказка, точно равная введённому слову (регистронезависимо)
            const exact = items.find(it => it.toLowerCase() === lowerCW);
            if (!exact) return;

            // убедимся, что каретка стоит в конце слова (т.е. символ справа не является частью слова)
            const afterChar = editor.value.charAt(editor.selectionStart) || '';
            const isAfterWord = !/[\wа-яА-ЯёЁ0-9_]/.test(afterChar);

            if (isAfterWord) {
                hideSuggestions();
            }
        })();
      } catch (e) {
        console.warn('quickUpdateCurrentLine failed:', e);
      }
    });

    editor.addEventListener('scroll', () => {
        lineNumbersContainer.scrollTop = editor.scrollTop;
        highlightActiveLine();
    });

    editor.addEventListener('click', highlightActiveLine);
    editor.addEventListener('keyup', highlightActiveLine);

    editor.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            setTimeout(highlightActiveLine, 0);
        }

        // Обработка автодополнения
        if (autocompleteContainer.style.display === 'block') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                updateSelectedSuggestion('down');
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                updateSelectedSuggestion('up');
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const items = autocompleteContainer.querySelectorAll('.autocomplete-item');
                if (items.length > 0 && selectedSuggestionIndex >= 0) {
                    items[selectedSuggestionIndex].click();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideSuggestions();
            }
        } else if (e.key === '.' || e.key === ' ') {
            setTimeout(() => {
                const currentWordInfo = getCurrentWord();
                if (currentWordInfo.word.length >= 1) {
                    lspClient.requestCompletion(currentWordInfo.position)
                        .then(result => {
                            if (result.items.length > 0) {
                                showSuggestions(result.items, currentWordInfo.position);
                            }
                        });
                }
            }, 10);
        } else if (e.key === 'Tab') {
            handleTab(e, e.shiftKey);
        }
    });

    // Скрываем автодополнение при клике вне его
    document.addEventListener('click', (e) => {
        if (!autocompleteContainer.contains(e.target) && e.target !== editor) {
            hideSuggestions();
        }
    });

    // Скрываем автодополнение при скролле
    editor.addEventListener('scroll', () => {
        hideSuggestions();
    });

    // Инициализация при загрузке
    updateLineNumbers();

    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;
        updateActiveLineHighlighter(lineNumber);
    });
});