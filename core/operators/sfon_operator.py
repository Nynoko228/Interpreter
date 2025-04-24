from .base_operator import BaseOperator


class SfonOperator(BaseOperator):
    def __init__(self, variable_manager, evaluator):
        super().__init__(variable_manager, evaluator)
        self.is_active = False  # Флаг активности режима

    def execute(self, command):
        self.is_active = True  # Активируем режим при вызове SFON

    def handle_failure(self):
        """Вызывает диалог при неудачном результате"""
        if self.is_active:
            return self._show_dialog()
        return "continue"

    def _show_dialog(self):
        print(f"\n=== Неудачный результат ===")
        print("1 - Повторить")
        print("2 - Продолжить")
        print("3 - Остановить")
        choice = input("Выберите действие: ")
        return choice