import re
from .base_operator import BaseOperator


class MemiOperator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово MEMI
        prompt = re.sub(r'^(MEMI|ВВОД_ЧИСЛА)\s*', '', command, flags=re.IGNORECASE).strip()

        # Обрабатываем многострочный текст (строки с табуляцией)
        formatted_prompt = self._format_prompt(prompt)

        # Получаем числовой ввод от пользователя
        user_input = self._get_numeric_input(formatted_prompt)

        # Сохраняем в системную переменную MEM
        self.vm.set_variable('MEM', 'number', user_input)

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

    def _get_numeric_input(self, prompt):
        """Получает числовой ввод от пользователя"""
        while True:
            try:
                # В реальном приложении заменить на GUI-диалог ввода
                user_input = input(f"{prompt}\n> ")
                return float(user_input)
            except ValueError:
                print("Ошибка: необходимо ввести числовое значение")