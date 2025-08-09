import re
from .base_operator import BaseOperator


class GenerateProtocolOperator(BaseOperator):
    def execute(self, command):
        # Извлекаем путь из команды (если есть)
        path_match = re.sub(r'^(GENERATE_PROTOCOL|СФОРМИРОВАТЬ_ПРОТОКОЛ)\s*', '', command, flags=re.IGNORECASE).strip()
        # output_path = path_match.group(1) if path_match else None
        print(path_match)

        # Генерируем протокол
        self.vm.protocol.generate(path_match)
        pr
        # Выводим результат
        # print(f"Финальный протокол сгенерирован: {output_path}")
        # return output_path