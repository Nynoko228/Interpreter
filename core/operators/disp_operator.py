import re
import sys
import tkinter as tk
from tkinter import messagebox

from .base_operator import BaseOperator

class DispOperator(BaseOperator):

    def is_multiline_command(self, command):
        return True

    def process_multiline_command(self, command, next_lines):
        return command + "\n" + "\n".join(next_lines) if next_lines else command

    def execute(self, command):
        # Удаляем ключевое слово DISP
        message = re.sub(r'^(DISP|ПОКАЗ)\s*', '', command, flags=re.IGNORECASE)
        message = self.remove_comments(message).strip()
        formatted_message = self._format_message(message)

        # Создаем GUI-окно с сообщением и кнопками
        self.show_message_box(formatted_message)

    def show_message_box(self, message):
        root = tk.Tk()
        root.title("Сообщение от DISP")
        # Установка фиксированного размера окна
        window_width = 500
        window_height = 250

        # Вычисление координат для центрирования
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2

        # Применение геометрии с центрированием
        root.geometry(f"{window_width}x{window_height}+{x}+{y}")  # Изменено!
        root.resizable(False, False)

        # Установка окна поверх всех
        root.attributes('-topmost', True)
        root.lift()
        root.focus_force()

        # Основной текст
        label = tk.Label(
            root,
            text=message,
            wraplength=460,
            justify="left",
            padx=20,
            pady=20,
            font=("Arial", 12)
        )
        label.pack(expand=True, fill="both")

        # Контейнер для кнопок
        button_frame = tk.Frame(root)
        button_frame.pack(pady=15)

        # Обработчики кнопок
        def on_continue():
            root.destroy()

        def on_quit():
            root.destroy()
            sys.exit(0)

        # Стили кнопок
        button_style = {
            "font": ("Arial", 12, "bold"),
            "width": 16,
            "height": 2,
            "bd": 3,
            "relief": "raised",
            "activebackground": "#cce5ff"
        }

        continue_button = tk.Button(
            button_frame,
            text="Продолжить",
            command=on_continue,
            bg="#d4edda",
            **button_style
        )
        quit_button = tk.Button(
            button_frame,
            text="Остановить",
            command=on_quit,
            bg="#f8d7da",
            **button_style
        )

        continue_button.pack(side="left", padx=20)
        quit_button.pack(side="right", padx=20)

        # Биндим Enter на первую кнопку
        root.bind("<Return>", lambda event: continue_button.invoke())

        # Биндим Esc на вторую кнопку
        root.bind("<Escape>", lambda event: on_quit())

        root.mainloop()


    # def _format_message(self, message):
    #     lines = message.split('\n')
    #     formatted_lines = []
    #
    #     for line in lines:
    #         # Обрабатываем отступы (символ табуляции или *)
    #         if line.startswith('\t') or line.startswith('*'):
    #             line = line[1:]
    #
    #         # Подставляем значения переменных
    #         line = self._replace_variables(line)
    #         formatted_lines.append(line)
    #
    #     return '\n'.join(formatted_lines)

    # def _replace_variables(self, text):
    #     def replacer(match):
    #         var_name = match.group(1)
    #         try:
    #             var_value = str(self.vm.get_variable(var_name)[1])
    #             return var_value
    #         except NameError:
    #             return match.group(0)  # Если переменная не найдена, оставляем как есть
    #
    #     return re.sub(r'\{([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\}', replacer, text)