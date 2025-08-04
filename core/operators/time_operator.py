import datetime
from .base_operator import BaseOperator

class TimeOperator(BaseOperator):
    """
    Оператор TIME записывает текущее системное время в формате 'дд.мм.гггг'
    в переменную MEM2 как строку.
    """
    def execute(self, command):
        # Получаем текущую локальную дату
        now = datetime.datetime.now()
        date_str = now.strftime('%d.%m.%Y')
        # Записываем в переменную MEM2
        self.vm.set_variable('MEM2', 'string', date_str)
