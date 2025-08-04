import re
import sys
import tkinter as tk
from tkinter import messagebox
from .base_operator import BaseOperator


class MemiOperator(BaseOperator):

    def is_multiline_command(self, command):
        return True

    def process_multiline_command(self, command, next_lines):
        # Объединяем все строки команды
        return command + "\n" + "\n".join(next_lines) if next_lines else command

    def execute(self, command):
        # Удаляем ключевое слово MEMI
        prompt = re.sub(r'^(MEMI|ВВОД_ЧИСЛА)\s*', '', command, flags=re.IGNORECASE).strip()

        prompt = self.remove_comments(prompt).strip()

        # Обрабатываем многострочный текст (строки с табуляцией)
        formatted_prompt = self._format_message(prompt)

        # Получаем числовой ввод от пользователя
        # user_input = self._get_numeric_input(formatted_prompt)
        user_input = self._get_numeric_input_gui(formatted_prompt)

        # Сохраняем в системную переменную MEM
        self.vm.set_variable('MEM', 'number', user_input)

    def _get_numeric_input_gui(self, prompt):
        """Получает числовой ввод через окно tkinter."""

        result = {"value": None}

        def on_submit():
            val = entry.get().strip().replace(',', '.')
            if val.upper() == 'Q':
                root.destroy()
                sys.exit()

            try:
                number = float(val)
                result["value"] = int(number) if number.is_integer() else number
                root.destroy()
            except ValueError:
                messagebox.showerror("Ошибка", "Введите корректное числовое значение.")

        def on_quit():
            root.destroy()
            sys.exit()

        # Окно
        root = tk.Tk()
        root.title("Ввод числа")
        root.resizable(False, False)
        root.attributes('-topmost', True)
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
        root.lift()
        root.focus_force()

        # Текст
        label = tk.Label(
            root, text=prompt, wraplength=460,
            justify="left", padx=20, pady=20,
            font=("Arial", 12)
        )
        label.pack()

        # Поле ввода
        entry = tk.Entry(root, font=("Arial", 14), justify="center", width=40)
        entry.pack(pady=10)
        entry.focus_set()

        # Контейнер кнопок
        button_frame = tk.Frame(root)
        button_frame.pack(pady=15)

        button_style = {
            "font": ("Arial", 12, "bold"),
            "width": 16,
            "height": 2,
            "bd": 3,
            "relief": "raised",
            "activebackground": "#cce5ff"
        }

        submit_btn = tk.Button(
            button_frame, text="Продолжить", bg="#d4edda",
            command=on_submit, **button_style
        )
        quit_btn = tk.Button(
            button_frame, text="Прекратить", bg="#f8d7da",
            command=on_quit, **button_style
        )

        submit_btn.pack(side="left", padx=20)
        quit_btn.pack(side="right", padx=20)

        # Биндим Enter на первую кнопку
        root.bind("<Return>", lambda event: submit_btn.invoke())

        # Биндим Esc на вторую кнопку
        root.bind("<Escape>", lambda event: on_quit())

        root.mainloop()

        return result["value"]

    def _get_numeric_input(self, prompt):
        """Получает числовой ввод от пользователя. 'Q' — выход."""
        while True:
            user_input = input(f"{prompt}\n(Введите число или Q для остановки поверки)\n> ").strip()

            if user_input.upper() == "Q":
                print("Остановка поверки.")
                sys.exit()  # Или return None, если не хочешь завершать всю программу

            user_input = user_input.replace(',', '.')

            try:
                number = float(user_input)
                if number.is_integer():
                    return int(number)  # убираем дробную часть, если число целое
                else:
                    return number  # оставляем как float
            except ValueError:
                print("Ошибка: необходимо ввести числовое значение.")

    # def _format_prompt(self, prompt):
    #     """Форматирует многострочный текст для отображения"""
    #     lines = prompt.split('\n')
    #     formatted_lines = []
    #
    #     for line in lines:
    #         # Обрабатываем отступы (символ табуляции в начале строки)
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


