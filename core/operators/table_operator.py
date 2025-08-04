import re
import ast
import sys
import tkinter as tk
from tkinter import simpledialog
from .base_operator import BaseOperator
from openpyxl.utils import column_index_from_string, get_column_letter

class TableOperator(BaseOperator):
    """
    Оператор TABLE принимает два и более списков в квадратных скобках.
    Первый список задаёт заголовки столбцов, последующие — строки данных.
    Элемент 'INPUT' создаёт поле ввода. Элемент, начинающийся с '=', трактуется как формула,
    поддерживающая ссылки на ячейки (A1, B2 и т.д.) и переменные из variable_manager.
    Отображает окно Tkinter с таблицей и кнопками "Продолжить" и "Остановиться".
    """
    def execute(self, command):
        # Парсим списки из команды
        lists = re.findall(r"\[[^\]]*\]", command)
        if len(lists) < 2:
            raise ValueError("Оператор TABLE требует минимум два списка в квадратных скобках")
        try:
            data = [ast.literal_eval(lst) for lst in lists]
        except Exception as e:
            raise ValueError(f"Ошибка разбора списков: {e}")
        headers = data[0]
        rows = data[1:]
        # Создаём окно
        root = tk.Tk()
        root.title("Input Table")
        entries = {}
        # Рисуем заголовки
        for j, header in enumerate(headers):
            lbl = tk.Label(root, text=str(header), font=('Arial', 12, 'bold'), borderwidth=1, relief="solid", padx=5, pady=5)
            lbl.grid(row=0, column=j, sticky="nsew")
        # Рисуем ячейки
        for i, row in enumerate(rows, start=1):
            for j, val in enumerate(row):
                cell_id = f"{get_column_letter(j+1)}{i+1}"
                if isinstance(val, str) and val.upper() == 'INPUT':
                    ent = tk.Entry(root)
                    ent.grid(row=i, column=j, sticky="nsew")
                    entries[cell_id] = ent
                else:
                    lbl = tk.Label(root, text=str(val), borderwidth=1, relief="solid", padx=5, pady=5)
                    lbl.grid(row=i, column=j, sticky="nsew")
        # Кнопки
        result = {'continue': False}
        def on_continue():
            result['continue'] = True
            root.quit()
        def on_stop():
            root.destroy()
            sys.exit(0)
        btn_continue = tk.Button(root, text="Продолжить", command=on_continue, padx=10, pady=5)
        btn_stop = tk.Button(root, text="Остановиться", command=on_stop, padx=10, pady=5)
        btn_continue.grid(row=len(rows)+1, column=0, columnspan=len(headers)//2, pady=10)
        btn_stop.grid(row=len(rows)+1, column=len(headers)//2, columnspan=len(headers)-len(headers)//2, pady=10)
        # Автоматическая растяжка колонок
        for c in range(len(headers)):
            root.grid_columnconfigure(c, weight=1)
        root.mainloop()
        # Если продолжили, собираем данные
        collected = {}
        # Считываем введённые значения
        for cell_id, ent in entries.items():
            collected[cell_id] = ent.get()
        # Обрабатываем формулы в остальных ячейках
        # Формулы: строки, начинающиеся с '='
        # Собираем все значения ячеек
        cells = {}
        # данные статичных ячеек
        for i, row in enumerate(rows, start=1):
            for j, val in enumerate(row):
                cell_id = f"{get_column_letter(j+1)}{i+1}"
                if isinstance(val, str) and val.startswith('='):
                    # вычислим далее
                    pass
                elif isinstance(val, str) and val.upper() == 'INPUT':
                    cells[cell_id] = collected.get(cell_id)
                else:
                    cells[cell_id] = val
        # Вычисляем формулы
        formula_cells = [(i,j,val) for i, row in enumerate(rows, start=1)
                         for j, val in enumerate(row) if isinstance(val, str) and val.startswith('=')]
        for i, j, formula in formula_cells:
            cell_id = f"{get_column_letter(j+1)}{i+1}"
            expr = formula.lstrip('=')
            # Заменяем ссылки A1 на значение
            def repl(match):
                col, rown = match.group(1), match.group(2)
                key = f"{col}{rown}"
                return repr(cells.get(key, 0))
            expr = re.sub(r"([A-Z]+)(\d+)", repl, expr)
            # Добавляем переменные из variable_manager
            local_vars = self.vm.variable_manager.variables.copy()
            try:
                cells[cell_id] = eval(expr, {}, local_vars)
            except Exception as e:
                cells[cell_id] = f"#ERR: {e}"
        # Возвращаем итоговую таблицу
        return cells
