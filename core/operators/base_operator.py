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
        # Шаблон: {имя[цифра]} или просто {имя}
        pattern = re.compile(
            r'\{'
            r'([A-Za-zА-Яа-я_][A-Za-zА-Яа-я0-9_]*)'  # группа 1: имя переменной
            r'(?:\[(\d+)\])?'  # группа 2 (необязательная): индекс
            r'\}'
        )

        def replacer(match):
            var_name = match.group(1)
            idx = match.group(2)

            try:
                _, value = self.vm.get_variable(var_name)
            except NameError:
                return match.group(0)

            # Если индекс присутствует, пробуем к индексированию
            if idx is not None:
                try:
                    index = int(idx)
                    # Если это список или кортеж — берём по номеру
                    if isinstance(value, (list, tuple)):
                        value = value[index]
                    # Если это словарь — тоже можно взять по ключу-строке
                    elif isinstance(value, dict):
                        value = value[index] if index in value else value.get(str(index), match.group(0))
                    else:
                        # нечего индексировать — возвращаем исходник
                        return match.group(0)
                except (IndexError, ValueError, KeyError):
                    return match.group(0)

            # Приводим значение к строке, подставляем запятую для дробей
            if isinstance(value, float) and not value.is_integer():
                return str(value).replace('.', ',')
            return str(value)

        return pattern.sub(replacer, text)

    # def _replace_variables(self, text):
    #     def replacer(match):
    #         var_name = match.group(1)
    #         print(var_name)
    #         try:
    #             _, value = self.vm.get_variable(var_name)
    #             # Проверяем тип
    #             if isinstance(value, float) and not value.is_integer():
    #                 return str(value).replace('.', ',')
    #             return str(value)
    #         except NameError:
    #             return match.group(0)  # Оставляем как есть, если переменная не найдена
    #     return re.sub(r'\{([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\}', replacer, text)

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
            # print(f"Подставляем")
            # print(formatted_lines)
            formatted_lines[-1] = self._replace_variables(formatted_lines[-1])

        return '\n'.join(formatted_lines)

    @abstractmethod
    def execute(self, command):
        raise NotImplementedError()

