// Добавляем обработчики для кнопок activity bar
document.addEventListener('DOMContentLoaded', () => {
    const activityBar = document.querySelector('.activity-bar');
    const sidePanel = document.getElementById('side-panel');
    const panelContent = document.getElementById('panel-content');
    const filesBtn = document.getElementById('files-btn');
    const bookBtn = document.getElementById('book-btn');
    const editorContainer = document.querySelector('.editor-container');
    const contextMenu = document.getElementById('context-menu');
    const contextNewFile = document.getElementById('context-new-file');
    const contextNewFolder = document.getElementById('context-new-folder');

    let activePanel = null;
    let fileList = [];
    let isFilesLoaded = false;
    let currentFilePath = null;
    let fileTree = {};
    let currentPath = '';
    let expandedFolders = new Set();

    const saveBtn = document.getElementById('save-btn');
    saveBtn.addEventListener('click', saveCurrentFile);

    // Функция для загрузки файлов
    async function loadFiles(path = '') {
        try {
            console.log('loadFiles called with path:', path);
            statusBar.textContent = 'Загрузка файлов...';
            
            // Default to data folder if no path specified
            if (path === '' || path === 'data') {
                console.log('Loading data folder contents...');
                fileList = await window.lspClient.requestFolder('data');
                currentPath = 'data';
            } else {
                console.log('Loading folder:', path);
                fileList = await window.lspClient.requestFolder(path);
                currentPath = path;
            }
            
            console.log('Loaded files:', fileList);
            console.log('Current path set to:', currentPath);
            
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

            // Сохраняем путь текущего файла
            currentFilePath = filePath;

            // Здесь вы можете обработать содержимое файла
            // Например, открыть его в редакторе
            if (window.editor) {
                window.editor.value = fileContent.content;
                // Вызываем синхронизацию подсветки
                if (window.highlighterApi && typeof window.highlighterApi.highlightNow === 'function') {
                    window.highlighterApi.highlightNow();
                } else if (window.Highlighter && typeof window.Highlighter.highlightNow === 'function') {
                    // Fallback на глобальный Highlighter
                    window.Highlighter.highlightNow();
                }
            }

            statusBar.textContent = 'Готов';
        } catch (error) {
            console.error('Ошибка чтения файла:', error);
            statusBar.textContent = 'Ошибка чтения файла';
        }
    }

    async function saveCurrentFile() {
        if (!currentFilePath) {
            statusBar.textContent = 'Нет открытого файла для сохранения';
            return;
        }

        try {
            statusBar.textContent = 'Сохранение файла...';
            const content = window.editor.value;
            const result = await window.lspClient.saveFile(currentFilePath, content);

            if (result && result.success) {
                statusBar.textContent = 'Файл сохранён';
                // Через 2 секунды вернем статус "Готов"
                setTimeout(() => {
                    if (statusBar.textContent === 'Файл сохранён') {
                        statusBar.textContent = 'Готов';
                    }
                }, 2000);
            } else {
                statusBar.textContent = 'Ошибка сохранения файла';
            }
        } catch (error) {
            console.error('Ошибка сохранения файла:', error);
            statusBar.textContent = 'Ошибка сохранения файла';
        }
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentFile();
        }
    });

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
                // Строим дерево файлов
                fileTree = buildFileTree(fileList);

                const filesHtml = renderFileTree(fileTree);

                panelContent.innerHTML = `
                    <div class="panel-section">
                        <h3>Протоколы поверки</h3>
                        ${filesHtml}
                    </div>
                `;

                // Add click handlers for files and folders
                panelContent.querySelectorAll('.panel-item.directory').forEach(item => {
                    // Enhanced folder click handler with dynamic loading
                    item.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        
                        const path = item.dataset.path;
                        const isExpanded = expandedFolders.has(path);
                        
                        console.log('Folder clicked:', path, 'Currently expanded:', isExpanded);
                        
                        if (!isExpanded) {
                            // Expand the folder - load its contents from server
                            try {
                                console.log('Loading folder contents for:', path);
                                statusBar.textContent = 'Загрузка папки...';
                                
                                // Request folder contents from server
                                const folderContents = await window.lspClient.requestFolder(path);
                                console.log('Loaded folder contents:', folderContents);
                                
                                // Add the new files to our fileList if they're not already there
                                folderContents.forEach(newFile => {
                                    const existingIndex = fileList.findIndex(f => f.path === newFile.path);
                                    if (existingIndex === -1) {
                                        fileList.push(newFile);
                                    }
                                });
                                
                                // Mark this folder as expanded
                                expandedFolders.add(path);
                                
                                // Rebuild and redraw the tree
                                fileTree = buildFileTree(fileList);
                                showPanelContent('files');
                                
                                statusBar.textContent = 'Готов';
                            } catch (error) {
                                console.error('Error loading folder contents:', error);
                                statusBar.textContent = 'Ошибка загрузки папки';
                            }
                        } else {
                            // Collapse the folder
                            console.log('Collapsing folder:', path);
                            expandedFolders.delete(path);
                            
                            // Add visual feedback during animation
                            item.classList.add('expanding');
                            setTimeout(() => item.classList.remove('expanding'), 200);
                            
                            // Re-render the tree with updated states
                            showPanelContent('files');
                        }
                    });
                });

                panelContent.querySelectorAll('.panel-item.file').forEach(item => {
                    item.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const path = item.dataset.path;
                        showFileContent(path);
                    });
                });
            }
        } else if (panelType === 'book') {
            // Код для панели справки
        }
    }

    // Обновленный обработчик для кнопки файлов
    filesBtn.addEventListener('click', async () => {
        // Всегда загружаем data папку при нажатии на кнопку
        console.log('Files button clicked, loading data folder...');
        await loadFiles(''); // Пустая строка означает загрузку data папки по умолчанию
        isFilesLoaded = true;
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

    //Функция для создания нового файла
    async function createNewFile() {
        try {
            // Запрашиваем имя файла у пользователя
            const fileName = prompt('Введите имя нового файла:');
            if (!fileName) return;

            // Определяем путь для нового файла
//            const workspacePath = await getWorkspacePath();
//            const filePath = `${workspacePath}/${fileName}`;

            // Создаем файл через LSP
            const result = await lspClient.createFile(fileName, '');

            if (result && result.success) {
                statusBar.textContent = `Файл создан: ${fileName}`;

                // Обновляем список файлов
                isFilesLoaded = false;
                await loadFiles(''); // Перезагружаем data папку
                showPanelContent('files');
            } else {
                statusBar.textContent = 'Ошибка создания файла';
            }
        } catch (error) {
            console.error('Ошибка создания файла:', error);
            statusBar.textContent = 'Ошибка создания файла';
        }
    }

    //Функция для создания новой папки
    async function createNewFolder() {
        try {
            // Запрашиваем имя папки у пользователя
            const folderName = prompt('Введите имя новой папки:');
            if (!folderName) return;

            // Определяем путь для новой папки
//            const workspacePath = await getWorkspacePath();
//            const folderPath = `${workspacePath}/${folderName}`;

            // Создаем папку через LSP
            const result = await lspClient.createFolder(folderName);

            if (result && result.success) {
                statusBar.textContent = `Папка создана: ${folderName}`;
                console.log(`Папка создана: ${folderName}`);
                // Обновляем список файлов
                isFilesLoaded = false;
                await loadFiles(''); // Перезагружаем data папку
                showPanelContent('files');
            } else {
                statusBar.textContent = 'Ошибка создания папки';
            }
        } catch (error) {
            console.error('Ошибка создания папки:', error);
            statusBar.textContent = 'Ошибка создания папки';
        }
    }

    // Вспомогательная функция для получения пути к рабочей директории
    async function getWorkspacePath() {
        try {
            // Получаем список файлов, чтобы определить рабочую директорию
            if (!isFilesLoaded) {
                await loadFiles();
            }

            // Берем путь первого файла/папки и извлекаем из него корневую директорию
            if (fileList.length > 0 && fileList[0].path) {
                const firstPath = fileList[0].path;
                return firstPath.substring(0, firstPath.lastIndexOf('/'));
            }

            // Если не удалось определить, возвращаем путь по умолчанию
            return '/tmp/workspace';
        } catch (error) {
            console.error('Ошибка получения пути рабочей директории:', error);
            return '/tmp/workspace';
        }
    }

    // Improved function for building file tree from flat list
    function buildFileTree(files) {
        console.log('Building file tree from files:', files);
        const tree = {};

        files.forEach(file => {
            console.log('Processing file:', file);
            
            // Handle both Windows and Unix path separators
            const pathParts = file.path.split(/[\/\\]/).filter(part => part !== '');
            console.log('Path parts for', file.path, ':', pathParts);
            
            let currentLevel = tree;

            pathParts.forEach((part, index) => {
                const currentPath = pathParts.slice(0, index + 1).join('/');
                const isLastPart = index === pathParts.length - 1;
                
                if (!currentLevel[part]) {
                    currentLevel[part] = {
                        name: part,
                        path: currentPath,
                        isDirectory: !isLastPart || file.isDirectory,
                        children: {},
                        isExpanded: false
                    };
                    console.log(`Created node for ${part}:`, currentLevel[part]);
                }

                // If this is the final part, merge the file data
                if (isLastPart) {
                    currentLevel[part] = {
                        ...currentLevel[part],
                        ...file,
                        path: currentPath, // Ensure consistent path
                        children: currentLevel[part].children // Preserve children
                    };
                    console.log(`Final node for ${part}:`, currentLevel[part]);
                }

                // Move to the next level
                currentLevel = currentLevel[part].children;
            });
        });

        console.log('Built file tree:', tree);
        return tree;
    }

    // Enhanced function for rendering file tree with debugging
    function renderFileTree(tree, level = 0) {
        console.log(`Rendering tree at level ${level}:`, tree);
        console.log('Current expanded folders:', Array.from(expandedFolders));
        
        const items = Object.values(tree).sort((a, b) => {
            // Folders first, then files
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        return items.map(item => {
            const isExpanded = expandedFolders.has(item.path);
            const hasChildren = Object.keys(item.children || {}).length > 0;
            
            console.log(`Rendering item: ${item.name}, path: ${item.path}, isDirectory: ${item.isDirectory}, hasChildren: ${hasChildren}, isExpanded: ${isExpanded}`);

            // For directories, always show arrow - we'll load content dynamically
            // For files, don't show arrow
            const showArrow = item.isDirectory;
            const arrowClass = showArrow ? 
                (isExpanded ? 'expanded' : 'collapsed') : 'no-children';
            
            const folderIconClass = item.isDirectory ? 
                (isExpanded ? 'expanded' : 'collapsed') : 'file';
            
            // Determine folder/file symbol
            const folderIcon = item.isDirectory ?
                (isExpanded ? '📂' : '📁') : '📄';

            const childrenHtml = item.isDirectory && isExpanded && hasChildren ?
                renderFileTree(item.children, level + 1) : '';

            return `
                <div class="panel-item ${item.isDirectory ? 'directory' : 'file'}"
                     data-path="${item.path}"
                     data-is-directory="${item.isDirectory}"
                     data-expanded="${isExpanded}"
                     style="padding-left: ${level * 16 + 8}px;">
                    <div class="folder-content">
                        ${showArrow ? 
                            `<span class="expand-icon ${arrowClass}"></span>` :
                            '<span class="expand-icon-placeholder"></span>'}
                        <span class="folder-icon ${folderIconClass}">${folderIcon}</span>
                        <span class="folder-name">${item.name}</span>
                    </div>
                </div>
                ${childrenHtml}
            `;
        }).join('');
    }

    // Обработчики для пунктов меню
    contextNewFile.addEventListener('click', createNewFile);
    contextNewFolder.addEventListener('click', createNewFolder);

    // Показать контекстное меню при правом клике на sidePanel
    sidePanel.addEventListener('contextmenu', (e) => {
        if (sidePanel.classList.contains('open')) {
            e.preventDefault();
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        }
    });

    // Скрыть контекстное меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
        }
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
