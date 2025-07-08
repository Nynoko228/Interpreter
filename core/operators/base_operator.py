# Базовый класс для операторов
import re
from abc import ABC, abstractmethod
from .comment_operator import CommentOperator

class BaseOperator(ABC):
    def __init__(self, variable_manager, evaluator):
        self.vm = variable_manager
        self.evaluator = evaluator
        self.comment_operator = CommentOperator()  # Добавляем обработчик комментариев

    def is_multiline_command(self, command):
        """Определяет, является ли команда многострочной"""
        return False

    def process_multiline_command(self, command, next_lines):
        """Обрабатывает многострочные команды (должен быть переопределен в подклассах)"""
        return command

    def remove_comments(self, text):
        """Удаляет комментарии из многострочного текста"""
        lines = text.split('\n')
        cleaned_lines = []

        for line in lines:
            stripped_line = line.strip()

            # Пропускаем строки, которые являются чистыми комментариями
            if not stripped_line or self.comment_operator.is_comment(stripped_line):
                continue

            # Удаляем конечные комментарии в строке
            if '#' in line:
                clean_line = []
                in_quotes = False
                for char in line:
                    if char == '"' or char == "'":
                        in_quotes = not in_quotes
                    if char == '#' and not in_quotes:
                        break
                    clean_line.append(char)
                line = ''.join(clean_line).rstrip()

            cleaned_lines.append(line)

        return '\n'.join(cleaned_lines)

    def _replace_variables(self, text):
        def replacer(match):
            var_name = match.group(1)
            try:
                var_value = str(self.vm.get_variable(var_name)[1])
                return var_value
            except NameError:
                return match.group(0)  # Если переменная не найдена, оставляем как есть

        return re.sub(r'\{([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\}', replacer, text)

    def _format_message(self, message):
        lines = message.split('\n')
        formatted_lines = []

        for line in lines:
            # Удаляем начальные пробелы и табы
            stripped_line = line.lstrip()

            # Проверяем, начинается ли строка (после пробелов) с '*' или '\t'
            if stripped_line.startswith('*') or stripped_line.startswith('\t'):
                # Находим позицию первого непробельного символа
                first_non_space = len(line) - len(stripped_line)
                # Удаляем символ '*' или '\t'
                content = "\t" + line[first_non_space + 1:].lstrip() if stripped_line.startswith('*') else line[first_non_space + 1:].lstrip()
                # Убираем начальные пробелы и табы из оставшейся части
                formatted_lines.append(content)
            else:
                # Просто убираем начальные пробелы и табы
                formatted_lines.append(stripped_line)

            # Подставляем значения переменных
            formatted_lines[-1] = self._replace_variables(formatted_lines[-1])

        return '\n'.join(formatted_lines)

    @abstractmethod
    def execute(self, command):
        raise NotImplementedError()

