import re
from .base_operator import BaseOperator


class MemcOperator(BaseOperator):
    def execute(self, command):
        # Парсинг команды
        parts = self._parse_command(command)

        # Обработка переменных
        processed_parts = self._process_variables(parts)

        # Извлечение параметров
        limit, nominal, tolerance, extra = self._extract_parameters(processed_parts)

        # Расчет погрешности
        tolerance_range = self._calculate_tolerance(nominal['value'], limit, tolerance)

        # Получение измеренного значения
        mem_value = self.vm.get_variable('MEM')[1]

        # Проверка соответствия
        is_within = self._check_within_tolerance(mem_value, nominal['value'], tolerance_range)

        # Форматирование результата
        self._display_result(nominal, mem_value, tolerance_range, is_within, extra)

    def _parse_command(self, command):
        # Удаление ключевого слова MEMC
        cleaned = re.sub(r'^(MEMC|ИТОГ)\s+', '', command, flags=re.IGNORECASE)
        # Разбиение на части с учетом фигурных скобок
        return re.findall(r'\{.*?\}|\S+', cleaned)

    def _process_variables(self, parts):
        processed = []
        for part in parts:
            if part.startswith('{') and part.endswith('}'):
                var_name = part[1:-1]
                var_value = self.vm.get_variable(var_name)[1]
                processed.extend(var_value.split())
            else:
                processed.append(part)
        return processed

    def _extract_parameters(self, parts):
        limit = None
        extra = []
        tolerance = []

        # Первый параметр может быть пределом (целое число)
        if parts[0].isdigit():
            limit = int(parts.pop(0))

        # Извлечение номинального значения
        nominal_match = re.match(r'([+-]?\d+\.?\d*)([a-zA-Zа-яА-Я]+)', parts[0])
        if not nominal_match:
            raise ValueError("Некорректный формат номинального значения")

        nominal = {
            'value': float(nominal_match.group(1)),
            'unit': nominal_match.group(2),
            'precision': len(nominal_match.group(1).split('.')[1]) if '.' in nominal_match.group(1) else 0
        }
        parts.pop(0)

        # Извлечение параметров погрешности
        while parts and not self._is_extra_param(parts[0]):
            tolerance.append(parts.pop(0))

        # Оставшиеся параметры - дополнительные
        extra = parts

        return limit, nominal, tolerance, extra

    def _calculate_tolerance(self, nominal, limit, tolerance_specs):
        total_tolerance = 0
        for spec in tolerance_specs:
            match = re.match(r'([+-]?)(\d+\.?\d*)([%U/P]+)', spec)
            if not match:
                raise ValueError(f"Некорректный спецификатор погрешности: {spec}")

            sign = -1 if match.group(1) == '-' else 1
            value = float(match.group(2))
            spec_type = match.group(3)

            if spec_type == 'U':
                total_tolerance += sign * value
            elif spec_type == '%':
                total_tolerance += sign * (nominal * value / 100)
            elif spec_type == '/':
                if not limit:
                    raise ValueError("Требуется указать предел для этого типа погрешности")
                total_tolerance += sign * (limit * value / 100)
            elif spec_type == 'P%':
                total_tolerance += sign * (nominal * value / 1e6)
            elif spec_type == 'P/':
                if not limit:
                    raise ValueError("Требуется указать предел для этого типа погрешности")
                total_tolerance += sign * (limit * value / 1e6)

        return total_tolerance

    def _check_within_tolerance(self, measured, nominal, tolerance):
        return abs(measured - nominal) <= abs(tolerance)

    def _display_result(self, nominal, measured, tolerance, is_within, extra):
        fmt_str = f"{{:.{nominal['precision']}f}}"
        result = [
            f"Номинальное: {fmt_str.format(nominal['value'])}{nominal['unit']}",
            f"Измеренное: {fmt_str.format(measured)}{nominal['unit']}",
            f"Допуск: ±{fmt_str.format(abs(tolerance))}{nominal['unit']}",
            f"Соответствие: {'Да' if is_within else 'Нет'}"
        ]

        if extra:
            result.append(f"Доп. параметры: {' '.join(extra)}")

        print("\n".join(result))

    def _is_extra_param(self, param):
        # Проверка, является ли параметр дополнительным (не погрешностью)
        return not any(c in param for c in ['%', 'U', '/', 'P'])