class CommentOperator:
    def execute(self, command):
        """Комментарии игнорируются интерпретатором"""
        pass

    @staticmethod
    def is_comment(command):
        """Проверяет, является ли строка комментарием"""
        return command.strip().startswith('#')