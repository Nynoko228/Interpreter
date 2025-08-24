// highlighter.js
// Подсветка через overlay <pre> для <textarea>.
// Добавлены: quickUpdateCurrentLine() и возврат API из attach().

const Highlighter = (function () {
  let spec = null;
  let keywordSet = new Set();
  let typeSet = new Set();
  let builtinSet = new Set();
  let operatorSet = new Set();

  let editor = null;
  let highlightEl = null;
  let lineNumbersEl = null;
  let activeLineEl = null;

  let debounceMs = 40;
  let debounceTimer = null;

  // ---------- загрузка спецификации ----------
  function loadSpec(specObj) {
    spec = specObj || { keywords: [], operators: [], types: [], builtin_functions: [] };
    keywordSet = new Set((spec.keywords || []).map(s => String(s).toLowerCase()));
    typeSet = new Set((spec.types || []).map(s => String(s).toLowerCase()));
    builtinSet = new Set((spec.builtin_functions || []).map(s => String(s).toLowerCase()));
    operatorSet = new Set((spec.operators || []).map(s => String(s)));
    return Promise.resolve(spec);
  }

  function loadSpecFromUrl(url) {
    return fetch(url).then(resp => {
      if (!resp.ok) throw new Error('Failed to fetch spec: ' + resp.status);
      return resp.json();
    }).then(json => loadSpec(json));
  }

  // ---------- utils ----------
  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function isIdentChar(ch) {
    return /[A-Za-zА-Яа-яЁё0-9_]/.test(ch);
  }

  // Токенизация одной строки (нет многострочных комментариев, комментарии начинаются с '#')
  function tokenizeLine(line) {
    let i = 0;
    let out = '';

    while (i < line.length) {
      const ch = line[i];

      // комментарий начиная с '#'
      if (ch === '#') {
        out += '<span class="token comment">' + escapeHtml(line.substring(i)) + '</span>';
        break;
      }

      // строка в двойных кавычках
      if (ch === '"') {
        let j = i + 1;
        while (j < line.length) {
          if (line[j] === '"' && line[j - 1] !== '\\') { j++; break; }
          j++;
        }
        out += '<span class="token string">' + escapeHtml(line.substring(i, j)) + '</span>';
        i = j;
        continue;
      }

      // число
      if (/\d/.test(ch)) {
        let j = i + 1;
        while (j < line.length && /[\d.]/.test(line[j])) j++;
        out += '<span class="token number">' + escapeHtml(line.substring(i, j)) + '</span>';
        i = j;
        continue;
      }

      // идентификатор / ключ / тип / builtin / функция
      if (/[A-Za-zА-Яа-яЁё_]/.test(ch)) {
        let j = i + 1;
        while (j < line.length && isIdentChar(line[j])) j++;
        const word = line.substring(i, j);
        const lw = word.toLowerCase();

        // lookahead: пропускаем пробелы, чтобы увидеть '('
        let k = j;
        while (k < line.length && /\s/.test(line[k])) k++;
        const next = (k < line.length) ? line[k] : null;

        if (keywordSet.has(lw)) {
          out += '<span class="token keyword">' + escapeHtml(word) + '</span>';
        } else if (typeSet.has(lw)) {
          out += '<span class="token type">' + escapeHtml(word) + '</span>';
        } else if (builtinSet.has(lw)) {
          out += '<span class="token builtin">' + escapeHtml(word) + '</span>';
        } else if (next === '(') {
          out += '<span class="token func">' + escapeHtml(word) + '</span>';
        } else {
          out += '<span class="token">' + escapeHtml(word) + '</span>';
        }

        i = j;
        continue;
      }

      // операторы из spec
      if (operatorSet.has(ch)) {
        out += '<span class="token op">' + escapeHtml(ch) + '</span>';
        i++;
        continue;
      }

      // прочие символы
      if (/[+\-*/=<>!&|:;.,(){}\[\]]/.test(ch)) {
        out += '<span class="token op">' + escapeHtml(ch) + '</span>';
        i++;
        continue;
      }

      // таб / пробел / прочее
      if (ch === '\t') out += '\t';
      else out += escapeHtml(ch);

      i++;
    }

    return out;
  }

  function highlightAllText(text) {
    const lines = text.split(/\r?\n/);
    const html = lines.map(line => tokenizeLine(line)).join('\n');
    return html;
  }

  // ---------- DOM sync ----------
  function ensureElements(opts) {
    editor = document.getElementById(opts.editorId || 'code-editor');
    highlightEl = document.getElementById(opts.highlightId || 'highlight');
    lineNumbersEl = document.querySelector(opts.lineNumbersSelector || '.line-numbers');
    activeLineEl = document.getElementById(opts.activeLineId || 'active-line-highlighter');

    if (!editor) throw new Error('Highlighter: textarea not found (id: ' + (opts.editorId || 'code-editor') + ')');
    if (!highlightEl) throw new Error('Highlighter: highlight element not found (id: ' + (opts.highlightId || 'highlight') + ')');
  }

  function syncLineNumbers() {
    if (!lineNumbersEl) return;
    const lineCount = (editor.value.match(/\n/g) || []).length + 1;
    const existing = lineNumbersEl.children.length;
    if (existing < lineCount) {
      for (let i = existing + 1; i <= lineCount; i++) {
        const div = document.createElement('div');
        div.className = 'line-number';
        div.textContent = i;
        lineNumbersEl.appendChild(div);
      }
    } else if (existing > lineCount) {
      for (let i = existing; i > lineCount; i--) {
        lineNumbersEl.removeChild(lineNumbersEl.lastChild);
      }
    }

    // активная строка
    if (activeLineEl) {
      const caretPos = editor.selectionStart;
      const before = editor.value.slice(0, caretPos);
      const activeLineIndex = (before.match(/\n/g) || []).length; // 0-based
      const lh = parseInt(getComputedStyle(editor).lineHeight || 24, 10) || 24;
      const topPadding = parseInt(getComputedStyle(editor).paddingTop || 0, 10) || 0;
      activeLineEl.style.display = 'block';
      activeLineEl.style.top = `${activeLineIndex * lh + topPadding}px`;
    }
  }

  function syncHighlight() {
    const text = editor.value;
    highlightEl.innerHTML = highlightAllText(text);
    // синхронизируем скролл/номера
    highlightEl.scrollTop = editor.scrollTop;
    highlightEl.scrollLeft = editor.scrollLeft;
    if (lineNumbersEl) lineNumbersEl.scrollTop = editor.scrollTop;
    syncLineNumbers();
  }

  // ---------- quickUpdateCurrentLine: быстрый апдейт только одной строки ----------
  function quickUpdateCurrentLine() {
    if (!editor || !highlightEl) return;

    const text = editor.value;
    const sel = editor.selectionStart;
    const lines = text.split(/\r?\n/);
    const lineIndex = (text.slice(0, sel).match(/\n/g) || []).length;

    const newLineHtml = tokenizeLine(lines[lineIndex] || '');

    // Попробуем заменить только нужную строку в innerHTML
    let curr = highlightEl.innerHTML || '';
    // Безопасно разбиваем на строки по символу '\n' — мы формировали innerHTML точно так же
    const parts = curr.split('\n');

    if (parts.length === lines.length) {
      parts[lineIndex] = newLineHtml;
      highlightEl.innerHTML = parts.join('\n');
    } else {
      // Если длины не совпадают (например, highlight ещё не инициализирован) — полная перерисовка
      highlightEl.innerHTML = highlightAllText(text);
    }

    // Синхронизация скролла и номеров
    highlightEl.scrollTop = editor.scrollTop;
    highlightEl.scrollLeft = editor.scrollLeft;
    if (lineNumbersEl) lineNumbersEl.scrollTop = editor.scrollTop;
    syncLineNumbers();
  }

  // ---------- attach: подключаем обработчики, возвращаем API ----------
  function attach(opts = {}) {
    ensureElements(opts);
    if (opts.debounceMs !== undefined) debounceMs = opts.debounceMs;

    // initial sync
    syncHighlight();

    // дебаунcная полная перерисовка при вводе
    editor.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncHighlight();
        debounceTimer = null;
      }, debounceMs);
    });

    // синхронизация скролла
    editor.addEventListener('scroll', () => {
      highlightEl.scrollTop = editor.scrollTop;
      highlightEl.scrollLeft = editor.scrollLeft;
      if (lineNumbersEl) lineNumbersEl.scrollTop = editor.scrollTop;
    });

    // обновление номера/активной строки на клике/перемещении каретки
    ['click', 'keyup', 'mouseup'].forEach(evt => {
      editor.addEventListener(evt, () => {
        syncLineNumbers();
      });
    });

    // Возвращаем API: две публичные функции
    return {
      highlightNow: syncHighlight,
      quickUpdateCurrentLine: quickUpdateCurrentLine
    };
  }

  // Экспорт API
  return {
    loadSpec,
    loadSpecFromUrl,
    attach,
    highlightNow: () => {
      if (!editor || !highlightEl) return;
      syncHighlight();
    },
    loadSpecFromLspPayload(payload) {
      const candidate = payload && (payload.spec || payload.syntax || payload);
      return loadSpec(candidate);
    },
    _internal: {
      tokenizeLine,
      highlightAllText,
      getSpec: () => spec
    }
  };
})();
