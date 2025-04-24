import re

# Класс для управления переменными
class VariableManager:
    def __init__(self):
        self.variables = {
            'MEM': ('number', 0),
            'MEM1': ('number', 0),
            'MEM2': ('string', ''),
            'HEADER_TOP': ('string', ''),  # Заголовок верхней части
            'HEADER_BOTTOM': ('string', '')  # Заголовок нижней части
        }

    def get_variable(self, name):
        var_name = name.upper()
        if var_name not in self.variables:
            raise NameError(f"Переменная {var_name} не определена")
        return self.variables[var_name]

    def set_variable(self, name, var_type, value):
        var_name = name.upper()

        if not re.match(r'^[a-zA-Zа-яА-Я_][a-zA-Z0-9а-яА-Я_]*$', var_name):
            raise NameError(f"Некорректное имя переменной: {var_name}")

        if var_name in self.variables:
            existing_type = self.variables[var_name][0]
            if existing_type != var_type:
                raise TypeError(f"Нельзя изменить тип переменной {var_name}")

        self.variables[var_name] = (var_type, value)

    def get_all_variables(self):
        return {k: v[1] for k, v in self.variables.items()}

    def set_header_top(self, value):
        """Устанавливает текст в верхнюю часть заголовков"""
        self.set_variable('HEADER_TOP', 'string', value)

    def set_header_bottom(self, value):
        """Устанавливает текст в нижнюю часть заголовков"""
        self.set_variable('HEADER_BOTTOM', 'string', value)

    def get_header_top(self):
        """Получает текст из верхней части заголовков"""
        return self.get_variable('HEADER_TOP')[1]

    def get_header_bottom(self):
        """Получает текст из нижней части заголовков"""
        return self.get_variable('HEADER_BOTTOM')[1]