import re
from .base_operator import BaseOperator


class Mem2Operator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово MEM2
        prompt = re.sub(r'^MEM2\s*', '', command, flags=re.IGNORECASE).strip()

        # Обрабатываем многострочный текст (строки с табуляцией)
        formatted_prompt = self._format_prompt(prompt)

        # Получаем текстовый ввод от пользователя
        user_input = self._get_text_input(formatted_prompt)

        # Сохраняем в системную переменную MEM2
        self.vm.set_variable('MEM2', 'string', user_input)

    def _format_prompt(self, prompt):
        """Форматирует многострочный текст для отображения"""
        lines = prompt.split('\n')
        formatted_lines = []

        for line in lines:
            # Обрабатываем отступы (символ табуляции в начале строки)
            if line.startswith('\t'):
                line = '    ' + line[1:]  # Заменяем таб на 4 пробела
            formatted_lines.append(line)

        return '\n'.join(formatted_lines)

    def _get_text_input(self, prompt):
        """Получает текстовый ввод от пользователя"""
        # В реальном приложении можно использовать GUI-диалог ввода
        user_input = input(f"{prompt}\n> ")
        return user_input.strip()  # Удаляем лишние пробелы по краям