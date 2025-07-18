import re

# Класс для вычисления выражений
class ExpressionEvaluator:
    def __init__(self, variable_manager):
        self.vm = variable_manager

    def evaluate(self, expr):
        expression = self._replace_variables(expr)
        # print(f"EXPR: {expression}")
        # Заменяем логические операторы на Python-совместимые
        expression = (
            re.sub(r"(>=|<=|==|!=|&&|\|\||>|<)", r" \1 ", expression)
            .replace("&&", "and")
            .replace("||", "or")
        )

        # Удаляем лишние пробелы
        expression = expression.strip()
        # print(f"EXPR: {expression}")

        # Вычисляем выражение в безопасном контексте
        try:
            # print(eval(expression, {"__builtins__": {}}))
            return eval(expression, {"__builtins__": {}})
        except Exception as e:
            raise ValueError(f"Ошибка в логическом выражении: {expression}. {str(e)}")


    def _replace_variables(self, expr):
            def replacer(match):
                # var_name = match.group(1).upper()
                var_name = match.group(1)
                var = self.vm.get_variable(var_name)
                return str(var[1])

            return re.sub(
                r'\b([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\b',
                replacer,
                expr
            )

