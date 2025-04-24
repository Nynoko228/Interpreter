from .base_operator import BaseOperator

class LabelOperator(BaseOperator):
    def __init__(self, interpreter, variable_manager, evaluator):
        super().__init__(variable_manager, evaluator)
        self.interpreter = interpreter  # Ссылка на интерпретатор

    def execute(self, command):
        pass  # Метки уже обработаны на первом проходе