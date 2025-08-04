from core.operators.do_while_operator import DoWhileOperator
from core.operators.eval_operator import EvalOperator
from core.operators.generate_protocol_operator import GenerateProtocolOperator
from core.operators.hivon_operator import HIVONOperator
from core.operators.if_operator import IfOperator
# from core.operators.ifelse_operator import IfElseOperator
from core.operators.jlabel_operator import JLabelOperator
from core.operators.label_operator import LabelOperator
from core.operators.memc_operator import MemcOperator
from core.operators.opbr_operator import OpbrOperator
from core.operators.pic_operator import PicOperator
from core.operators.result_operator import ResultOperator
from core.operators.sfon_operator import SfonOperator
from core.operators.exit_operator import ExitOperator
from core.operators.target_operator import TargetOperator
from core.operators.write_operator import WriteOperator
from core.variable_manager import VariableManager
from core.expression_evaluator import ExpressionEvaluator
from core.operators.math_operator import MathOperator
from core.operators.disp_operator import DispOperator
from core.operators.wait_operator import WaitOperator
from core.operators.comment_operator import CommentOperator
from core.operators.memi_operator import MemiOperator
from core.operators.mem2_operator import Mem2Operator
from core.operators.call_operator import CallOperator
from core.operators.table_operator import TableOperator
from core.operators.load_protocol_operator import LoadProtocolOperator
from core.operators.time_operator import TimeOperator
import sys

