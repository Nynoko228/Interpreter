document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('code-editor');
    const statusBar = document.getElementById('status-bar');
    const lineNumbersContainer = document.querySelector('.line-numbers-container');
    const lineNumbers = document.querySelector('.line-numbers');
    const activeLineHighlighter = document.getElementById('active-line-highlighter');
    const autocompleteContainer = document.getElementById('autocomplete-container');

    // Создаем клиент LSP
    const lspClient = new LSPClient();
    lspClient.connect("ws://localhost:8765").then(() => {
        statusBar.textContent = 'LSP подключен';
        // После подключения отправляем текущее содержимое редактора
        lspClient.sendDidOpen(editor.value);
    }).catch(error => {
        statusBar.textContent = 'Ошибка подключения к LSP';
        console.error("LSP connection error:", error);
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

        const lineHeight = 24;
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
        if (suggestions.length === 0) {
            hideSuggestions();
            return;
        }

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

        const lineHeight = 24;
        const paddingTop = 20;
        const cursorLine = Math.max(0, ((position.line + 1) * lineHeight) - editor.scrollTop + paddingTop);

        autocompleteContainer.style.display = 'block';
        autocompleteContainer.style.top = `${cursorLine}px`;
        autocompleteContainer.style.left = `${position.character * 8 + 50}px`;
        autocompleteContainer.style.width = '200px';
    }

    // Скрываем подсказки
    function hideSuggestions() {
        autocompleteContainer.style.display = 'none';
        selectedSuggestionIndex = -1;
    }

    // Вставляем выбранную подсказку
    function insertSuggestion(suggestion) {
        const cursorPos = editor.selectionStart;
        const value = editor.value;

        let wordStart = cursorPos;
        while (wordStart > 0 && /[\w$]/.test(value.charAt(wordStart - 1))) {
            wordStart--;
        }

        const before = value.substring(0, wordStart);
        const after = value.substring(cursorPos);

        editor.value = before + suggestion + after;
        editor.selectionStart = editor.selectionEnd = wordStart + suggestion.length;

        hideSuggestions();
        updateLineNumbers();
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
            if (word.length >= 1) {
                try {
                    hideSuggestions();
                    statusBar.textContent = 'Загрузка подсказок...';

                    // УБИРАЕМ деструктуризацию position
                    const items = await lspClient.requestCompletion(currentWordInfo.position); // <-- Исправление
                    if (items.length > 0) {
                        showSuggestions(items, currentWordInfo.position);
                        statusBar.textContent = 'Готов';
                    } else {
                        hideSuggestions();
                    }
                } catch (error) {
                    console.error("Ошибка автодополнения:", error);
                }
            } else {
                hideSuggestions();
            }
        }, 300);
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

// Добавляем обработчики для кнопок activity bar
document.addEventListener('DOMContentLoaded', () => {
    const activityBar = document.querySelector('.activity-bar');
    const filesBtn = document.getElementById('files-btn');
    const bookBtn = document.getElementById('book-btn');

    // Обработчики для кнопок
    filesBtn.addEventListener('click', () => {
        activityBar.classList.toggle('collapsed');
        filesBtn.classList.toggle('active', !activityBar.classList.contains('collapsed'));
    });

    bookBtn.addEventListener('click', () => {
        // Здесь можно добавить функционал для кнопки справки
        bookBtn.classList.toggle('active');
        // Пока просто переключаем активное состояние
    });

    // Инициализация активного состояния
    filesBtn.classList.add('active');
});