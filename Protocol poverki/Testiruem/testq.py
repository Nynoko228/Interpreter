import pandas as pd

def find_marker(file_path, marker='{{MEASUREMENTS_START}}', sheet_name=0):
    """
    Ищет метку в Excel-файле и возвращает её позицию в формате (строка, столбец).

    :param file_path: Путь к Excel-файлу
    :param marker: Искомая метка
    :param sheet_name: Название или номер листа (по умолчанию первый)
    :return: Кортеж (строка, столбец) или None, если не найдено
    """
    try:
        # Загружаем лист Excel в DataFrame
        df = pd.read_excel(file_path, sheet_name=sheet_name)

        # Итерируемся по строкам и столбцам
        for row_index, row in df.iterrows():
            for col_index, value in enumerate(row):
                # Приводим значение к строке и сравниваем
                if str(value) == marker:
                    # Возвращаем позицию в формате Excel: строка (1-based), имя столбца
                    return (row_index + 1, df.columns[col_index])

        # Если метка не найдена
        return None

    except Exception as e:
        print(f"Ошибка при чтении файла: {e}")
        return None