class Interpreter:
    def __init__(self):
        self.variable_manager = VariableManager()
        self.evaluator = ExpressionEvaluator(self.variable_manager)
        self.comment_operator = CommentOperator()
        self.operators = {
            'MATH': MathOperator(self.variable_manager, self.evaluator),
            'МАТЕМ': MathOperator(self.variable_manager, self.evaluator),
            'DISP': DispOperator(self.variable_manager, self.evaluator),
            'ПОКАЗ': DispOperator(self.variable_manager, self.evaluator),
            'WAIT': WaitOperator(self.variable_manager, self.evaluator),
            'ЖДАТЬ': WaitOperator(self.variable_manager, self.evaluator),
            'MEMI': MemiOperator(self.variable_manager, self.evaluator),
            'ВВОД_ЧИСЛА': MemiOperator(self.variable_manager, self.evaluator),
            'MEM2': Mem2Operator(self.variable_manager, self.evaluator),
            'RSLT': ResultOperator(self.variable_manager, self.evaluator),
            'OPBR': OpbrOperator(self.variable_manager, self.evaluator, eval_operator=EvalOperator(self.variable_manager, self.evaluator)),
            'EVAL': EvalOperator(self.variable_manager, self.evaluator),
            'ОЦЕН': EvalOperator(self.variable_manager, self.evaluator),
            'PIC': PicOperator(self.variable_manager, self.evaluator),
            'CALL': CallOperator(self.variable_manager, self.evaluator),
            # 'TARGET': TargetOperator(self.variable_manager, self.evaluator), # Не работает
            # 'SFON': SfonOperator(self.variable_manager, self.evaluator),    # Не работает
            'HIVON': HIVONOperator(self.variable_manager, self.evaluator),
            'ВЫСНАПР_ВКЛ': HIVONOperator(self.variable_manager, self.evaluator),
            'MEMC' : MemcOperator(self.variable_manager, self.evaluator),
            'ИТОГ' : MemcOperator(self.variable_manager, self.evaluator),
            'LABEL': LabelOperator(self, self.variable_manager, self.evaluator),
            'LJUMP': JLabelOperator(self, self.variable_manager, self.evaluator),
            'JLABEL': JLabelOperator(self, self.variable_manager, self.evaluator),
            'IF': IfOperator(self, self.variable_manager, self.evaluator),
            'ЕСЛИ': IfOperator(self, self.variable_manager, self.evaluator),
            'ELSEIF': IfOperator(self, self.variable_manager, self.evaluator),
            'ИНАЧЕЕСЛИ': IfOperator(self, self.variable_manager, self.evaluator),
            'ELSE': IfOperator(self, self.variable_manager, self.evaluator),
            'ИНАЧЕ': IfOperator(self, self.variable_manager, self.evaluator),
            'ENDIF': IfOperator(self, self.variable_manager, self.evaluator),
            'КОНЕЦЕСЛИ': IfOperator(self, self.variable_manager, self.evaluator),
            'DO': DoWhileOperator(self, self.variable_manager, self.evaluator),
            'ДЕЛАТЬ': DoWhileOperator(self, self.variable_manager, self.evaluator),
            'WHILE': DoWhileOperator(self, self.variable_manager, self.evaluator),
            'ПОКА': DoWhileOperator(self, self.variable_manager, self.evaluator),
            'LOAD_PROTOCOL': LoadProtocolOperator(self.variable_manager, self.evaluator),
            'ЗАГРУЗИТЬ_ПРОТОКОЛ': LoadProtocolOperator(self.variable_manager, self.evaluator),
            'GENERATE_PROTOCOL': GenerateProtocolOperator(self.variable_manager, self.evaluator),
            'СФОРМИРОВАТЬ_ПРОТОКОЛ': GenerateProtocolOperator(self.variable_manager, self.evaluator),
            'WRITE': WriteOperator(self.variable_manager, self.evaluator),
            'ЗАПИСАТЬ': WriteOperator(self.variable_manager, self.evaluator),
            'EXIT': ExitOperator(self.variable_manager, self.evaluator),
            'ВЫХОД': ExitOperator(self.variable_manager, self.evaluator),
            'TABLE': TableOperator(self.variable_manager, self.evaluator),
            'ТАБЛИЦА': TableOperator(self.variable_manager, self.evaluator),
            'TIME': TimeOperator(self.variable_manager, self.evaluator),
            'ВРЕМЯ': TimeOperator(self.variable_manager, self.evaluator),
        }
        self.context_stack = []
        self.current_context = None
        self.targets = [] # Стэк для таргетов


    def execute_command(self, command):
        command = command.strip()


        if not command or self.comment_operator.is_comment(command):
            return

        operator_name = command.split()[0].upper()
        if operator_name not in self.operators:
            raise ValueError(f"Неизвестный оператор: {operator_name}")

        # Особый случай для оператора CALL
        if operator_name == 'CALL':
            procedure_code = self.operators['CALL'].execute(command)
            self._execute_procedure(procedure_code)
        else:
            self.operators[operator_name].execute(command)
            if operator_name == 'TARGET':
                self.targets.append(len(self.targets))

    def execute_script(self, script_lines):
        """Исполняет скрипт или процедуру с поддержкой контекста условий и многострочных команд"""
        context = {
            'code': script_lines,
            'labels': {},
            'index': 0,
            'condition_stack': [],
            'index_map': {},
            'condition_blocks': [],
            'do_while_stack': []  # Добавляем стек для циклов
        }

        # Сбор меток и блоков условий
        stack = []
        for idx, line in enumerate(script_lines):
            up = line.strip().upper()
            if up.startswith('LABEL '):
                context['labels'][line.split(maxsplit=1)[1].strip()] = idx

        # Сбор информации о блоках условий
        context['condition_blocks'] = []
        context['index_map'] = {}
        for idx, line in enumerate(script_lines):
            up = line.strip().upper()
            if up.startswith(('IF ', 'ЕСЛИ ')):
                stack.append({'type': 'if', 'start': idx, 'elseifs': [], 'else': None, 'end': None})
            elif up.startswith(('ELSEIF', 'ИНАЧЕЕСЛИ')) and stack and stack[-1]['type'] == 'if':
                stack[-1]['elseifs'].append(idx)
            elif up.startswith(('ELSE', 'ИНАЧЕ')) and stack and stack[-1]['type'] == 'if':
                stack[-1]['else'] = idx
            elif up.startswith(('ENDIF', 'КОНЕЦЕСЛИ')) and stack and stack[-1]['type'] == 'if':
                block = stack.pop()
                block['end'] = idx
                context['condition_blocks'].append(block)
                # Связываем каждую строку в блоке с этим блоком
                context['index_map'][block['start']] = block
                for elseif in block['elseifs']:
                    context['index_map'][elseif] = block
                if block['else'] is not None:
                    context['index_map'][block['else']] = block
                context['index_map'][idx] = block  # ENDIF

        self.context_stack.append(context)
        self.current_context = context
        try:
            # Основной цикл исполнения
            while context['index'] < len(script_lines):
                raw = script_lines[context['index']]
                line = raw.strip()
                # Пропуск комментариев/пустых
                if not line or self.comment_operator.is_comment(line):
                    context['index'] += 1
                    continue

                old_index = context['index']  # Сохраняем текущий индекс

                # Многострочные команды
                op = line.split()[0].upper()
                if op in self.operators and self.operators[op].is_multiline_command(raw):
                    lines = [raw.rstrip()]
                    context['index'] += 1
                    while context['index'] < len(script_lines):
                        nxt = script_lines[context['index']]
                        if nxt.startswith((' ', '\t')) and not self.comment_operator.is_comment(nxt.strip()):
                            lines.append(nxt.rstrip())
                            context['index'] += 1
                        else:
                            break
                    self.execute_command("\n".join(lines))
                    continue

                # Одиночная команда
                self.execute_command(line)

                # Если индекс не изменился, переходим к следующей строке
                if context['index'] == old_index:
                    context['index'] += 1
        finally:
            # Убираем контекст из стека после завершения
            self.context_stack.pop()
            self.current_context = self.context_stack[-1] if self.context_stack else None

    def _execute_procedure(self, procedure_code):
        self.execute_script(procedure_code)

    def _skip_to(self, block, context):
        # пропустить до конца блока или до альтернативы
        target = block['elseifs'][0] if block['elseifs'] else block['else'] or block['end']
        context['index'] = target

    # def _execute_procedure(self, procedure_code):
    #     """Выполняет код процедуры с поддержкой меток до/после переходов"""
    #     # Инициализация контекста с обязательными полями
    #     context = {
    #         'code': procedure_code, # Исходный код процедуры (список строк)
    #         'labels': {}, # Словарь меток вида {"имя_метки": номер_строки}
    #         'index': 0,  # Текущий номер выполняемой строки (индекс в списке code)
    #         'condition_stack': [], # Стек для отслеживания вложенных условий
    #         'executed_blocks': set(), # Множество выполненных блоков условий
    #         'index_map': {}, # Карта связей: {номер_строки: блок_условия}
    #         'condition_blocks': [], # Список всех блоков условий в процедуре
    #         'do_while_stack': [],  # Стек для циклов DO-WHILE
    #     }
    #
    #     stack = []
    #
    #     # Предварительный анализ структуры кода
    #     for idx, line in enumerate(procedure_code):
    #         line_upper = line.strip().upper()
    #
    #         # Обработка меток
    #         if line_upper.startswith('LABEL '):
    #             label_name = line.split(maxsplit=1)[1].strip()
    #             context['labels'][label_name] = idx
    #
    #         # Обработка условий
    #         if line_upper.startswith(('IF ', 'ЕСЛИ ')):
    #             stack.append({
    #                 'type': 'if',
    #                 'start': idx,
    #                 'elseifs': [],
    #                 'else': None,
    #                 'end': None
    #             })
    #         elif line_upper.startswith(('ELSEIF ', 'ИНАЧЕЕСЛИ ')):
    #             if stack and stack[-1]['type'] == 'if':
    #                 stack[-1]['elseifs'].append(idx)
    #         elif line_upper.startswith(('ELSE', 'ИНАЧЕ')):
    #             if stack and stack[-1]['type'] == 'if':
    #                 stack[-1]['else'] = idx
    #         elif line_upper.startswith(('ENDIF', 'КОНЕЦЕСЛИ')):
    #             if stack and stack[-1]['type'] == 'if':
    #                 block = stack.pop()
    #                 block['end'] = idx
    #                 context['condition_blocks'].append(block)
    #                 context['index_map'].update({
    #                     block['start']: block,
    #                     **{elseif: block for elseif in block['elseifs']},
    #                     block['else']: block if block['else'] else None,
    #                     idx: block  # ENDIF
    #                 })
    #
    #     # print(context)
    #     # Добавляем контекст в стек
    #     self.context_stack.append(context)
    #     # print(self.context_stack)
    #
    #     # Выполнение кода
    #     while self.context_stack and context['index'] < len(procedure_code):
    #         line = procedure_code[context['index']]
    #         self.execute_command(line)
    #         context['index'] += 1  # Инкремент индекса
    #         # print(context['index'])
    #         # print(context['executed_blocks'])
    #     self.context_stack.pop()
    #
    # def execute_script(self, script_lines):
    #     """Выполняет скрипт с поддержкой многострочных команд"""
    #     index = 0
    #     while index < len(script_lines):
    #         line = script_lines[index].strip()
    #
    #         # Пропускаем пустые строки и комментарии
    #         if not line or self.comment_operator.is_comment(line):
    #             index += 1
    #             continue
    #
    #         operator_name = line.split()[0].upper()
    #
    #         # Проверяем, поддерживает ли оператор многострочный ввод
    #         if operator_name in self.operators and self.operators[operator_name].is_multiline_command(line):
    #             # Собираем все строки команды
    #             command_lines = [line]
    #             index += 1
    #
    #             # Собираем последующие строки с отступом
    #             while index < len(script_lines):
    #                 next_line = script_lines[index]
    #                 # Пропускаем комментарии внутри многострочной команды
    #                 stripped_line = next_line.strip()
    #                 if not stripped_line or self.comment_operator.is_comment(stripped_line):
    #                     index += 1
    #                     continue
    #                 if next_line.startswith((' ', '\t')) and not self.comment_operator.is_comment(next_line.strip()):
    #                     command_lines.append(next_line.rstrip())
    #                     index += 1
    #                 else:
    #                     break
    #
    #             full_command = "\n".join(command_lines)
    #             self.execute_command(full_command)
    #         else:
    #             # Обычная однострочная команда
    #             print(line)
    #             self.execute_command(line)
    #             index += 1



    def get_variables(self):
        return self.variable_manager.get_all_variables()

    def get_current_context(self):
        return self.context_stack[-1] if self.context_stack else None

    def _skip_commands(self, context):
        condition_stack = context.get('condition_stack', [])
        skip_depth = 1
        while context['index'] < len(context['code']):
            line = context['code'][context['index']].strip().upper()
            if line.startswith(('IF', 'ЕСЛИ')):
                skip_depth += 1
            elif line.startswith(('ENDIF', 'КОНЕЦЕСЛИ')):
                skip_depth -= 1
                if skip_depth == 0:
                    break
            context['index'] += 1

