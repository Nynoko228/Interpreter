document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('code-editor');
    const statusBar = document.getElementById('status-bar');
    const lineNumbers = document.querySelector('.line-numbers');
    const activeLineHighlighter = document.getElementById('active-line-highlighter');

    // Инициализация номеров строк
    function updateLineNumbers() {
        const lines = editor.value.split('\n');
        const lineCount = lines.length;

        // Создаем номера строк
        let numbersHTML = '';
        for (let i = 1; i <= lineCount; i++) {
            numbersHTML += `<div class="line-number">${i}</div>`;
        }

        lineNumbers.innerHTML = numbersHTML;
        lineNumbers.style.height = editor.scrollHeight + 'px';

        // Обновляем подсветку активной строки
        highlightActiveLine();
    }

    // Подсветка активной строки
    function highlightActiveLine() {
        // Удаляем предыдущую подсветку
        const oldActive = document.querySelector('.active-line');
        if (oldActive) oldActive.classList.remove('active-line');

        // Получаем номер активной строки
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;

        // Добавляем подсветку номера строки
        if (lineNumbers.children[lineNumber]) {
            lineNumbers.children[lineNumber].classList.add('active-line');
        }

        // Обновляем подсветку всей строки
        updateActiveLineHighlighter(lineNumber);
    }

    // Обновление подсветки активной строки
    function updateActiveLineHighlighter(lineNumber) {
        if (!activeLineHighlighter) return;

        // Рассчитываем позицию активной строки
        const lineHeight = 24; // Должно соответствовать line-height в CSS
        const paddingTop = 20; // Должно соответствовать padding-top редактора

        // Позиция с учетом прокрутки
        const topPosition = paddingTop + (lineNumber * lineHeight) - editor.scrollTop;

        // Обновляем позицию и показываем подсветку
        activeLineHighlighter.style.top = `${topPosition}px`;
        activeLineHighlighter.style.display = 'block';
        activeLineHighlighter.style.height = `${lineHeight}px`;
    }

    // Обработка Tab для всех случаев
    function handleTab(e, isShift) {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const value = editor.value;

        // Определяем, выделен ли текст
        const hasSelection = start !== end;

        // Определяем границы выделения по строкам
        const startLine = getLineNumberFromPos(start, value);
        const endLine = getLineNumberFromPos(end, value);

        // Обрабатываем разные случаи
        if (hasSelection) {
            // Случай 1: Выделен текст (одна или несколько строк)
            handleMultilineTab(isShift, startLine, endLine);
        } else {
            // Случай 2: Нет выделения (курсор стоит)
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
            // Shift+Tab - снимаем табуляцию
            // Находим количество пробелов в начале строки
            const leadingSpaces = lineText.match(/^ */)[0].length;
            const spacesToRemove = Math.min(4, leadingSpaces);

            if (spacesToRemove > 0) {
                // Удаляем пробелы
                const newLine = lineText.substring(spacesToRemove);
                lines[currentLine] = newLine;

                // Сохраняем новое значение
                editor.value = lines.join('\n');

                // Корректируем позицию курсора
                const newCursorPos = cursorPos - spacesToRemove;
                editor.selectionStart = editor.selectionEnd = Math.max(0, newCursorPos);
            }
        } else {
            // Обычный Tab - добавляем 4 пробела в позицию курсора
            const before = value.substring(0, cursorPos);
            const after = value.substring(cursorPos);
            editor.value = before + '    ' + after;

            // Перемещаем курсор после добавленных пробелов
            editor.selectionStart = editor.selectionEnd = cursorPos + 4;
        }
    }

    // Обработка табуляции для выделенных строк
    function handleMultilineTab(isShift, startLine, endLine) {
        const value = editor.value;
        const lines = value.split('\n');

        // Сохраняем текущее выделение
        const start = editor.selectionStart;
        const end = editor.selectionEnd;

        // Обрабатываем строки в выделении
        let newLines = [];
        let totalShift = 0;

        for (let i = 0; i < lines.length; i++) {
            if (i >= startLine && i <= endLine) {
                if (isShift) {
                    // Удаляем табуляцию (4 пробела) в начале строки
                    if (lines[i].startsWith('    ')) {
                        newLines.push(lines[i].substring(4));
                        totalShift -= 4;
                    } else {
                        newLines.push(lines[i]);
                    }
                } else {
                    // Добавляем табуляцию в начало строки
                    newLines.push('    ' + lines[i]);
                    totalShift += 4;
                }
            } else {
                newLines.push(lines[i]);
            }
        }

        // Устанавливаем новое значение
        editor.value = newLines.join('\n');

        // Восстанавливаем выделение с учетом изменений
        if (isShift) {
            editor.selectionStart = Math.max(0, start + totalShift);
            editor.selectionEnd = Math.max(0, end + totalShift);
        } else {
//            editor.selectionStart = start + 4;
            editor.selectionStart = start;
            editor.selectionEnd = end + totalShift;
        }
    }

    // Получаем номер строки по позиции курсора
    function getLineNumberFromPos(pos, text) {
        const textBefore = text.substring(0, pos);
        return (textBefore.match(/\n/g) || []).length;
    }

    // Обработчики событий
    editor.addEventListener('input', () => {
        statusBar.textContent = 'Редактирование...';
        clearTimeout(window.statusTimeout);
        window.statusTimeout = setTimeout(() => {
            statusBar.textContent = 'Готов';
        }, 1000);
        updateLineNumbers();
    });

    editor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = editor.scrollTop;
        // Обновляем подсветку при прокрутке
        const cursorPos = editor.selectionStart;
        const textBeforeCursor = editor.value.substring(0, cursorPos);
        const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;
        updateActiveLineHighlighter(lineNumber);
    });

    editor.addEventListener('click', highlightActiveLine);
    editor.addEventListener('keyup', highlightActiveLine);

    // Обработка перемещения курсора
    editor.addEventListener('keydown', (e) => {
        // Обновляем подсветку при перемещении стрелками
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            setTimeout(highlightActiveLine, 0);
        }

        // Обработка Tab и Shift+Tab
        if (e.key === 'Tab') {
            handleTab(e, e.shiftKey);
        }
    });
    
    // Инициализация при загрузке
    updateLineNumbers();
});