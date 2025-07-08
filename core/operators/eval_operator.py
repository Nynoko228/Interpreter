import re
from .base_operator import BaseOperator


class EvalOperator(BaseOperator):
    """Оператор EVAL записывает по метке или по координатам ячейки значение (по умолчанию соответствует или не
    соответствует) в зависимости от значения переенной MEM (если MEM > 0, то соответствует иначе не соответствует).
    Можно ввести свои значения для записи в таблицу. Для разделителя можно использовать: 'OR', 'ИЛИ', '|'
    Пример: EVAL Да | Нет -> A4"""
    def execute(self, command):
        # Удаляем ключевое слово EVAL
        expr = re.sub(r'^(EVAL|ОЦЕН)\s*', '', command, flags=re.IGNORECASE).strip()

        # Парсинг выражения (текст и опциональная цель)
        text, target = self._parse_expression(expr)
        print(text, target)
        # Получаем значение из системной переменной MEM
        try:
            mem_value = self.vm.get_variable('MEM')[1]
        except NameError:
            raise ValueError("Системная переменная MEM не определена")

        # Определяем результат оценки
        if len(text) > 1:
            # Если пользователь ввёл какой-либо текст перед символом ->, то используем его
            conclusion = text[0] if mem_value > 0 else text[1]
        else:
            # Если пользователь не вводил какого-либо текста перед символом ->, то используем соответствует или не соответсвтвует
            conclusion = "соответствует" if mem_value > 0 else "не соответствует"

        # Формируем результат для отображения
        result = {
            'message': text,
            'value': mem_value,
            'conclusion': conclusion
        }

        # Если указана цель - записываем в протокол
        if target:
            self._write_to_protocol(target, conclusion)
            # self.vm.protocol.generate(
            #     "C:\MeMorozov\Interpreter\Protocol poverki\Testiruem\Копия_Термометр_стеклянный_(2).xlsx")

        # Выводим результат
        self._display_result(result)
        return result

    def _parse_expression(self, expr):
        """Парсит выражение на текст и цель записи"""
        # Формат: "Текст" -> цель
        if '->' in expr:
            parts = expr.split('->', 1)
            text_part = parts[0].strip().strip('"')
            print(text_part)
            target = parts[1].strip()
            # Разделяем текст на части по разделителям
            options = []
            for option in ['OR', 'ИЛИ', '|']:
                if option in text_part:
                    options = [opt.strip() for opt in text_part.split(option)]
                    break
            else:
                options = [text_part]  # Если нет разделителей, возвращаем текст как единственный элемент
            # print(options)
            return options, target
        # Формат: "Текст" (без цели)
        return expr.strip('"'), None

    def _write_to_protocol(self, target, value):
        """Записывает значение в протокол по цели"""
        # Получаем текущий протокол
        protocol = self.vm.protocol
        print(f"PROTOCOL: {protocol}")
        # Определяем тип цели
        if self._is_cell_reference(target):
            # Запись по координатам ячейки
            print('По координатом ячейки')
            protocol.add_cell_replacement(target, value)
        else:
            # Запись по метке ({{TAG}})
            print('По метке')
            protocol.add_tag_replacement(target, value)

    def _is_cell_reference(self, ref):
        """Проверяет, является ли строка ссылкой на ячейку"""
        return re.match(r'^[A-Z]+\d+$', ref) is not None

    def _display_result(self, result):
        """Отображает результат оценки"""
        print("\n=== Результат оценки ===")
        print(f"Параметр: {result['message']}")
        print(f"Значение: {result['value']}")
        print(f"Заключение: {result['conclusion']}\n")
