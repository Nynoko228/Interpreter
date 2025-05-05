# 1) Базовый образ с code-server
FROM codercom/code-server:latest

# 2) Задаём пароль для входа
ENV PASSWORD="Test1234"

# 3) Устанавливаем рабочую директорию
WORKDIR /home/coder/project

# 4) Копируем весь проект (interpreter.py, папку core/, папку mylang/ с VSIX и .vscode/)
COPY . /home/coder/project/

# 5) Устанавливаем ваше расширение из VSIX, который лежит в mylang/
RUN if ls /home/coder/project/mylang/*.vsix 1> /dev/null 2>&1; then \
      code-server --install-extension /home/coder/project/mylang/*.vsix && \
      echo "✅ MyLang extension installed" ; \
    else \
      echo "ℹ️  No VSIX found in mylang/, skipping extension install" ; \
    fi

# 6) Открываем порт 8080
EXPOSE 8080

# 7) По запуску стартуем code-server на всех интерфейсах
ENTRYPOINT ["dumb-init", "code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "password"]
