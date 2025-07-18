# math_operator.py
import re
from .base_operator import BaseOperator


class NotComplexExpression(Exception):
    pass


class MathOperator(BaseOperator):
    def execute(self, command):
        expr = re.sub(r'^(MATH|МАТЕМ)\s*', '', command, flags=re.IGNORECASE).strip()
        parts = re.split(r'\s*=\s*', expr, 1)

        if len(parts) != 2:
            raise ValueError(f"Некорректный формат команды: {command}")

        var_name, expression = parts
        self._process_expression(var_name, expression)
        # print(type(self.vm.variables[var_name][-1]))
        print(self.vm.variables)
        # print(self.vm.variables[var_name][-1])

    def _process_expression(self, var_name, expression):
        if re.match(r'^[\'\"].*[\'\"]$', expression):
            self._handle_string(var_name, expression)
        elif '[' in expression or '"' in expression or "'" in expression:
            try:
                self._handle_complex(var_name, expression)
            except NotComplexExpression:
                self._handle_number(var_name, expression)
        else:
            self._handle_number(var_name, expression)

    def _handle_string(self, var_name, expression):
        value = expression[1:-1]
        self.vm.set_variable(var_name, 'string', value)

    def _handle_number(self, var_name, expression):
        value = self.evaluator.evaluate(expression)
        self.vm.set_variable(var_name, 'number', value)

    def _handle_complex(self, var_name, expression):
        try:
            value = self._parse_complex_expression(expression)
        except Exception as e:
            raise NotComplexExpression from e

        if isinstance(value, str):
            self.vm.set_variable(var_name, 'string', value)
        elif isinstance(value, list):
            self.vm.set_variable(var_name, 'list', value)
        elif isinstance(value, (int, float)):
            self.vm.set_variable(var_name, 'number', value)
        else:
            raise TypeError(f"Неподдерживаемый тип: {type(value)}")

    def _parse_complex_expression(self, expression):
        expression = expression.strip()

        # Обработка операций сложения
        parts = self._split_by_operation(expression, '+')
        if len(parts) > 1:
            left = self._parse_complex_expression(parts[0])
            for part in parts[1:]:
                right = self._parse_complex_expression(part)
                if isinstance(left, list) and isinstance(right, list):
                    left = left + right
                elif isinstance(left, str) and isinstance(right, str):
                    left = left + right
                else:
                    raise TypeError("Сложение поддерживается только для списков или строк одного типа")
            return left

        # Обработка операций умножения
        parts = self._split_by_operation(expression, '*')
        if len(parts) > 1:
            left = self._parse_complex_expression(parts[0])
            for part in parts[1:]:
                right = self._parse_complex_expression(part)
                if isinstance(left, list) and isinstance(right, int):
                    left = left * right
                elif isinstance(left, int) and isinstance(right, list):
                    left = right * left
                elif isinstance(left, str) and isinstance(right, int):
                    left = left * right
                elif isinstance(left, int) and isinstance(right, str):
                    left = right * left
                else:
                    raise TypeError("Умножение поддерживается только между списком/строкой и целым числом")
            return left

        # Обработка индексации
        return self._parse_index_expression(expression)

    def _split_by_operation(self, expression, op_char):
        parts = []
        current = []
        list_level = 0
        in_quote = None

        for char in expression:
            if in_quote:
                if char == in_quote:
                    in_quote = None
                current.append(char)
            else:
                if char == op_char and list_level == 0:
                    parts.append(''.join(current))
                    current = []
                else:
                    if char in ['"', "'"]:
                        in_quote = char
                    elif char == '[':
                        list_level += 1
                    elif char == ']':
                        if list_level > 0:
                            list_level -= 1
                    current.append(char)

        parts.append(''.join(current))
        return parts

    def _parse_index_expression(self, expression):
        value, rest = self._parse_primary_expression(expression)

        while rest.startswith('['):
            end_index = self._find_matching_bracket(rest)
            if end_index == -1:
                raise ValueError("Непарные квадратные скобки")

            index_expr = rest[1:end_index]
            rest = rest[end_index + 1:].strip()

            index_val = self._parse_complex_expression(index_expr)

            if isinstance(value, (list, str)):
                try:
                    value = value[index_val]
                except IndexError:
                    raise IndexError(f"Индекс {index_val} вне диапазона")
            else:
                raise TypeError("Индексация возможна только для списков и строк")

        if rest:
            raise ValueError(f"Ошибка разбора: {rest}")

        return value

    def _find_matching_bracket(self, s):
        level = 0
        for i, char in enumerate(s):
            if char == '[':
                level += 1
            elif char == ']':
                level -= 1
                if level == 0:
                    return i
        return -1

    def _parse_primary_expression(self, expression):
        expression = expression.strip()
        if not expression:
            return None, ""

        first_char = expression[0]

        # Строковые литералы
        if first_char in ['"', "'"]:
            quote = first_char
            parts = []
            i = 1
            while i < len(expression):
                if expression[i] == quote:
                    return ''.join(parts), expression[i + 1:].strip()
                parts.append(expression[i])
                i += 1
            raise ValueError("Незакрытая строка")

        # Литералы списков
        if first_char == '[':
            end_index = self._find_matching_bracket(expression)
            if end_index == -1:
                raise ValueError("Непарные квадратные скобки")

            list_content = expression[1:end_index]
            rest = expression[end_index + 1:].strip()
            return self._parse_list_literal(list_content), rest

        # Числовые литералы
        if first_char.isdigit() or first_char in ['.', '-']:
            num_str = []
            i = 0
            while i < len(expression) and (expression[i].isdigit() or expression[i] in ['.', 'e', 'E', '-', '+']):
                num_str.append(expression[i])
                i += 1
            num_str = ''.join(num_str)
            rest = expression[len(num_str):].strip()

            try:
                if '.' in num_str or 'e' in num_str.lower():
                    return float(num_str), rest
                return int(num_str), rest
            except ValueError:
                pass

        # Переменные
        if first_char.isalpha() or first_char == '_':
            var_name = []
            i = 0
            while i < len(expression) and (expression[i].isalnum() or expression[i] == '_'):
                var_name.append(expression[i])
                i += 1
            var_name = ''.join(var_name)
            rest = expression[len(var_name):].strip()

            try:
                var_type, value = self.vm.get_variable(var_name)
                return value, rest
            except NameError:
                raise NameError(f"Переменная {var_name} не определена")

        raise ValueError(f"Неизвестное выражение: {expression}")

    def _parse_list_literal(self, list_content):
        if not list_content.strip():
            return []

        items = []
        current = []
        list_level = 0
        in_quote = None

        for char in list_content:
            if in_quote:
                if char == in_quote:
                    in_quote = None
                current.append(char)
            else:
                if char == ',' and list_level == 0:
                    items.append(''.join(current).strip())
                    current = []
                else:
                    if char in ['"', "'"]:
                        in_quote = char
                    elif char == '[':
                        list_level += 1
                    elif char == ']':
                        list_level -= 1
                    current.append(char)

        items.append(''.join(current).strip())

        parsed_items = []
        for item in items:
            if item:
                parsed, _ = self._parse_primary_expression(item)
                if parsed is None:
                    parsed = self._parse_complex_expression(item)
                parsed_items.append(parsed)

        return parsed_items