import queue
import requests
import sys
import threading
import time

TARGET = "http://localhost/WordPress-master"
THREADS = 10

answers = queue.Queue()  # 存储最后实际扫描到的路径
web_paths = queue.Queue()  # 存储准备扫描的路径


def read_directory_file(file_path):
    """读取本地目录字典文件，并将路径放入web_paths队列中"""
    with open(file_path, 'r') as file:
        for line in file:
            path = line.strip()  # 去除首尾空白字符
            web_paths.put(path)


def test_remote():
    """循环扫描，直到web_path的路径被取完"""
    while not web_paths.empty():
        path = web_paths.get()  # 每次取一条路径
        url = f'{TARGET}{path}'
        time.sleep(2)  # 每个请求间隔2秒
        r = requests.get(url)
        if r.status_code == 200:
            answers.put(url)
            sys.stdout.write('+')
        else:
            sys.stdout.write('x')
        sys.stdout.flush()


def run():
    mythreads = []  # 创建了一个空列表 mythreads 用于存储线程对象
    for i in range(THREADS):
        print(f'Spawning thread {i}')
        t = threading.Thread(target=test_remote)  # 每个线程都执行test_remote函数，传递函数的引用
        mythreads.append(t)
        t.start()

    for thread in mythreads:
        thread.join()


if __name__ == '__main__':
    # 请替换下面的路径为你的目录字典文件路径
    directory_file_path = "./dictionary.txt"
    read_directory_file(directory_file_path)
    run()

    with open('myanswers.txt', 'w') as f:
        while not answers.empty():
            f.write(f'{answers.get()}\n')
    print('done')

if __name__ == '__main__':
