const { spawn } = require('child_process');
const path = require('path');

// Запускаем Python-сервер
const pythonProcess = spawn('python3', [path.join(__dirname, 'lspOld.py')]);

// Перенаправляем вывод Python-сервера в stdout
pythonProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
});

// Перенаправляем ошибки
pythonProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
});

// Обработка завершения процесса
process.on('exit', () => {
    pythonProcess.kill();
});