from .base_operator import BaseOperator
import re


class JLabelOperator(BaseOperator):
    def __init__(self, interpreter, variable_manager, evaluator):
        super().__init__(variable_manager, evaluator)
        self.interpreter = interpreter

    def execute(self, command):
        label_name = command.split(maxsplit=1)[1].strip()
        if not self.interpreter.context_stack:
            return

        current_ctx = self.interpreter.context_stack[-1]
        print(f"current_ctx: {current_ctx}")
        if label_name in current_ctx['labels']:
            current_ctx['index'] = current_ctx['labels'][label_name]  # Переход на метку
        else:
            raise ValueError(f"Метка '{label_name}' не найдена в процедуре")