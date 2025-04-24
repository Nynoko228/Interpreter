import tkinter as tk
import re
from tkinter import messagebox
from PIL import Image, ImageTk
from .base_operator import BaseOperator

class HIVONOperator(BaseOperator):
    def execute(self, command):
        # Проверяем формат команды
        match = re.match(r'^(HIVON|ВЫСНАПР_ВКЛ)\s*$', command.strip(), re.IGNORECASE)
        if not match:
            raise ValueError("Неверный формат команды. Используйте HIVON или ВЫСНАПР_ВКЛ без параметров")

        root = tk.Tk()
        root.title("Предупреждение")
        root.geometry("400x300")  # Размер окна
        root.resizable(False, False)  # Запрещаем изменение размера окна

        try:
            # Загружаем изображение
            image_path = r"C:\MeMorozov\Interpreter\img.png"  # Укажите путь к вашей картинке
            original_image = Image.open(image_path)

            # Функция для изменения размера изображения под размер окна
            def resize_image(event=None):
                # Получаем текущие размеры окна
                window_width = root.winfo_width()
                window_height = root.winfo_height()

                # Изменяем размер изображения, сохраняя пропорции
                resized_image = original_image.resize(
                    (window_width, window_height),  # Оставляем отступы
                    Image.Resampling.LANCZOS
                )

                # Преобразуем изображение в формат, подходящий для Tkinter
                tk_image = ImageTk.PhotoImage(resized_image)

                # Обновляем метку с изображением
                image_label.config(image=tk_image)
                image_label.image = tk_image  # Сохраняем ссылку на изображение

            # Создаем метку для отображения изображения
            image_label = tk.Label(root)
            image_label.pack(pady=10)

            # Добавляем текстовое сообщение
            text_label = tk.Label(root, text="Внимание! Высокое напряжение на измерительных цепях!", font=("Arial", 12))
            text_label.pack(pady=10)

            # Добавляем кнопку "ОК" для закрытия окна
            ok_button = tk.Button(root, text="OK", command=root.destroy, width=10, height=1)
            ok_button.pack(pady=20)

            # Привязываем функцию изменения размера к событию изменения размера окна
            root.bind("<Configure>", resize_image)

            # Первый вызов функции для установки начального размера изображения
            resize_image()

            # Запускаем главный цикл Tkinter
            root.mainloop()

        except Exception as e:
            print(
                f"Ошибка загрузки изображения: {e}. Убедитесь, что файл img.png существует и находится в правильном месте.")
            messagebox.showwarning(
                "Предупреждение",
                "Внимание! Высокое напряжение на измерительных цепях! (Не удалось загрузить изображение)"
            )
        # finally:
        #     # Закрываем окно Tkinter после показа messagebox
        #     root.destroy()