# Базовый класс для операторов
from abc import ABC, abstractmethod
class BaseOperator(ABC):
    def __init__(self, variable_manager, evaluator):
        self.vm = variable_manager
        self.evaluator = evaluator

    @abstractmethod
    def execute(self, command):
        raise NotImplementedError()

