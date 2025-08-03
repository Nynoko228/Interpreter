import sys
import re
from .base_operator import BaseOperator

class ExitOperator(BaseOperator):
    def execute(self, command):
        # Проверяем, что команда действительно EXIT/ВЫХОД
        if re.match(r'^(EXIT|ВЫХОД)\s*$', command, re.IGNORECASE):
            sys.exit(0)  # Немедленное завершение программы
        else:
            # Если команда не распознана, можно сгенерировать ошибку
            raise ValueError(f"Некорректная команда выхода: {command}")