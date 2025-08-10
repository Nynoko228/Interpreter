import re
import sys
import tkinter as tk
from tkinter import messagebox
import datetime

try:
    from tkcalendar import Calendar
except ImportError:
    Calendar = None
from .base_operator import BaseOperator


class CalendarOperator(BaseOperator):

    def is_multiline_command(self, command):
        return True

    def process_multiline_command(self, command, next_lines):
        return command + "\n" + "\n".join(next_lines) if next_lines else command

    def execute(self, command):
        prompt = re.sub(r'^(CALENDAR|КАЛЕНДАРЬ)\s*', '', command, flags=re.IGNORECASE).strip()
        prompt = self.remove_comments(prompt).strip()
        formatted_prompt = self._format_message(prompt)

        selected_date = self._get_date_input_gui(formatted_prompt)

        if selected_date is None:
            sys.exit()

        self.vm.set_variable('MEM_DATE', 'string', selected_date)

    def _format_message(self, prompt):
        lines = prompt.split('\n')
        formatted_lines = []
        for line in lines:
            if line.startswith('\t'):
                line = line[1:]
            elif line.startswith('*'):
                line = line[1:]
            line = self._replace_variables(line)
            formatted_lines.append(line)
        return '\n'.join(formatted_lines)

    def _replace_variables(self, text):
        def replacer(match):
            var_name = match.group(1)
            try:
                var_value = str(self.vm.get_variable(var_name)[1])
                return var_value
            except Exception:
                return match.group(0)

        return re.sub(r'\{([a-zA-Zа-яА-Я_]+[a-zA-Zа-яА-Я0-9_]*)\}', replacer, text)

    def _get_date_input_gui(self, prompt):
        if Calendar is None:
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror(
                "Ошибка",
                "Модуль tkcalendar не установлен. Установите: pip install tkcalendar"
            )
            root.destroy()
            sys.exit(1)

        result = {"value": None}

        root = tk.Tk()
        root.title("Выбор даты")
        window_width = 500
        window_height = 400
        screen_width = root.winfo_screenwidth()
        screen_height = root.winfo_screenheight()
        x = (screen_width - window_width) // 2
        y = (screen_height - window_height) // 2
        root.geometry(f"{window_width}x{window_height}+{x}+{y}")
        root.resizable(False, False)
        root.attributes('-topmost', True)

        # Текст подсказки
        label = tk.Label(
            root, text=prompt,
            wraplength=460, justify="left",
            padx=20, pady=10, font=("Arial", 12)
        )
        label.pack()

        # Календарь
        cal = Calendar(root, selectmode='day', date_pattern='dd-mm-yyyy')
        cal.pack(pady=20, padx=20, fill='both', expand=True)

        # Фрейм для кнопок
        button_frame = tk.Frame(root)
        button_frame.pack(pady=10)

        button_style = {
            "font": ("Arial", 12, "bold"),
            "width": 16,
            "height": 2,
            "bd": 3,
            "relief": "raised",
            "activebackground": "#cce5ff"
        }

        def on_select():
            selected_str = cal.get_date()
            try:
                selected_date = datetime.datetime.strptime(selected_str, "%d-%m-%Y").date()
            except Exception as e:
                messagebox.showerror("Ошибка", f"Некорректная дата: {e}")
                return

            today = datetime.date.today()
            if selected_date > today:
                confirm = messagebox.askyesno(
                    "Подтверждение",
                    "Вы выбрали дату в будущем. Вы уверены?"
                )
                if not confirm:
                    return

            result["value"] = selected_str
            root.destroy()

        def on_cancel():
            root.destroy()
            sys.exit()

        btn_select = tk.Button(
            button_frame, text="Выбрать", bg="#d4edda",
            command=on_select, **button_style
        )
        btn_cancel = tk.Button(
            button_frame, text="Отмена", bg="#f8d7da",
            command=on_cancel, **button_style
        )

        btn_select.pack(side="left", padx=20)
        btn_cancel.pack(side="right", padx=20)

        root.bind("<Return>", lambda event: on_select())
        root.bind("<Escape>", lambda event: on_cancel())

        root.mainloop()

        return result["value"]