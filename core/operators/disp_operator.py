import re
from .base_operator import BaseOperator


class DispOperator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово DISP
        message = re.sub(r'^(DISP|ПОКАЗ)\s*', '', command, flags=re.IGNORECASE).strip()

        # Обрабатываем многострочный текст и подстановку переменных
        formatted_message = self._format_message(message)

        # Выводим сообщение (в реальной реализации можно использовать GUI)
        print(formatted_message)

    def _format_message(self, message):
        lines = message.split('\n')
        formatted_lines = []

        for line in lines:
            # Обрабатываем отступы (символ табуляции или *)
            if line.startswith('\t') or line.startswith('*'):
                line = line[1:]

            # Подставляем значения переменных
            line = self._replace_variables(line)
            formatted_lines.append(line)

        return '\n'.join(formatted_lines)

    def _replace_variables(self, text):
        def replacer(match):
            var_name = match.group(1)
            try:
                var_value = str(self.vm.get_variable(var_name)[1])
                return var_value
            except NameError:
                return match.group(0)  # Если переменная не найдена, оставляем как есть

        return re.sub(r'\{([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\}', replacer, text)