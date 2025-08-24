// Добавляем обработчики для кнопок activity bar
document.addEventListener('DOMContentLoaded', () => {
    const activityBar = document.querySelector('.activity-bar');
    const sidePanel = document.getElementById('side-panel');
    const panelContent = document.getElementById('panel-content');
    const filesBtn = document.getElementById('files-btn');
    const bookBtn = document.getElementById('book-btn');
    const editorContainer = document.querySelector('.editor-container');

    let activePanel = null;
    let fileList = [];
    let isFilesLoaded = false;

    // Функция для загрузки файлов
    async function loadFiles() {
        if (isFilesLoaded) return;

        try {
            statusBar.textContent = 'Загрузка файлов...';
            fileList = await window.lspClient.requestFiles();
            isFilesLoaded = true;
            statusBar.textContent = 'Готов';
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
            statusBar.textContent = 'Ошибка загрузки файлов';
        }
    }

    // Функция для показа содержимого файла
    async function showFileContent(filePath) {
        try {
            statusBar.textContent = 'Загрузка файла...';
            const fileContent = await window.lspClient.readFile(filePath);

            // Здесь вы можете обработать содержимое файла
            // Например, открыть его в редакторе
            if (window.editor) {
                window.editor.value = fileContent.content;
            }

            statusBar.textContent = 'Готов';
        } catch (error) {
            console.error('Ошибка чтения файла:', error);
            statusBar.textContent = 'Ошибка чтения файла';
        }
    }

    // Функция для показа контента в панели
    async function showPanelContent(panelType) {
        panelContent.innerHTML = '';

        if (panelType === 'files') {
            if (fileList.length === 0) {
                panelContent.innerHTML = `
                    <div class="panel-section">
                        <h3>Файлы проекта</h3>
                        <div>Нет файлов или загрузка не выполнена</div>
                    </div>
                `;
            } else {
                const safeFileList = (fileList || []).filter(f => f && typeof f === 'object');

                const filesHtml = safeFileList.map(file => `
                    <div class="panel-item" data-path="${file.path}" data-is-directory="${file.isDirectory}">
                        ${file.isDirectory ? '📁' : '📄'} ${file.name}
                    </div>
                `).join('');

                panelContent.innerHTML = `
                    <div class="panel-section">
                        <h3>Программы поверки</h3>
                        ${filesHtml}
                    </div>
                `;

                // Добавляем обработчики кликов на файлы
                panelContent.querySelectorAll('.panel-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const path = item.dataset.path;
                        const isDirectory = item.dataset.isDirectory === 'true';

                        if (!isDirectory) {
                            showFileContent(path);
                        }
                    });
                });
            }
        } else if (panelType === 'book') {
            // ... существующий код ...
        }
    }

    // Обновленный обработчик для кнопки файлов
    filesBtn.addEventListener('click', async () => {
        await loadFiles();
        showPanelContent('files');
        togglePanel('files');
    });

    // Функция для переключения панели
    async function togglePanel(panelType) {
        // Если нажата та же кнопка - закрываем/открываем панель
        if (activePanel === panelType) {
            sidePanel.classList.toggle('open');
            if (!sidePanel.classList.contains('open')) {
                activePanel = null;
            }
        } else {
            // Если нажата другая кнопка - меняем контент
            activePanel = panelType;
            sidePanel.classList.add('open');
            showPanelContent(panelType);
        }

        // Обновляем активные кнопки
        filesBtn.classList.toggle('active', activePanel === 'files');
        bookBtn.classList.toggle('active', activePanel === 'book');
    }

    bookBtn.addEventListener('click', () => {
        togglePanel('book');
    });
    // Закрытие панели при клике вне ее области
//    document.addEventListener('click', (e) => {
//        if (!sidePanel.contains(e.target) && !activityBar.contains(e.target) && sidePanel.classList.contains('open')) {
//            sidePanel.classList.remove('open');
//            activePanel = null;
//            filesBtn.classList.remove('active');
//            bookBtn.classList.remove('active');
//        }
//    });
});