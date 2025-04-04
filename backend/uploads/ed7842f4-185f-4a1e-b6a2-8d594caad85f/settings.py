from tkinter import filedialog

#导入IP字典到一个列表
def import_ip_dic(master):
    # 使用文件对话框选择文件
    filepath = filedialog.askopenfilename(
        title="选择IP字典文件",
        filetypes=(("Text files", "*.txt"), ("All files", "*.*"))
    )
    if filepath:
        # 读取文件内容并存储到列表中
        with open(filepath, "r") as file:
            ip_list = [line.strip() for line in file]
        print(f"已导入 {len(ip_list)} 个IP地址。")
        return ip_list
    else:
        return []