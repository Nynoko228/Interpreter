import sys
import time
import re
from .base_operator import BaseOperator


class WaitOperator(BaseOperator):
    def execute(self, command):
        # Удаляем ключевое слово WAIT
        args = re.sub(r'^(WAIT|ЖДАТЬ)\s*', '', command, flags=re.IGNORECASE).strip()

        # Разделяем на время и сообщение
        parts = args.split(maxsplit=1)
        if not parts:
            raise ValueError("Не указаны параметры для WAIT")

        try:
            seconds = int(parts[0])
            message = parts[1] if len(parts) > 1 else "Ждите..."
        except ValueError:
            raise ValueError("Некорректное время ожидания для WAIT")

        # Выводим сообщение с обратным отсчетом
        self._show_countdown(seconds, message)

    def _show_countdown(self, seconds, message):
        """Отображает обратный отсчет с сообщением"""
        print(f"\n{message}")

        for i in range(seconds, 0, -1):
            print(f"\rОсталось: {i} сек.", end="", flush=True)  # \033[K очищает строку до конца
            time.sleep(1)
        print("\r ")
