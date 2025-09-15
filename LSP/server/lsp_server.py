import json
import os
import re
import logging
from pathlib import Path

# Настройка логирования
logger = logging.getLogger('LSP-Handler')


class SimpleLSP:
    def __init__(self, syntax_file="syntax.json"):
        self.syntax = self.load_syntax(syntax_file)
        self.workspace_path = Path(__file__).resolve().parent.parent / "data"
        self.documents = {}

    def load_syntax(self, file_path):
        try:
            # Автоматическое определение пути к файлу
            if not os.path.isabs(file_path):
                base_dir = os.path.dirname(os.path.abspath(__file__))
                file_path = os.path.join(base_dir, file_path)

            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Ошибка загрузки синтаксиса: {e}")
            # Возвращаем синтаксис по умолчанию при ошибке
            return {
                "keywords": [],
                "operators": [],
                "types": [],
                "builtin_functions": []
            }

    async def handle_list_files(self, data):
        try:
            # Укажите путь к вашей рабочей директории
            # workspace_path = Path(__file__).resolve().parent.parent / "data"
            # print(workspace_path)
            files = []

            for item in self.workspace_path.iterdir():
                files.append({
                    "name": item.name,
                    "path": str(item),
                    "isDirectory": item.is_dir(),
                    "size": item.stat().st_size if item.is_file() else 0
                })

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": files
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка чтения директории: {str(e)}"
                }
            }

    async def handle_read_file(self, data):
        try:
            file_path = data["params"]["path"]
            logger.debug(f"handle_read_file called with path: '{file_path}'")

            # Handle both absolute and relative paths
            if os.path.isabs(file_path):
                # Absolute path - use as is
                full_path = Path(file_path)
            else:
                # Relative path - treat as relative to workspace_path
                full_path = self.workspace_path / file_path

            logger.debug(f"Reading file: {full_path}")

            if not full_path.exists() or not full_path.is_file():
                logger.error(f"File does not exist: {full_path}")
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "error": {
                        "code": -32000,
                        "message": f"Файл не существует: {full_path}"
                    }
                }

            with open(full_path, "r", encoding="utf-8") as f:
                content = f.read()

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "content": content,
                    "path": file_path  # Return the original path
                }
            }
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка чтения файла: {str(e)}"
                }
            }

    async def handle_save_file(self, data):
        try:
            path = data["params"]["path"]
            content = data["params"]["content"]
            logger.debug(f"handle_save_file called with path: '{path}'")

            # Handle both absolute and relative paths
            if os.path.isabs(path):
                # Absolute path - use as is
                full_path = Path(path)
            else:
                # Relative path - treat as relative to workspace_path
                full_path = self.workspace_path / path

            logger.debug(f"Saving file: {full_path}")

            # Создаем директорию, если ее нет
            full_path.parent.mkdir(parents=True, exist_ok=True)

            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "path": path  # Return the original path
                }
            }
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка сохранения файла: {str(e)}"
                }
            }

    async def handle_change_file(self, data):
        uri = data["params"]["textDocument"]["uri"]
        for change in data["params"]["contentChanges"]:
            if "text" in change:
                self.documents[uri] = change["text"]
                logger.debug(f"Документ изменён: {uri}, новая длина: {len(change['text'])} символов")

                # Сохраняем изменения в файл, если URI соответствует реальному файлу
                if uri.startswith("file://"):
                    file_path = uri[7:]  # Убираем "file://" из URI
                    try:
                        with open(file_path, "w", encoding="utf-8") as f:
                            f.write(change["text"])
                        logger.debug(f"Файл сохранён: {file_path}")
                    except Exception as e:
                        logger.error(f"Ошибка сохранения файла {file_path}: {str(e)}")

        return None

    async def completion(self, data):
        uri = data["params"]["textDocument"]["uri"]
        line = data["params"]["position"]["line"]
        character = data["params"]["position"]["character"]

        logger.info(f"Запрос автодополнения для URI: {uri}, позиция: строка {line}, символ {character}")

        text = self.documents.get(uri, "")
        lines = text.split("\n")

        if line < 0 or line >= len(lines):
            logger.warning(f"Запрошена несуществующая строка: {line} (всего строк: {len(lines)})")
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": []
            }

        current_line = lines[line]
        logger.debug(f"Текущая строка: '{current_line}'")

        # Получаем текущее слово
        prefix = current_line[:character]
        last_word = re.findall(r'[\wа-яА-Я]*$', prefix)[0]  # Разрешаем русские буквы
        logger.info(f"Текущее слово: '{last_word}'")
        if not last_word:
            return
        # Фильтруем ключевые слова
        all_items = (
                self.syntax["keywords"] +
                self.syntax["operators"] +
                self.syntax["types"] +
                self.syntax["builtin_functions"]
        )
        suggestions = [kw for kw in all_items if kw.lower().startswith(last_word.lower())]
        logger.info(f"Предложения: {suggestions}")
        return {
            "jsonrpc": "2.0",
            "id": data["id"],
            "result": [
                {"label": kw, "kind": 14} for kw in suggestions
            ]
        }

    async def handle_create_file(self, data):
        try:
            print(data)
            path = data["params"]["path"]
            content = data["params"].get("content", "")
            path = self.workspace_path / path
            path.touch()
            # path = str(path)
            logger.debug(f"Создаём файл: {path}")
            # Создаем директорию, если ее нет
            # os.makedirs(os.path.dirname(path), exist_ok=True)

            with open(path, "w", encoding="utf-8") as f:
                f.write(content)
            path = str(path)
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "path": path
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка создания файла: {str(e)}"
                }
            }

    async def handle_create_folder(self, data):
        try:
            path = data["params"]["path"]
            path = self.workspace_path / path
            logger.debug(f"Создаём папку: {path}")
            # Создаем директорию
            path.mkdir(exist_ok=True, parents=True)
            path = str(path)
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "path": path
                }
            }
        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка создания папки: {str(e)}"
                }
            }

    async def handle_list_folder(self, data):
        try:
            folder_path = data["params"].get("path", "")
            logger.debug(f"handle_list_folder called with path: '{folder_path}'")

            # Default to data folder if no path specified
            if not folder_path or folder_path == "" or folder_path == "data":
                workspace_path = self.workspace_path
                logger.debug(f"Using data folder: {workspace_path}")
            else:
                # Always treat as relative path within data folder
                workspace_path = self.workspace_path / folder_path
                logger.debug(f"Using path within data folder: {workspace_path}")

            if not workspace_path.exists() or not workspace_path.is_dir():
                logger.error(f"Folder does not exist: {workspace_path}")
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "error": {
                        "code": -32000,
                        "message": f"Папка не существует: {workspace_path}"
                    }
                }

            files = []
            logger.debug(f"Listing contents of: {workspace_path}")
            for item in workspace_path.iterdir():
                # Use relative paths from data folder for consistency
                try:
                    relative_path = item.relative_to(self.workspace_path)
                    files.append({
                        "name": item.name,
                        "path": str(relative_path).replace('\\', '/'),  # Use forward slashes for consistency
                        "isDirectory": item.is_dir(),
                        "size": item.stat().st_size if item.is_file() else 0
                    })
                    logger.debug(f"Added file: {item.name}, path: {str(relative_path).replace(chr(92), '/')}")
                except ValueError:
                    # If item is not relative to workspace_path, use absolute path
                    files.append({
                        "name": item.name,
                        "path": str(item),
                        "isDirectory": item.is_dir(),
                        "size": item.stat().st_size if item.is_file() else 0
                    })
                    logger.debug(f"Added file (absolute path): {item.name}")

            logger.debug(f"Returning {len(files)} files from folder: {workspace_path}")
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": files
            }
        except Exception as e:
            logger.error(f"Error in handle_list_folder: {str(e)}")
            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "error": {
                    "code": -32000,
                    "message": f"Ошибка чтения директории: {str(e)}"
                }
            }

    async def handle(self, message):
        try:
            data = json.loads(message)
            logger.debug(f"Получено сообщение: {data}")

            if data.get("method") == "initialize":
                logger.info("Обработка инициализации LSP")
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": {
                        "capabilities": {
                            "completionProvider": {"resolveProvider": False}
                        }
                    }
                }

            elif data.get("method") == "textDocument/didOpen":
                uri = data["params"]["textDocument"]["uri"]
                text = data["params"]["textDocument"]["text"]
                self.documents[uri] = text
                logger.info(f"Документ открыт: {uri}, длина: {len(text)} символов")
                return None

            elif data.get("method") == "textDocument/didChange":
                await self.handle_change_file(data)
            elif data.get("method") == "textDocument/completion":
                return await self.completion(data)
            elif data.get("method") == "workspace/listFiles":
                return await self.handle_list_files(data)
            elif data.get("method") == "workspace/readFile":
                return await self.handle_read_file(data)
            elif data.get("method") == "workspace/getSyntax":
                return {
                    "jsonrpc": "2.0",
                    "id": data["id"],
                    "result": self.syntax
                }
            elif data.get("method") == "workspace/createFile":
                return await self.handle_create_file(data)
            elif data.get("method") == "workspace/createFolder":
                return await self.handle_create_folder(data)
            elif data.get("method") == "workspace/saveFile":
                return await self.handle_save_file(data)
            elif data.get("method") == "workspace/listFolder":
                return await self.handle_list_folder(data)
            elif data.get("method") == "workspace/createFileInFolder":
                return await self.handle_create_file_in_folder(data)
            elif data.get("method") == "workspace/createFolderInFolder":
                return await self.handle_create_folder_in_folder(data)
            elif data.get("method") == "workspace/renameItem":
                return await self.handle_rename_item(data)
            elif data.get("method") == "workspace/moveItem":
                return await self.handle_move_item(data)

        except Exception as e:
            logger.error(f"Ошибка обработки сообщения: {e}")
            import traceback
            logger.error(traceback.format_exc())
        return None

    async def handle_create_file_in_folder(self, data):
        """Создание файла в указанной папке"""
        try:
            parent_path = data["params"]["parentPath"]
            file_name = data["params"]["fileName"]
            content = data["params"].get("content", "")

            # Валидация пути и имени
            if not self.validate_path(parent_path) or not self.validate_filename(file_name):
                return self.error_response(data["id"], "Некорректный путь или имя файла")

            # Определяем полные пути
            if os.path.isabs(parent_path):
                full_parent_path = Path(parent_path)
            else:
                # Если parent_path пустой или равен 'data', используем workspace_path
                if not parent_path or parent_path == 'data':
                    full_parent_path = self.workspace_path
                else:
                    full_parent_path = self.workspace_path / parent_path

            # Создаём файл
            file_path = full_parent_path / file_name

            # Проверяем, что файл не существует
            if file_path.exists():
                return self.error_response(data["id"], f"Файл '{file_name}' уже существует")

            # Создаём директорию, если нужно
            full_parent_path.mkdir(parents=True, exist_ok=True)

            # Создаём файл
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "path": str(file_path),
                    "name": file_name
                }
            }

        except Exception as e:
            logger.error(f"Error creating file in folder: {str(e)}")
            return self.error_response(data["id"], f"Ошибка создания файла: {str(e)}")

    async def handle_create_folder_in_folder(self, data):
        """Создание папки в указанной папке"""
        try:
            parent_path = data["params"]["parentPath"]
            folder_name = data["params"]["folderName"]

            # Валидация пути и имени
            if not self.validate_path(parent_path) or not self.validate_filename(folder_name):
                return self.error_response(data["id"], "Некорректный путь или имя папки")

            # Определяем полные пути
            if os.path.isabs(parent_path):
                full_parent_path = Path(parent_path)
            else:
                # Если parent_path пустой или равен 'data', используем workspace_path
                if not parent_path or parent_path == 'data':
                    full_parent_path = self.workspace_path
                else:
                    full_parent_path = self.workspace_path / parent_path

            # Создаём папку
            folder_path = full_parent_path / folder_name

            # Проверяем, что папка не существует
            if folder_path.exists():
                return self.error_response(data["id"], f"Папка '{folder_name}' уже существует")

            # Создаём папку
            folder_path.mkdir(parents=True, exist_ok=True)

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "path": str(folder_path),
                    "name": folder_name
                }
            }

        except Exception as e:
            logger.error(f"Error creating folder in folder: {str(e)}")
            return self.error_response(data["id"], f"Ошибка создания папки: {str(e)}")

    async def handle_rename_item(self, data):
        """Переименование файла или папки"""
        try:
            old_path = data["params"]["oldPath"]
            new_name = data["params"]["newName"]

            # Валидация
            if not self.validate_path(old_path) or not self.validate_filename(new_name):
                return self.error_response(data["id"], "Некорректный путь или имя")

            # Определяем полные пути
            if os.path.isabs(old_path):
                full_old_path = Path(old_path)
            else:
                full_old_path = self.workspace_path / old_path

            # Новый путь в той же директории
            full_new_path = full_old_path.parent / new_name

            # Проверяем существование исходного элемента
            if not full_old_path.exists():
                return self.error_response(data["id"], "Элемент не найден")

            # Проверяем, что новое имя не занято
            if full_new_path.exists():
                return self.error_response(data["id"], f"Элемент с именем '{new_name}' уже существует")

            # Выполняем переименование
            full_old_path.rename(full_new_path)

            # Вычисляем относительные пути для ответа
            try:
                relative_new_path = str(full_new_path.relative_to(self.workspace_path))
            except ValueError:
                relative_new_path = str(full_new_path)

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "oldPath": old_path,
                    "newPath": relative_new_path,
                    "newName": new_name
                }
            }

        except Exception as e:
            logger.error(f"Error renaming item: {str(e)}")
            return self.error_response(data["id"], f"Ошибка переименования: {str(e)}")

    async def handle_move_item(self, data):
        """Перемещение файла или папки"""
        try:
            source_path = data["params"]["sourcePath"]
            target_path = data["params"]["targetPath"]

            logger.debug(f"Move item request: source='{source_path}', target='{target_path}'")

            # Валидация
            if not self.validate_path(source_path) or not self.validate_path(target_path):
                logger.error(f"Invalid paths: source='{source_path}', target='{target_path}'")
                return self.error_response(data["id"], "Некорректные пути")

            # Определяем полные пути
            if os.path.isabs(source_path):
                full_source_path = Path(source_path)
            else:
                full_source_path = self.workspace_path / source_path

            # Обработка целевого пути - особая логика для корневой папки
            if os.path.isabs(target_path):
                full_target_path = Path(target_path)
            else:
                # Если target_path пустой, 'data' или '', используем workspace_path
                if not target_path or target_path == 'data' or target_path == '':
                    full_target_path = self.workspace_path
                    logger.debug(f"Using workspace_path as target: {full_target_path}")
                else:
                    full_target_path = self.workspace_path / target_path
                    logger.debug(f"Using relative target path: {full_target_path}")

            logger.debug(f"Resolved paths: source={full_source_path}, target={full_target_path}")

            # Проверяем существование исходного элемента
            if not full_source_path.exists():
                logger.error(f"Source path does not exist: {full_source_path}")
                return self.error_response(data["id"], "Исходный элемент не найден")

            # Проверяем, что целевая папка существует и является папкой
            if not full_target_path.exists() or not full_target_path.is_dir():
                logger.error(
                    f"Target path does not exist or is not a directory: {full_target_path}, exists={full_target_path.exists()}, is_dir={full_target_path.is_dir() if full_target_path.exists() else 'N/A'}")
                return self.error_response(data["id"], "Целевая папка не существует")

            # Определяем путь нового расположения
            new_location = full_target_path / full_source_path.name

            # Проверяем, что в целевой папке нет элемента с таким же именем
            if new_location.exists():
                return self.error_response(data["id"],
                                           f"Элемент с именем '{full_source_path.name}' уже существует в целевой папке")

            # Выполняем перемещение
            import shutil
            if full_source_path.is_dir():
                shutil.move(str(full_source_path), str(new_location))
            else:
                shutil.move(str(full_source_path), str(new_location))

            # Вычисляем относительные пути для ответа
            try:
                relative_new_path = str(new_location.relative_to(self.workspace_path))
            except ValueError:
                relative_new_path = str(new_location)

            return {
                "jsonrpc": "2.0",
                "id": data["id"],
                "result": {
                    "success": True,
                    "sourcePath": source_path,
                    "newPath": relative_new_path,
                    "targetPath": target_path
                }
            }

        except Exception as e:
            logger.error(f"Error moving item: {str(e)}")
            return self.error_response(data["id"], f"Ошибка перемещения: {str(e)}")

    def validate_path(self, path):
        """Валидация пути"""
        # Пустой путь, 'data' или '' считается валидным (корневая папка)
        if not path or path == 'data' or path == '':
            return True
        # Простая проверка на наличие опасных символов
        dangerous_patterns = ['../', '..\\', '<', '>', '|']
        return not any(pattern in path for pattern in dangerous_patterns)

    def validate_filename(self, name):
        """Валидация имени файла"""
        if not name or len(name.strip()) == 0:
            return False

        # Проверка на недопустимые символы
        invalid_chars = '<>:"/\\|?*'
        if any(char in name for char in invalid_chars):
            return False

        # Проверка на зарезервированные имена Windows
        reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3',
                          'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
                          'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6',
                          'LPT7', 'LPT8', 'LPT9']

        if name.upper() in reserved_names:
            return False

        return True

    def error_response(self, request_id, message):
        """Создание ответа об ошибке"""
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": -32000,
                "message": message
            }
        }
