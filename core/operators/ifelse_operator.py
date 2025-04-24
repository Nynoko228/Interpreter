from .base_operator import BaseOperator

class IfElseOperator(BaseOperator):
    def __init__(self, vm, evaluator):
        super().__init__(vm, evaluator)
        self.block_stack = []  # Стек для вложенных блоков
        self.current_scope = None  # Текущий блок (IF/ELIF/ELSE)

    def execute(self, command):
        stripped = command.strip()
        parts = stripped.split(maxsplit=1)
        operator = parts[0].upper()
        condition = parts[1] if len(parts) > 1 else ''

        # Если находимся внутри блока, сохраняем команды
        if self.current_scope:
            self._add_to_block(stripped)
            return

        # Обработка операторов условия
        if operator in ('IF', 'ЕСЛИ'):
            self._start_if(condition)
        elif operator in ('ELSEIF', 'ИНАЧЕЕСЛИ'):
            self._add_elif(condition)
        elif operator in ('ELSE', 'ИНАЧЕ'):
            self._start_else()
        elif operator in ('ENDIF', 'КОНЕЦЕСЛИ'):
            self._end_if()

    def _start_if(self, condition):
        new_block = {
            'condition': self.evaluator.evaluate(condition),
            'then': [],
            'elifs': [],
            'else': [],
            'executed': False
        }
        self.block_stack.append(new_block)
        self.current_scope = 'THEN'

    def _add_elif(self, condition):
        if not self.block_stack:
            raise SyntaxError("ELSEIF вне блока IF")
        self.block_stack[-1]['elifs'].append({
            'condition': self.evaluator.evaluate(condition),
            'commands': []
        })
        self.current_scope = 'ELIF'

    def _start_else(self):
        if not self.block_stack:
            raise SyntaxError("ELSE вне блока IF")
        self.current_scope = 'ELSE'

    def _end_if(self):
        if not self.block_stack:
            raise SyntaxError("ENDIF без IF")
        block = self.block_stack.pop()
        self._execute_block(block)
        self.current_scope = None

    def _add_to_block(self, command):
        current_block = self.block_stack[-1]
        if self.current_scope == 'THEN':
            current_block['then'].append(command)
        elif self.current_scope == 'ELIF':
            current_block['elifs'][-1]['commands'].append(command)
        elif self.current_scope == 'ELSE':
            current_block['else'].append(command)

    def _execute_block(self, block):
        if block['condition']:
            self._run_commands(block['then'])
            return
        for elif_block in block['elifs']:
            if elif_block['condition']:
                self._run_commands(elif_block['commands'])
                return
        self._run_commands(block['else'])

    def _run_commands(self, commands):
        for cmd in commands:
            stripped = cmd.strip()
            if not stripped or self.comment_operator.is_comment(stripped):
                continue
            operator = stripped.split()[0].upper()
            self.operators[operator].execute(cmd)