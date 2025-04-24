import os
import re
from .base_operator import BaseOperator


class CallOperator(BaseOperator):
    def __init__(self, variable_manager, evaluator):
        super().__init__(variable_manager, evaluator)
        self.procedure_stack = []  # Стек для отслеживания выполняемых процедур

    def execute(self, command):
        # Удаляем ключевое слово CALL
        procedure_name = re.sub(r'^CALL\s*', '', command, flags=re.IGNORECASE).strip()



        # Добавляем расширение .mcf если его нет
        if not procedure_name.lower().endswith('.mcf'):
            procedure_name += '.mcf'

        print(procedure_name)

        # Проверяем существование файла
        if not os.path.exists(procedure_name):
            raise FileNotFoundError(f"Файл процедуры не найден: {procedure_name}")

        # Читаем содержимое файла процедуры
        with open(procedure_name, 'r', encoding='utf-8') as f:
            procedure_code = f.read().splitlines()

        # Добавляем текущую процедуру в стек
        self.procedure_stack.append(procedure_name)

        # Возвращаем код подпроцедуры для выполнения
        return procedure_code

    def get_current_procedure(self):
        """Возвращает имя текущей выполняемой процедуры"""
        return self.procedure_stack[-1] if self.procedure_stack else None

    def procedure_completed(self):
        """Вызывается при завершении подпроцедуры"""
        if self.procedure_stack:
            self.procedure_stack.pop()