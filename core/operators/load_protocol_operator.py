import os
import re
import tempfile
import shutil
from io import BytesIO

from openpyxl.reader.excel import load_workbook

from .base_operator import BaseOperator
from core.protocol_utils.protocol_utils import find_all_tags


class LoadProtocolOperator(BaseOperator):
    """Оператор загружает протокол используя путь до него"""
    def execute(self, command):
        # Извлекаем путь к файлу из команды
        file_path = re.sub(r'^(LOAD_PROTOCOL|ЗАГРУЗИТЬ_ПРОТОКОЛ)\s*', '', command, flags=re.IGNORECASE).strip()

        # Проверяем существование файла
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Файл протокола не найден: {file_path}")

        wb = load_workbook(file_path)
        ws = wb.active
        self.vm.protocol.worksheet = ws
        # Создаем временную рабочую копию в памяти (без сохранения на диск)
        working_copy = self._create_in_memory_working_copy(file_path)
        # Получаем все метки
        tags = find_all_tags(working_copy)

        # merged_cell_mapping = self._create_merged_cell_mapping(ws)

        # Сохраняем результат в системные переменные
        self.vm.set_protocol_tags(tags)
        self.vm.set_original_protocol_path(file_path)
        self.vm.set_protocol_data(working_copy)
        self.vm.protocol.set_template_path(file_path)
        self.vm.protocol.set_tags(tags)
        # self.vm.protocol.set_merged_cell_mapping(merged_cell_mapping)

        # Выводим информацию о загрузке
        print(f"Загружен протокол: {file_path}")
        print(f"Найдено {sum(len(sheet_tags) for sheet_tags in tags.values())} меток")
        print(f"Метки: {self.vm.get_protocol_tags()}")

        return working_copy

    def _create_in_memory_working_copy(self, original_path):
        """Создает рабочую копию протокола в памяти"""
        # Создаем временный файл в памяти
        with open(original_path, 'rb') as src_file:
            working_copy = src_file.read()
        return working_copy