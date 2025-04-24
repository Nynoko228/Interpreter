from .base_operator import BaseOperator
import re


class IfOperator(BaseOperator):
    def __init__(self, interpreter, variable_manager, evaluator):
        super().__init__(variable_manager, evaluator)
        self.interpreter = interpreter  # Ссылка на интерпретатор для доступа к контекстам

    def execute(self, command):
        operator_name = command.split()[0].upper()
        context = self.interpreter.get_current_context()

        # Инициализация структур данных контекста
        if 'condition_stack' not in context:
            context['condition_stack'] = []
        if 'active_blocks' not in context:
            context['active_blocks'] = set()

        condition_stack = context['condition_stack']
        current_idx = context['index']

        # Обработка IF/ЕСЛИ
        if operator_name in ('IF', 'ЕСЛИ'):
            condition = self._parse_condition(command)
            result = self.evaluator.evaluate(condition)
            block = context['index_map'].get(current_idx)

            # Добавляем условие в стек
            condition_stack.append({
                'is_active': bool(result),
                'has_matched': bool(result),
                'block': block
            })

            if not result:
                self._skip_to_next_branch(context, block)

        # Обработка ELSEIF/ИНАЧЕЕСЛИ
        elif operator_name in ('ELSEIF', 'ИНАЧЕЕСЛИ'):
            if not condition_stack:
                raise SyntaxError(f"Непарный {operator_name}")

            current_condition = condition_stack[-1]
            block = context['index_map'].get(current_idx)

            # Если уже было совпадение, пропускаем ветку
            if current_condition['has_matched']:
                self._skip_to_endif(context, block)
                return

            condition = self._parse_condition(command)
            result = self.evaluator.evaluate(condition)
            current_condition['is_active'] = bool(result)

            if result:
                current_condition['has_matched'] = True
            else:
                self._skip_to_next_branch(context, block)

        # Обработка ELSE/ИНАЧЕ
        elif operator_name in ('ELSE', 'ИНАЧЕ'):
            if not condition_stack:
                raise SyntaxError(f"Непарный {operator_name}")

            current_condition = condition_stack[-1]
            block = context['index_map'].get(current_idx)

            if current_condition['has_matched']:
                self._skip_to_endif(context, block)

        # Обработка ENDIF/КОНЕЦЕСЛИ
        elif operator_name in ('ENDIF', 'КОНЕЦЕСЛИ'):
            if condition_stack:
                condition_stack.pop()

    def _parse_condition(self, command):
        """Извлекает условие из команды"""
        return re.sub(
            r'^(IF|ЕСЛИ|ELSEIF|ИНАЧЕЕСЛИ)\s+',
            '',
            command,
            flags=re.IGNORECASE
        ).strip()

    def _skip_to_next_branch(self, context, block):
        """Пропускает код до следующей ветки условия"""
        if not block:
            return

        next_positions = block['elseifs'] + [block['else'], block['end']]
        next_positions = [p for p in next_positions if p is not None and p > context['index']]

        if next_positions:
            context['index'] = min(next_positions) - 1  # -1 т.к. индекс увеличится после выполнения

    def _skip_to_endif(self, context, block):
        """Пропускает код до конца условия"""
        if block and block['end'] is not None:
            context['index'] = block['end'] - 1  # -1 для компенсации инкремента