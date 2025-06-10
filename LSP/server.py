import subprocess
import sys

def start_server():
    subprocess.Popen([sys.executable, "lspOld.py"])

if __name__ == "__main__":
    start_server()