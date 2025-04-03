# backend/app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS  # 解决跨域问题
import os
import tempfile
import requests
import pdfkit
from jinja2 import Environment, FileSystemLoader
from dotenv import load_dotenv

load_dotenv()  # 从 .env 加载环境变量
app = Flask(__name__)
CORS(app)  # 允许跨域请求

UPLOAD_FOLDER = tempfile.mkdtemp()
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')

@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        files = request.files.getlist('codeFiles')
        for file in files:
            file.save(os.path.join(UPLOAD_FOLDER, file.filename))
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/analyze', methods=['POST'])
def analyze_code():
    try:
        # 1. 读取所有代码文件
        code_content = []
        for filename in os.listdir(UPLOAD_FOLDER):
            with open(os.path.join(UPLOAD_FOLDER, filename), 'r') as f:
                code_content.append({
                    "filename": filename,
                    "content": f.read()
                })

        # 2. 调用 DeepSeek API 分析
        vulnerabilities = []
        for code in code_content:
            response = requests.post(
                "https://api.deepseek.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {DEEPSEEK_API_KEY}"},
                json={
                    "model": "deepseek-chat",
                    "messages": [{
                        "role": "user",
                        "content": f"分析以下代码的安全问题，按 JSON 格式返回漏洞列表：\n文件名：{code['filename']}\n代码：{code['content']}"
                    }]
                }
            )
            # 假设返回格式为 { "vulnerabilities": [...] }
            if response.status_code == 200:
                vulnerabilities.extend(response.json().get("vulnerabilities", []))
            else:
                print(f"API 调用失败: {response.text}")

        # 3. 生成 PDF 报告
        env = Environment(loader=FileSystemLoader('templates'))
        template = env.get_template('report.html')
        html = template.render(vulnerabilities=vulnerabilities)
        
        report_path = os.path.join(UPLOAD_FOLDER, 'report.pdf')
        pdfkit.from_string(html, report_path, options={'encoding': 'UTF-8'})

        return jsonify({"reportPath": "report.pdf"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/report.pdf')
def download_report():
    return send_file(os.path.join(UPLOAD_FOLDER, 'report.pdf'), as_attachment=True)

if __name__ == '__main__':
    app.run(port=5000)