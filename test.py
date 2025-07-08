import re

if __name__ == "__main__":
    pattern = re.compile(r'\{\{(.*?)\}\}')
    print(pattern.findall(input()))