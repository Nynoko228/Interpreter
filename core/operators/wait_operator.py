import sys
import time
import re
from .base_operator import BaseOperator


class WaitOperator(BaseOperator):

    def is_multiline_command(self, command):
        return True

    def process_multiline_command(self, command, next_lines):
        # Объединяем все строки команды
        return command + "\n" + "\n".join(next_lines) if next_lines else command

    def execute(self, command):
        # Удаляем ключевое слово WAIT
        args = re.sub(r'^(WAIT|ЖДАТЬ)\s*', '', command, flags=re.IGNORECASE).strip()
        # Разделяем на время и сообщение
        parts = args.split(maxsplit=1)
        print(parts)
        if not parts:
            raise ValueError("Не указаны параметры для WAIT")

        try:
            seconds = int(parts[0])
            message = parts[1] if len(parts) > 1 else "Ждите..."
            message = self.remove_comments(message).strip()
            formatted_message = self._format_message(message)
        except ValueError:
            raise ValueError("Некорректное время ожидания для WAIT")

        # Выводим сообщение с обратным отсчетом
        self._show_countdown(seconds, formatted_message)

    def _show_countdown(self, seconds, message):
        """Отображает обратный отсчет с сообщением"""
        print(f"\n{message}")

        for i in range(seconds, 0, -1):
            print(f"\r{message}: {i} сек.", end="", flush=True)  # \033[K очищает строку до конца
            time.sleep(1)
        print("\n")
