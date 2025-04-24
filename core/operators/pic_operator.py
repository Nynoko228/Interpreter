import os
from PIL import Image
from .base_operator import BaseOperator


class PicOperator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово PIC
        args = command[3:].strip()

        # Разделяем на имя файла и сообщение
        parts = args.split(maxsplit=1)
        if len(parts) < 2:
            raise ValueError("Необходимо указать имя файла и сообщение")

        filename = parts[0]
        message = parts[1]

        # Проверяем расширение файла
        if not self._is_valid_extension(filename):
            raise ValueError("Неподдерживаемый формат изображения. Используйте jpg, png или bmp")

        # Проверяем существование файла
        if not os.path.exists(filename):
            raise FileNotFoundError(f"Файл изображения не найден: {filename}")

        # Отображаем изображение и текст (временная консольная реализация)
        self._display_image(filename, message)

    def _is_valid_extension(self, filename):
        """Проверяет допустимость расширения файла"""
        valid_extensions = {'.jpg', '.jpeg', '.png', '.bmp'}
        return os.path.splitext(filename.lower())[1] in valid_extensions

    def _display_image(self, filename, message):
        """Отображает изображение и текст (заменить на GUI в реальном приложении)"""
        try:
            # В реальном приложении использовать GUI-библиотеку для отображения
            print(f"\n=== Изображение: {filename} ===")
            print(f"Сообщение: {message}")

            # Для консольного вывода просто покажем информацию о изображении
            with Image.open(filename) as img:
                print(f"Размер: {img.size} пикселей")
                print(f"Формат: {img.format}")
                print(f"Режим: {img.mode}")
                img.show()

        except Exception as e:
            raise ValueError(f"Ошибка при загрузке изображения: {str(e)}")