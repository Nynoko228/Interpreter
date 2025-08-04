# math_operator.py
import re
import math
import time
import os
import configparser
import ast
from .base_operator import BaseOperator


class MathFunctions:
    """Класс, содержащий все математические функции для оператора MATH"""

    @staticmethod
    def field(string, field_index, delimiter):
        parts = string.split(delimiter)
        if 1 <= field_index <= len(parts):
            return parts[field_index - 1]
        return ""

    @staticmethod
    def строка(x):
        return str(x)

    @staticmethod
    def число(string):
        try:
            return float(string)
        except ValueError:
            return 0.0

    @staticmethod
    def bit(mask, number):
        return (number & mask) != 0

    @staticmethod
    def бит(mask, number):
        return MathFunctions.bit(mask, number)

    @staticmethod
    def sqrt(x):
        return math.sqrt(x)

    @staticmethod
    def корень(x):
        return math.sqrt(x)

    @staticmethod
    def abs(x):
        return abs(x)

    @staticmethod
    def мод(x):
        return abs(x)

    @staticmethod
    def lg(x):
        return math.log10(x)

    @staticmethod
    def FORMAT(val, format_spec):
        """Реализация функции форматирования"""
        if isinstance(val, (int, float)):
            return format(val, format_spec)
        return str(val)

    @staticmethod
    def формат(val, format_spec):
        return MathFunctions.FORMAT(val, format_spec)

    @staticmethod
    def ROUND(number, digits_after):
        return round(number, digits_after)

    @staticmethod
    def округл(number, digits_after):
        return round(number, digits_after)

    # Реализация остальных функций...
    # Полная реализация всех функций из документации

    @classmethod
    def get_functions(cls):
        """Возвращает словарь всех доступных функций"""
        funcs = {}
        for name in dir(cls):
            if name.startswith('__') or name == 'get_functions':
                continue
            attr = getattr(cls, name)
            if callable(attr):
                funcs[name] = attr
        return funcs


class MathOperator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово MATH/МАТЕМ
        expr = re.sub(r'^(MATH|МАТЕМ)\s*', '', command, flags=re.IGNORECASE).strip()

        # Разделяем выражение на имя переменной и значение
        parts = expr.split('=', 1)
        if len(parts) < 2:
            raise ValueError(f"Некорректный формат команды: {command}")

        var_name = parts[0].strip()
        expression = parts[1].strip()

        # Создаем контекст выполнения
        context = self._create_context()

        try:
            # Вычисляем выражение с использованием Python eval
            result = eval(expression, context)
        except Exception as e:
            raise RuntimeError(f"Ошибка выполнения выражения: {expression} ({str(e)})")

        # Сохраняем результат в переменную
        self._set_variable(var_name, result)

    def _create_context(self):
        """Создает безопасный контекст для выполнения выражений"""
        # Базовые безопасные функции
        safe_builtins = {
            'abs': abs,
            'round': round,
            'min': min,
            'max': max,
            'sum': sum,
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'list': list,
            'dict': dict,
            'tuple': tuple,
            'pow': pow,
            'range': range,
            'zip': zip,
        }

        # Добавляем пользовательские функции
        context = MathFunctions.get_functions()

        # Добавляем переменные виртуальной машины
        for var, (_, value) in self.vm.variables.items():
            context[var] = value

        # Добавляем безопасные builtins
        context['__builtins__'] = safe_builtins

        return context

    def _set_variable(self, var_name, value):
        """Определяет тип значения и сохраняет переменную"""
        if isinstance(value, str):
            var_type = 'string'
        elif isinstance(value, (int, float)):
            var_type = 'number'
        elif isinstance(value, list):
            var_type = 'list'
        elif isinstance(value, bool):
            var_type = 'bool'
        else:
            # Для неизвестных типов используем строковое представление
            var_type = 'string'
            value = str(value)

        self.vm.set_variable(var_name, var_type, value)