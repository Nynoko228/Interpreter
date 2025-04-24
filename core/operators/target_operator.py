# Какая-то непонятная команда и она не работает нормально

from .base_operator import BaseOperator

class TargetOperator(BaseOperator):
    def execute(self, command):
        # Команда TARGET не принимает параметров
        # Сохраняем метку в интерпретаторе
        self.vm.set_variable('CURRENT_TARGET', 'number', 1)