# do_while_operator.py
from .base_operator import BaseOperator
import re

class DoWhileOperator(BaseOperator):
    def __init__(self, interpreter, variable_manager, evaluator):
        super().__init__(variable_manager, evaluator)
        self.interpreter = interpreter

    def execute(self, command):
        operator_name = command.split()[0].upper()
        context = self.interpreter.get_current_context()

        if operator_name == 'DO' or operator_name == 'ДЕЛАТЬ':
            # Запоминаем начало цикла
            context.setdefault('do_while_stack', []).append({
                'start_index': context['index'],
                'condition': None
            })

        elif operator_name == 'WHILE' or operator_name == 'ПОКА':
            if not context.get('do_while_stack'):
                raise SyntaxError("Непарный оператор WHILE")

            current_loop = context['do_while_stack'][-1]
            condition = re.sub(r'^(WHILE|ПОКА)\s+', '', command, flags=re.IGNORECASE).strip()
            result = self.evaluator.evaluate(condition)

            # Если условие истинно, возвращаемся к началу цикла
            if result:
                context['index'] = current_loop['start_index'] - 1  # -1 компенсирует инкремент
            else:
                context['do_while_stack'].pop()  # Удаляем завершенный цикл