import socket
import os
import subprocess
import time

# 获取本地IP地址
def get_local_ip():
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    return local_ip

LOCAL_IP = get_local_ip()
PORT = 10001

# 设置并检查 fastopen 配置
def configure_fastopen():
    try:
        subprocess.run(['sudo', 'sysctl', '-w', 'net.inet.tcp.fastopen=1'], check=True)
        result = subprocess.run(['sysctl', 'net.inet.tcp.fastopen'], capture_output=True, text=True, check=True)
        print(f"检查 fastopen 配置的输出: {result.stdout}")
    except subprocess.CalledProcessError as e:
        print(f"设置或检查 fastopen 配置时出错: {e}")

# 创建服务器并启用 TFO
def start_server():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server_socket.bind((LOCAL_IP, PORT))
    server_socket.listen(100)
    print(f"Server listening on {LOCAL_IP}:{PORT}")

    while True:
        client_socket, addr = server_socket.accept()
        print(f"New connection from {addr}")
        data = client_socket.recv(1024)
        if data:
            print(f"Server received: {data.decode()}")
        client_socket.close()

# 第一次连接以请求 TFO cookie
def first_connect():
    print('\nInitiating first connection for TFO cookie...')
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    client_socket.connect((LOCAL_IP, PORT))
    client_socket.sendall(b'Initial connection data')
    print('First connection established')
    client_socket.close()
    print('First connection closed')

# 第二次连接并发送 TFO 数据
def fast_open_connect():
    print('\nAttempting Fast Open connection...')
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM, socket.IPPROTO_TCP)
    client_socket.setsockopt(socket.IPPROTO_TCP, 0x105, 1)  # 0x105 是 TCP_FASTOPEN 的值
    client_socket.connect((LOCAL_IP, PORT))
    client_socket.sendall(b'TFO DATA IN SYN')
    print('Fast Open connection established')
    client_socket.close()
    print('Fast Open connection closed')

if __name__ == "__main__":
    configure_fastopen()
    server_process = subprocess.Popen(['python3', '-c', f'import {__file__[:-3]}; {__file__[:-3]}.start_server()'])
    time.sleep(1)
    first_connect()
    time.sleep(1)
    fast_open_connect()
    server_process.terminate()