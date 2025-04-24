import re
from .base_operator import BaseOperator

class ResultOperator(BaseOperator):
    def execute(self, command):
        # Разделяем команду на текст и параметры
        match = re.match(r'RSLT\s*(\[([12])\]\s*)?(.*)$', command, flags=re.IGNORECASE)
        if not match:
            raise ValueError("Неверный формат команды RSLT")

        # Извлекаем текст и параметры
        brackets = match.group(2)  # Цифра в скобках (если есть)
        text_to_display = match.group(3).strip()

        # Проверяем, нужно ли выводить в заголовки
        if brackets == '1':
            self._set_header_top(text_to_display)
        elif brackets == '2':
            self._set_header_bottom(text_to_display)
        else:
            # Если нет указания на заголовки, просто выводим текст
            self._display_result(text_to_display)

    def _display_result(self, text):
        """Вывод текста в окно результатов измерений"""
        print(f"Результат: {text}")

    def _set_header_top(self, text):
        """Устанавливает текст в верхнюю часть заголовков"""
        self.vm.set_header_top(text)

    def _set_header_bottom(self, text):
        """Устанавливает текст в нижнюю часть заголовков"""
        self.vm.set_header_bottom(text)