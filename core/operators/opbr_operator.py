import tkinter as tk
from tkinter import messagebox
from .base_operator import BaseOperator
import re


class OpbrOperator(BaseOperator):

    def is_multiline_command(self, command):
        return True

    def process_multiline_command(self, command, next_lines):
        # Объединяем все строки команды
        return command + "\n" + "\n".join(next_lines) if next_lines else command

    def __init__(self, variable_manager, evaluator, eval_operator=None):
        super().__init__(variable_manager, evaluator)
        self.eval_operator = eval_operator  # Ссылка на оператор EVAL

    def execute(self, command):
        message = re.sub(r'^(OPBR|ОПЕР_ОТВ)\s*', '', command, flags=re.IGNORECASE).strip()
        message = self.remove_comments(message).strip()
        formatted_message = self._format_message(message)
        result = self._show_dialog(formatted_message)

        self.vm.set_variable('MEM', 'number', result)

        # Автоматический вызов EVAL после сохранения результата
        # if self.eval_operator:
        #     self._trigger_eval(msg)

    # def _format_message(self, message):
    #     lines = message.split('\n')
    #     formatted_lines = []
    #     msg = message  # Используем полное сообщение вместо первого символа
    #
    #     for line in lines:
    #         if line.startswith('\t'):
    #             line = '    ' + line[1:]
    #         elif line.startswith('*'):
    #             line = line[1:]
    #         formatted_lines.append(line)
    #
    #     return '\n'.join(formatted_lines), msg

    def _show_dialog(self, message):
        # Реальная реализация с GUI
        root = tk.Tk()
        root.withdraw()
        result = messagebox.askyesno("Вопрос", message)
        root.destroy()

        # Временная консольная реализация
        # response = input(f"{message} (Да/Нет): ").lower()
        return 1 if result in ['да', 'yes', 'y'] else 0

    def _trigger_eval(self, msg):
        eval_command = f"EVAL {msg}"
        self.eval_operator.execute(eval_command)