from flask import Flask, Response
import pyautogui
import time
import io
from PIL import Image

app = Flask(__name__)


def generate_frames():
    """Генератор кадров для видеопотока"""
    while True:
        # Захват экрана
        screenshot = pyautogui.screenshot()

        # Конвертация в байтовый поток
        img_buffer = io.BytesIO()
        screenshot.save(img_buffer, format='JPEG')
        img_buffer.seek(0)

        # Формирование кадра для MJPEG
        frame = img_buffer.getvalue()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

        # Задержка для контроля FPS (примерно 5 кадров/сек)
        time.sleep(0.2)


@app.route('/')
def index():
    """Главная страница с плеером"""
    return """
    <html>
      <head>
        <title>Screen Capture</title>
      </head>
      <body>
        <h1>Live Screen Streaming</h1>
        <img src="/video_feed" width="800">
      </body>
    </html>
    """


@app.route('/video_feed')
def video_feed():
    """Видеопоток в формате MJPEG"""
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)