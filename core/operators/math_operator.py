import re
from .base_operator import BaseOperator

# Класс для обработки оператора MATH
class MathOperator(BaseOperator):
    def execute(self, command):
        expr = re.sub(r'^(MATH|МАТЕМ)\s*', '', command, flags=re.IGNORECASE).strip()
        parts = re.split(r'\s*=\s*', expr, 1)

        if len(parts) != 2:
            raise ValueError(f"Некорректный формат команды: {command}")

        var_name, expression = parts
        self._process_expression(var_name, expression)

    def _process_expression(self, var_name, expression):
        if re.match(r"^['\"].*['\"]$", expression):
            self._handle_string(var_name, expression)
        else:
            self._handle_number(var_name, expression)

    def _handle_string(self, var_name, expression):
        value = expression[1:-1]
        self.vm.set_variable(var_name, 'string', value)

    def _handle_number(self, var_name, expression):
        value = self.evaluator.evaluate(expression)
        self.vm.set_variable(var_name, 'number', value)