if __name__ == "__main__":
    interpreter = Interpreter()

    # # Комментарии игнорируются
    # interpreter.execute_command("# Это комментарий")
    # interpreter.execute_command("   # Комментарий с пробелами")
    #
    # # Рабочие команды
    # interpreter.execute_command("MATH a = 3.14")
    # interpreter.execute_command("MATH b = a * 2")
    #
    # print(interpreter.get_variables())
    #
    # # Установим переменную
    # interpreter.execute_command("MATH напр = 5")
    #
    # interpreter.execute_command("""
    # DISP В школе я всегда ХОТЕЛ учиться на {напр}
    #     Но получалось поменьше
    # *А это строка с отступом
    # """)
    # print(interpreter.get_variables())
    #
    # # Простая задержка
    # # interpreter.execute_command("WAIT 3")
    #
    # # Задержка с сообщением
    # # interpreter.execute_command("WAIT 5 Ждите завершения операции...")
    #
    # # Простой ввод числа
    # interpreter.execute_command("MEMI Введите измеренное значение:")
    #
    # # Многострочный запрос
    # interpreter.execute_command("""
    # MEMI Введите параметры:
    #     Температура:
    #     Давление:
    # """)
    #
    # # После выполнения значение будет доступно в переменной MEM
    # print("Введенное значение:", interpreter.get_variables().get('MEM'))
    #
    # interpreter.execute_command("MEM2 Введите модель прибора:")
    # print(interpreter.get_variables().get('MEM2'))  # Выведет введённое пользователем значение
    #
    # interpreter.execute_command("RSLT [1] Определение метрологических характеристик:")
    # # print(interpreter.get_variables())
    #
    # interpreter.execute_command("RSLT [2] Итоговые результаты измерений:")
    #
    # print(interpreter.get_variables())
    #
    # interpreter.execute_command("OPBR Вы хотите продолжить?")
    # print(interpreter.get_variables()['MEM'])  # Выведет: 1 (если выбран "Да") или 0 (если выбран "Нет")
    #
    # interpreter.execute_command("EVAL Проверка тока")
    #
    # interpreter.execute_command("PIC cat.jpg Схема подключения устройства")

    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        script_lines = f.readlines()

    interpreter.execute_script(script_lines)
    print(interpreter.variable_manager.get_all_variables())
    # print(interpreter.get_variables())
