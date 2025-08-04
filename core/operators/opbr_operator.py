import tkinter as tk
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
        result = self._show_dialog_gui(formatted_message)

        self.vm.set_variable('MEM', 'number', result)

        # Автоматический вызов EVAL после сохранения результата
        # if self.eval_operator:
        #     self._trigger_eval(msg)

    def _show_dialog_gui(self, message):
        """Показ окна с вопросом и кнопками Да/Нет"""

        result = {"value": 0}  # 1 — Да, 0 — Нет

        def on_yes():
            result["value"] = 1
            root.destroy()

        def on_no():
            result["value"] = 0
            root.destroy()

        root = tk.Tk()
        root.title("Подтверждение")
        root.resizable(False, False)
        # Установка фиксированного размера окна
        window_width = 500
        window_height = 250

        # Вычисление координат для центрирования
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2

        # Применение геометрии с центрированием
        root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        root.attributes("-topmost", True)
        root.lift()
        root.focus_force()

        # Сообщение
        label = tk.Label(
            root, text=message, wraplength=460,
            justify="left", padx=20, pady=30,
            font=("Arial", 12)
        )
        label.pack()

        # Кнопки
        button_frame = tk.Frame(root)
        button_frame.pack(pady=10)

        button_style = {
            "font": ("Arial", 12, "bold"),
            "width": 12,
            "height": 2,
            "bd": 3,
            "relief": "raised",
            "activebackground": "#cce5ff"
        }

        yes_btn = tk.Button(
            button_frame, text="Да", bg="#d4edda",
            command=on_yes, **button_style
        )
        no_btn = tk.Button(
            button_frame, text="Нет", bg="#f8d7da",
            command=on_no, **button_style
        )

        yes_btn.pack(side="left", padx=30)
        no_btn.pack(side="right", padx=30)

        # Биндим Enter на первую кнопку
        root.bind("<Return>", lambda event: yes_btn.invoke())

        # Биндим Esc на вторую кнопку
        root.bind("<Escape>", lambda event: no_btn.invoke())

        root.mainloop()
        return result["value"]

    # def _show_dialog(self, message):
    #     # Реальная реализация с GUI
    #     root = tk.Tk()
    #     root.withdraw()
    #     result = messagebox.askyesno("Вопрос", message)
    #     root.destroy()
    #
    #     # Временная консольная реализация
    #     # response = input(f"{message} (Да/Нет): ").lower()
    #     return 1 if result in ['да', 'yes', 'y'] else 0

    def _trigger_eval(self, msg):
        eval_command = f"EVAL {msg}"
        self.eval_operator.execute(eval_command)

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

