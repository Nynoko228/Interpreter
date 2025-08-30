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
    
    // Переменные для контекстного меню
    let contextMenuTarget = null; // Элемент, по которому кликнули
    let draggedElement = null; // Элемент для drag & drop
    let dropIndicator = null; // Индикатор места сброса

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

    // Функция для создания файла в указанной папке
    async function createFileInFolder() {
        try {
            // Определяем целевую папку
            let targetPath;
            if (contextMenuTarget) {
                if (contextMenuTarget.isDirectory) {
                    // Создаём в выбранной папке
                    targetPath = contextMenuTarget.path;
                } else {
                    // Создаём в родительской папке файла
                    targetPath = getParentPath(contextMenuTarget.path);
                }
            } else {
                // Создаём в корневой папке
                targetPath = currentPath;
            }
            
            // Запрашиваем имя файла у пользователя
            const fileName = prompt('Введите имя нового файла:');
            if (!fileName) return;
            
            if (!validateFileName(fileName)) {
                statusBar.textContent = 'Некорректное имя файла';
                return;
            }
            
            statusBar.textContent = 'Создание файла...';
            
            // Создаем файл через LSP
            const result = await lspClient.createFileInFolder(targetPath, fileName, '');
            
            if (result && result.success) {
                statusBar.textContent = `Файл создан: ${fileName}`;
                
                // Обновляем список файлов
                await refreshCurrentFolder();
            } else {
                statusBar.textContent = 'Ошибка создания файла';
            }
        } catch (error) {
            console.error('Ошибка создания файла:', error);
            statusBar.textContent = 'Ошибка создания файла';
        }
    }
    
    //Функция для создания нового файла (устаревшая)
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

    // Функция для создания папки в указанной папке
    async function createFolderInFolder() {
        try {
            // Определяем целевую папку
            let targetPath;
            if (contextMenuTarget) {
                if (contextMenuTarget.isDirectory) {
                    // Создаём в выбранной папке
                    targetPath = contextMenuTarget.path;
                } else {
                    // Создаём в родительской папке файла
                    targetPath = getParentPath(contextMenuTarget.path);
                }
            } else {
                // Создаём в корневой папке
                targetPath = currentPath;
            }
            
            // Запрашиваем имя папки у пользователя
            const folderName = prompt('Введите имя новой папки:');
            if (!folderName) return;
            
            if (!validateFileName(folderName)) {
                statusBar.textContent = 'Некорректное имя папки';
                return;
            }
            
            statusBar.textContent = 'Создание папки...';
            
            // Создаем папку через LSP
            const result = await lspClient.createFolderInFolder(targetPath, folderName);
            
            if (result && result.success) {
                statusBar.textContent = `Папка создана: ${folderName}`;
                
                // Обновляем список файлов
                await refreshCurrentFolder();
            } else {
                statusBar.textContent = 'Ошибка создания папки';
            }
        } catch (error) {
            console.error('Ошибка создания папки:', error);
            statusBar.textContent = 'Ошибка создания папки';
        }
    }
    
    //Функция для создания новой папки (устаревшая)
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
    
    // Функция для валидации имени файла/папки
    function validateFileName(name) {
        if (!name || name.trim().length === 0) {
            return false;
        }
        
        // Проверка на недопустимые символы для Windows
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) {
            return false;
        }
        
        // Проверка на зарезервированные имена Windows
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 
                              'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 
                              'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 
                              'LPT7', 'LPT8', 'LPT9'];
        
        if (reservedNames.includes(name.toUpperCase())) {
            return false;
        }
        
        return true;
    }
    
    // Функция для получения родительского пути
    function getParentPath(path) {
        if (!path || path === currentPath) {
            return currentPath;
        }
        const lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) {
            return currentPath;
        }
        return path.substring(0, lastSlash) || currentPath;
    }
    
    // Функция для обновления текущей папки
    async function refreshCurrentFolder() {
        try {
            console.log('Обновление папки:', currentPath);
            
            // Полностью перезагружаем список файлов с сервера
            isFilesLoaded = false;
            fileList = [];
            
            // Загружаем корневую папку
            await loadFiles(currentPath);
            
            // Для каждой раскрытой папки догружаем содержимое
            for (const expandedPath of expandedFolders) {
                try {
                    const folderContents = await window.lspClient.requestFolder(expandedPath);
                    // Добавляем новые файлы в fileList
                    folderContents.forEach(newFile => {
                        const existingIndex = fileList.findIndex(f => f.path === newFile.path);
                        if (existingIndex === -1) {
                            fileList.push(newFile);
                        }
                    });
                } catch (error) {
                    console.error('Ошибка загрузки папки:', expandedPath, error);
                }
            }
            
            // Перестроиваем дерево
            fileTree = buildFileTree(fileList);
            showPanelContent('files');
            
            console.log('Обновление завершено, файлов:', fileList.length);
        } catch (error) {
            console.error('Ошибка обновления папки:', error);
            statusBar.textContent = 'Ошибка обновления';
        }
    }
    
    // Функция для переименования элемента
    async function renameItem() {
        if (!contextMenuTarget || !contextMenuTarget.element) {
            return;
        }
        
        try {
            const currentName = contextMenuTarget.name;
            const newName = prompt('Введите новое имя:', currentName);
            
            if (!newName || newName === currentName) {
                return; // Отмена или имя не изменилось
            }
            
            if (!validateFileName(newName)) {
                statusBar.textContent = 'Некорректное имя';
                return;
            }
            
            statusBar.textContent = 'Переименование...';
            
            const result = await lspClient.renameItem(contextMenuTarget.path, newName);
            
            if (result && result.success) {
                statusBar.textContent = `Переименовано: ${currentName} → ${newName}`;
                
                // Обновляем раскрытые папки, если переименовывалась папка
                if (contextMenuTarget.isDirectory && result.newPath) {
                    updateExpandedFoldersAfterRename(contextMenuTarget.path, result.newPath);
                }
                
                // Обновляем текущий файл в редакторе, если он был переименован
                if (currentFilePath === contextMenuTarget.path && result.newPath) {
                    currentFilePath = result.newPath;
                }
                
                await refreshCurrentFolder();
            } else {
                statusBar.textContent = 'Ошибка переименования';
            }
        } catch (error) {
            console.error('Ошибка переименования:', error);
            statusBar.textContent = 'Ошибка переименования';
        }
    }
    
    // Функция для обновления раскрытых папок после переименования
    function updateExpandedFoldersAfterRename(oldPath, newPath) {
        const newExpandedFolders = new Set();
        
        for (const expandedPath of expandedFolders) {
            if (expandedPath === oldPath) {
                newExpandedFolders.add(newPath);
            } else if (expandedPath.startsWith(oldPath + '/')) {
                // Обновляем вложенные папки
                const relativePath = expandedPath.substring(oldPath.length);
                newExpandedFolders.add(newPath + relativePath);
            } else {
                newExpandedFolders.add(expandedPath);
            }
        }
        
        expandedFolders = newExpandedFolders;
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
    contextNewFile.addEventListener('click', () => createFileInFolder());
    contextNewFolder.addEventListener('click', () => createFolderInFolder());
    
    // Добавляем обработчик для переименования
    const contextRename = document.getElementById('context-rename');
    if (contextRename) {
        contextRename.addEventListener('click', () => renameItem());
    }

    // Показать контекстное меню при правом клике
    sidePanel.addEventListener('contextmenu', (e) => {
        if (sidePanel.classList.contains('open')) {
            e.preventDefault();
            
            // Определяем элемент, по которому кликнули
            const targetElement = e.target.closest('.panel-item');
            
            if (targetElement) {
                // Клик по файлу или папке
                contextMenuTarget = {
                    element: targetElement,
                    path: targetElement.dataset.path,
                    isDirectory: targetElement.dataset.isDirectory === 'true',
                    name: targetElement.querySelector('.folder-name').textContent
                };
            } else {
                // Клик по пустому месту - создаём в корневой папке
                contextMenuTarget = {
                    element: null,
                    path: currentPath,
                    isDirectory: true,
                    name: 'корневая папка'
                };
            }
            
            // Настраиваем видимость пунктов меню
            configureContextMenu();
            
            contextMenu.style.display = 'block';
            contextMenu.style.left = `${e.pageX}px`;
            contextMenu.style.top = `${e.pageY}px`;
        }
    });

    // Скрыть контекстное меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            contextMenu.style.display = 'none';
            contextMenuTarget = null;
        }
    });
    
    // Функция для настройки видимости пунктов контекстного меню
    function configureContextMenu() {
        const renameItem = document.getElementById('context-rename');
        
        if (contextMenuTarget && contextMenuTarget.element) {
            // Есть выбранный элемент - показываем переименование
            if (renameItem) renameItem.style.display = 'block';
        } else {
            // Клик по пустому месту - скрываем переименование
            if (renameItem) renameItem.style.display = 'none';
        }
    }
    // Инициализация drag & drop
    initializeDragAndDrop();
    
    // Функция для инициализации drag & drop
    function initializeDragAndDrop() {
        console.log('Инициализация drag & drop системы');
        
        // Обработчики для начала перетаскивания
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Предотвращаем стандартное поведение drag & drop
        document.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    }
    
    // Обработчик нажатия кнопки мыши
    function handleMouseDown(e) {
        // Проверяем, нажата ли левая кнопка мыши
        if (e.button !== 0) return;
        
        const panelItem = e.target.closest('.panel-item');
        if (!panelItem || !sidePanel.classList.contains('open')) {
            return;
        }
        
        // Проверяем, что клик не по expand icon
        if (e.target.closest('.expand-icon')) {
            return;
        }
        
        // Сохраняем информацию о перетаскиваемом элементе
        draggedElement = {
            element: panelItem,
            path: panelItem.dataset.path,
            isDirectory: panelItem.dataset.isDirectory === 'true',
            name: panelItem.querySelector('.folder-name').textContent,
            startX: e.clientX,
            startY: e.clientY,
            isDragging: false
        };
        
        // Предотвращаем выделение текста
        e.preventDefault();
    }
    
    // Обработчик движения мыши
    function handleMouseMove(e) {
        if (!draggedElement) return;
        
        // Проверяем, началось ли перетаскивание
        const deltaX = Math.abs(e.clientX - draggedElement.startX);
        const deltaY = Math.abs(e.clientY - draggedElement.startY);
        
        if (!draggedElement.isDragging && (deltaX > 5 || deltaY > 5)) {
            // Начинаем перетаскивание
            draggedElement.isDragging = true;
            startDragging();
        }
        
        if (draggedElement.isDragging) {
            updateDragVisuals(e);
            updateDropTarget(e);
        }
    }
    
    // Обработчик отпускания кнопки мыши
    function handleMouseUp(e) {
        if (!draggedElement) return;
        
        if (draggedElement.isDragging) {
            handleDrop(e);
        }
        
        // Очищаем состояние
        cleanup();
    }
    
    // Начало перетаскивания
    function startDragging() {
        // Добавляем визуальные эффекты
        draggedElement.element.style.opacity = '0.5';
        draggedElement.element.style.pointerEvents = 'none';
        
        // Создаём индикатор перетаскивания
        createDragIndicator();
        
        // Добавляем класс к body для изменения курсора
        document.body.classList.add('dragging');
        
        console.log('Начато перетаскивание:', draggedElement.name);
    }
    
    // Создание индикатора перетаскивания
    function createDragIndicator() {
        if (dropIndicator) {
            dropIndicator.remove();
        }
        
        dropIndicator = document.createElement('div');
        dropIndicator.className = 'drag-indicator';
        dropIndicator.innerHTML = `
            <span class="drag-icon">${draggedElement.isDirectory ? '📁' : '📄'}</span>
            <span class="drag-name">${draggedElement.name}</span>
        `;
        
        document.body.appendChild(dropIndicator);
    }
    
    // Обновление визуальных эффектов перетаскивания
    function updateDragVisuals(e) {
        if (dropIndicator) {
            dropIndicator.style.left = `${e.clientX + 10}px`;
            dropIndicator.style.top = `${e.clientY - 10}px`;
        }
    }
    
    // Обновление цели сброса
    function updateDropTarget(e) {
        // Убираем предыдущую подсветку
        document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
        
        // Находим элемент под курсором
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        const targetItem = elementUnderCursor?.closest('.panel-item');
        
        // Проверяем сброс на папку
        if (targetItem && targetItem !== draggedElement.element) {
            const isTargetDirectory = targetItem.dataset.isDirectory === 'true';
            
            // Можно сбрасывать только в папки
            if (isTargetDirectory) {
                targetItem.classList.add('drop-target');
            }
        } 
        // Проверяем сброс на пустую область панели (корневая папка)
        else if (elementUnderCursor?.closest('.panel-section') && !targetItem) {
            // Если курсор над панелью файлов, но не над конкретным элементом
            const panelSection = elementUnderCursor.closest('.panel-section');
            panelSection.classList.add('drop-target');
        }
    }
    
    // Обработка сброса
    function handleDrop(e) {
        const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
        const targetItem = elementUnderCursor?.closest('.panel-item');
        
        // Проверяем сброс на папку
        if (targetItem && targetItem !== draggedElement.element) {
            const isTargetDirectory = targetItem.dataset.isDirectory === 'true';
            const targetPath = targetItem.dataset.path;
            const targetName = targetItem.querySelector('.folder-name').textContent;
            
            if (isTargetDirectory) {
                // Показываем диалог подтверждения
                showMoveConfirmation(draggedElement, targetPath, targetName);
            }
        }
        // Проверяем сброс на корневую область
        else if (elementUnderCursor?.closest('.panel-section') && !targetItem) {
            // Перемещение в корневую папку (data)
            showMoveToRootConfirmation(draggedElement);
        }
    }
    
    // Показ диалога подтверждения перемещения
    function showMoveConfirmation(sourceItem, targetPath, targetName) {
        const sourceType = sourceItem.isDirectory ? 'папку' : 'файл';
        const message = `Переместить ${sourceType} "${sourceItem.name}" в папку "${targetName}" (путь: ${targetPath})?`;
        
        if (confirm(message)) {
            performMove(sourceItem.path, targetPath, sourceItem.isDirectory, sourceItem.name);
        }
    }
    
    // Показ диалога подтверждения перемещения в корень
    function showMoveToRootConfirmation(sourceItem) {
        const sourceType = sourceItem.isDirectory ? 'папку' : 'файл';
        const message = `Переместить ${sourceType} "${sourceItem.name}" в корневую папку?`;
        
        if (confirm(message)) {
            // Используем пустую строку для корневой папки вместо currentPath
            performMove(sourceItem.path, '', sourceItem.isDirectory, sourceItem.name);
        }
    }
    
    // Выполнение перемещения
    async function performMove(sourcePath, targetPath, isDirectory, itemName) {
        try {
            statusBar.textContent = 'Перемещение...';
            
            const result = await lspClient.moveItem(sourcePath, targetPath);
            
            if (result && result.success) {
                statusBar.textContent = `Перемещено: ${sourcePath} → ${targetPath || 'корень'}`;
                
                // Обновляем раскрытые папки
                if (isDirectory && result.newPath) {
                    updateExpandedFoldersAfterMove(sourcePath, result.newPath);
                }
                
                // Обновляем текущий файл в редакторе
                if (currentFilePath === sourcePath && result.newPath) {
                    currentFilePath = result.newPath;
                }
                
                // Обновляем fileList - удаляем старые записи и перезагружаем
                await updateFileListAfterMove(sourcePath, result.newPath, isDirectory);
            } else {
                statusBar.textContent = 'Ошибка перемещения';
            }
        } catch (error) {
            console.error('Ошибка перемещения:', error);
            statusBar.textContent = 'Ошибка перемещения';
        }
    }
    
    // Обновление раскрытых папок после перемещения
    function updateExpandedFoldersAfterMove(oldPath, newPath) {
        const newExpandedFolders = new Set();
        
        for (const expandedPath of expandedFolders) {
            if (expandedPath === oldPath) {
                newExpandedFolders.add(newPath);
            } else if (expandedPath.startsWith(oldPath + '/')) {
                // Обновляем вложенные папки
                const relativePath = expandedPath.substring(oldPath.length);
                newExpandedFolders.add(newPath + relativePath);
            } else {
                newExpandedFolders.add(expandedPath);
            }
        }
        
        expandedFolders = newExpandedFolders;
    }
    
    // Обновление fileList после перемещения
    async function updateFileListAfterMove(oldPath, newPath, isDirectory) {
        // Удаляем старые записи
        if (isDirectory) {
            // Для папок удаляем саму папку и всё её содержимое
            fileList = fileList.filter(file => 
                file.path !== oldPath && !file.path.startsWith(oldPath + '/')
            );
        } else {
            // Для файлов удаляем только сам файл
            fileList = fileList.filter(file => file.path !== oldPath);
        }
        
        // Полностью перезагружаем дерево файлов с сервера
        try {
            await refreshCurrentFolder();
        } catch (error) {
            console.error('Ошибка обновления после перемещения:', error);
        }
        
        console.log('Обновлён fileList после перемещения:', fileList.length, 'элементов');
    }
    
    // Очистка после перетаскивания
    function cleanup() {
        if (draggedElement) {
            // Восстанавливаем внешний вид элемента
            draggedElement.element.style.opacity = '';
            draggedElement.element.style.pointerEvents = '';
            draggedElement = null;
        }
        
        // Удаляем индикаторы
        if (dropIndicator) {
            dropIndicator.remove();
            dropIndicator = null;
        }
        
        // Убираем подсветку целей
        document.querySelectorAll('.drop-target').forEach(el => {
            el.classList.remove('drop-target');
        });
        
        // Убираем класс с body
        document.body.classList.remove('dragging');
    }
    
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
