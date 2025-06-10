# Базовый образ с code-server
FROM codercom/code-server:latest

# Задаём переменные прокси
ARG HTTP_PROXY="http://10.140.1.4:8080"
ARG HTTPS_PROXY="http://10.140.1.4:8080"

# Переключаемся на root
USER root

# 1. Настраиваем прокси для системы
ENV http_proxy=$HTTP_PROXY
ENV https_proxy=$HTTPS_PROXY

# 2. Настраиваем прокси для apt
RUN echo 'Acquire::http::Proxy "'${HTTP_PROXY}'";' > /etc/apt/apt.conf.d/99proxy && \
    echo 'Acquire::https::Proxy "'${HTTPS_PROXY}'";' >> /etc/apt/apt.conf.d/99proxy

# 3. Устанавливаем Python и зависимости
RUN apt-get update && \
    apt-get install -y \
    python3 \
    python3-venv \
    python3-pip

# 4. Создаём виртуальное окружение
RUN python3 -m venv /opt/mcf-venv

# 5. Настраиваем прокси для pip
RUN /opt/mcf-venv/bin/pip install --proxy=$HTTP_PROXY pygls

USER 1000
# 6. Копируем проект
WORKDIR /home/coder/mcf-extension
# COPY . .



# 8. Очищаем окружение
EXPOSE 8080
ENV PASSWORD="Test1234"

ENTRYPOINT ["dumb-init", "code-server", "--bind-addr", "0.0.0.0:8080", "--auth", "password"]
