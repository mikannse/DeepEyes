from scapy.all import *

# 定义目标字符串（注意：需转为字节类型）
target_str = b"eyJtc2c"

# 读取原始 pcap 文件
packets = rdpcap("input.pcap")

# 遍历所有数据包
with open("output.txt", "ab") as f:  # 'ab' 表示二进制追加模式
    for pkt in packets:
        if pkt.haslayer(Raw):
            raw_load = pkt[Raw].load
            if target_str in raw_load:
                # 将原始载荷追加写入文件
                f.write(raw_load)
                f.write(b"\n")  # 可选：添加分隔符
