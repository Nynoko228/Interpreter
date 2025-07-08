import re
from .base_operator import BaseOperator


class MemiOperator(BaseOperator):

    def is_multiline_command(self, command):
        return True

    def process_multiline_command(self, command, next_lines):
        # Объединяем все строки команды
        return command + "\n" + "\n".join(next_lines) if next_lines else command

    def execute(self, command):
        # Удаляем ключевое слово MEMI
        prompt = re.sub(r'^(MEMI|ВВОД_ЧИСЛА)\s*', '', command, flags=re.IGNORECASE).strip()

        prompt = self.remove_comments(prompt).strip()

        # Обрабатываем многострочный текст (строки с табуляцией)
        formatted_prompt = self._format_message(prompt)

        # Получаем числовой ввод от пользователя
        user_input = self._get_numeric_input(formatted_prompt)

        # Сохраняем в системную переменную MEM
        self.vm.set_variable('MEM', 'number', user_input)

    # def _format_prompt(self, prompt):
    #     """Форматирует многострочный текст для отображения"""
    #     lines = prompt.split('\n')
    #     formatted_lines = []
    #
    #     for line in lines:
    #         # Обрабатываем отступы (символ табуляции в начале строки)
    #         if line.startswith('\t') or line.startswith('*'):
    #             line = line[1:]
    #
    #         # Подставляем значения переменных
    #         line = self._replace_variables(line)
    #         formatted_lines.append(line)
    #
    #     return '\n'.join(formatted_lines)

    # def _replace_variables(self, text):
    #     def replacer(match):
    #         var_name = match.group(1)
    #         try:
    #             var_value = str(self.vm.get_variable(var_name)[1])
    #             return var_value
    #         except NameError:
    #             return match.group(0)  # Если переменная не найдена, оставляем как есть
    #
    #     return re.sub(r'\{([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\}', replacer, text)

    def _get_numeric_input(self, prompt):
        """Получает числовой ввод от пользователя"""
        while True:
            try:
                # В реальном приложении заменить на GUI-диалог ввода
                user_input = input(f"{prompt}\n> ")
                return float(user_input)
            except ValueError:
                print("Ошибка: необходимо ввести числовое значение")