import re
from .base_operator import BaseOperator


class EvalOperator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово EVAL
        message = re.sub(r'^(EVAL|ОЦЕН)\s*', '', command, flags=re.IGNORECASE).strip()
        # message = command[4:].strip()
        # Получаем значение из системной переменной MEM
        try:
            mem_value = self.vm.get_variable('MEM')[1]
        except NameError:
            raise ValueError("Системная переменная MEM не определена")

        # Определяем результат оценки
        conclusion = "соответствует" if mem_value > 0 else "не соответствует"

        # Формируем результат (в реальном приложении выводим в GUI)
        result = {
            'message': message,
            'value': mem_value,
            'conclusion': conclusion
        }

        # Выводим результат (временная консольная реализация)
        self._display_result(result)

    def _display_result(self, result):
        """Отображает результат оценки (заменить на GUI-вывод в реальном приложении)"""
        print("\n=== Результат оценки ===")
        print(f"Параметр: {result['message']}")
        print(f"Значение: {result['value']}")
        print(f"Заключение: {result['conclusion']}\n")