from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import re
import difflib
import tempfile
import pdfkit
import json
import uuid
import logging
from jinja2 import Environment, FileSystemLoader
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import requests

# 初始化配置
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# 配置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 常量定义
ALLOWED_EXTENSIONS = {'.py', '.js', '.java', '.c', '.cpp', '.go', '.php'}
UPLOAD_BASE = os.path.join(os.getcwd(), 'uploads')
os.makedirs(UPLOAD_BASE, exist_ok=True)
SILICON_FLOW_API_KEY = os.getenv('SILICON_FLOW_API_KEY')
API_ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions"

# 每个请求生成独立目录
session_id = str(uuid.uuid4())
UPLOAD_FOLDER = os.path.join(UPLOAD_BASE, session_id)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# PDF 配置
PDF_OPTIONS = {
    'encoding': 'UTF-8',
    'margin-top': '10mm',
    'margin-right': '10mm',
    'margin-bottom': '10mm',
    'margin-left': '10mm',
}

def build_analysis_prompt(filename: str, code: str) -> dict:
    return {
        "model": "deepseek-ai/DeepSeek-R1",
        "messages": [
            {
                "role": "user",
                "content": f"""
请以专业安全工程师身份分析以下代码，输出中文报告：
1. 严格返回JSON格式：
{{
  "vulnerabilities": [
    {{
        "type": "漏洞类型",
        "severity": "high/medium/low",
        "vulnerable_line": "存在漏洞的完整代码行（单行）",
        "description": "风险描述",
        "suggestion": "修复建议",
        "fixed_code": "修复后的代码示例（支持多行代码块）"
    }}
  ]
}}

文件名：{filename}
代码：
{code}"""
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"}
    }
def find_code_lines(file_lines: list, vulnerable_line: str) -> int:
    """仅返回行号"""
    target = vulnerable_line.strip()
    threshold = 0.75
    
    for i, line in enumerate(file_lines, 1):
        line_content = line.strip()
        similarity = difflib.SequenceMatcher(None, line_content, target).ratio()
        
        if similarity >= threshold:
            return i
    
    return 0

@app.route('/upload', methods=['POST'])
def upload_files():
    try:
        logger.info("收到文件上传请求")
        
        if 'codeFiles' not in request.files:
            return jsonify({"error": "请选择要上传的文件"}), 400

        files = request.files.getlist('codeFiles')
        if not files or all(f.filename == '' for f in files):
            return jsonify({"error": "没有选择文件"}), 400

        saved_files = []
        for file in files:
            if not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                return jsonify({"error": f"不支持的文件类型: {file.filename}"}), 400

            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
            saved_files.append(file.filename)
            logger.info(f"文件保存成功: {file.filename}")

        return jsonify({"status": "success", "saved_files": saved_files})

    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/list_files', methods=['GET'])
def list_files():
    files = [
        f for f in os.listdir(UPLOAD_FOLDER)
        if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))
    ]
    return jsonify({"files": files})

@app.route('/analyze', methods=['POST'])
def analyze_code():
    try:
        logger.info("收到分析请求")
        
        uploaded_files = [f for f in os.listdir(UPLOAD_FOLDER) 
                         if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
        if not uploaded_files:
            return jsonify({"error": "请先上传文件"}), 400

        vulnerabilities = []
        file_lines = {}

        # 预加载文件内容
        for filename in uploaded_files:
            try:
                with open(os.path.join(UPLOAD_FOLDER, filename), 'r', encoding='utf-8') as f:
                    file_lines[filename] = f.readlines()
            except Exception as e:
                logger.error(f"文件读取失败: {filename}")
                file_lines[filename] = []

        # 分析每个文件
        for filename in uploaded_files:
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            logger.debug(f"正在处理文件: {file_path}")

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    code_content = f.read()
            except UnicodeDecodeError:
                logger.error(f"文件解码失败: {filename}")
                continue

            # 调用API
            try:
                response = requests.post(
                    API_ENDPOINT,
                    headers={"Authorization": f"Bearer {SILICON_FLOW_API_KEY}"},
                    json=build_analysis_prompt(filename, code_content),
                )
                response.raise_for_status()
                result = response.json()
                logger.debug(f"API原始响应: {json.dumps(result, ensure_ascii=False)}")
                content = result['choices'][0]['message'].get('content', '')

                if not content:
                    logger.error("API 返回的 content 字段为空")
                    continue

                # JSON解析保护
                try:
                    analysis_data = json.loads(content)
                    vulnerabilities_list = analysis_data.get('vulnerabilities', [])
                    
                    if not isinstance(vulnerabilities_list, list):
                        logger.error("API返回的漏洞列表格式错误")
                        vulnerabilities_list = []
                except json.JSONDecodeError as e:
                    logger.error(f"JSON解析失败: {str(e)}")
                    vulnerabilities_list = []

                for vuln in vulnerabilities_list:
                    vulnerable_line = vuln.get('vulnerable_line', '')
                    if not vulnerable_line:
                        continue
                    
                    line_number = find_code_lines(file_lines[filename], vulnerable_line)
                    
                    # 处理fixed_code类型
                    fixed_code = vuln.get('fixed_code', '修复建议待补充')
                    if isinstance(fixed_code, list):
                        fixed_code = '\n'.join(fixed_code)
                    elif not isinstance(fixed_code, str):
                        fixed_code = str(fixed_code)
                    
                    vuln['line_number'] = line_number
                    vuln['reported_line'] = vulnerable_line
                    vuln['fixed_code'] = fixed_code.strip()  # 确保是字符串后处理
                    
                    if line_number == 0:
                        logger.warning(f"未匹配到漏洞代码：{vulnerable_line}")

                vulnerabilities.extend([{**vuln, "filename": filename} for vuln in vulnerabilities_list])

            except Exception as e:
                logger.error(f"API调用或响应解析失败: {str(e)}")
                logger.error(f"原始响应内容: {content}") 
                continue

        # 生成PDF报告
        env = Environment(loader=FileSystemLoader('templates'))
        template = env.get_template('report.html')
        report_path = os.path.join(UPLOAD_FOLDER, 'security_report.pdf')
        pdfkit.from_string(template.render(vulnerabilities=vulnerabilities), report_path, options=PDF_OPTIONS)

        return jsonify({
            "status": "success",
            "report_path": "/report.pdf",
            "issue_count": len(vulnerabilities)
        })

    except Exception as e:
        logger.error(f"分析失败: {str(e)}", exc_info=True)
        return jsonify({"error": "分析服务暂不可用"}), 500

@app.route('/delete', methods=['POST'])
def delete_file():
    data = request.get_json()
    filename = data.get('filename')
    
    if not filename:
        return jsonify({"error": "文件名缺失"}), 400

    file_path = os.path.join(UPLOAD_FOLDER, filename)
    
    if not os.path.exists(file_path):
        return jsonify({"error": "文件不存在"}), 404

    try:
        os.remove(file_path)
        logger.info(f"文件已删除: {filename}")
        return jsonify({"status": "success"})
    except Exception as e:
        logger.error(f"删除失败: {str(e)}")
        return jsonify({"error": "删除失败"}), 500

@app.route('/report.pdf')
def download_report():
    try:
        report_path = os.path.join(UPLOAD_FOLDER, 'security_report.pdf')
        if not os.path.exists(report_path):
            logger.error(f"报告文件不存在: {report_path}")
            return jsonify({"error": "报告尚未生成"}), 404
            
        return send_file(
            report_path,
            as_attachment=True,
            download_name="security_audit_report.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        logger.error(f"报告下载失败: {str(e)}")
        return jsonify({"error": "报告生成失败"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)