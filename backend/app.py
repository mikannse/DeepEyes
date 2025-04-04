from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
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
    """构建硅基流动 API 请求提示词"""
    return {
        "model": "Qwen/Qwen2.5-32B-Instruct",
        "messages": [
            {
                "role": "user",
                "content": f"""请以专业安全工程师身份分析以下代码，严格按JSON格式返回：
{{
  "vulnerabilities": [
    {{
      "type": "漏洞类型（如SQL注入）",
      "severity": "high/medium/low",
      "line": 行号,
      "description": "风险描述",
      "suggestion": "修复建议"
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

@app.route('/upload', methods=['POST'])
def upload_files():
    """文件上传端点"""
    try:
        logger.info("收到文件上传请求")
        
        if 'codeFiles' not in request.files:
            logger.warning("未接收到文件字段")
            return jsonify({"error": "请选择要上传的文件"}), 400

        files = request.files.getlist('codeFiles')
        if not files or all(file.filename == '' for file in files):
            logger.warning("空文件上传")
            return jsonify({"error": "没有选择文件"}), 400

        saved_files = []
        for file in files:
            if '.' not in file.filename or \
               not any(file.filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                logger.error(f"非法文件类型: {file.filename}")
                return jsonify({"error": f"不支持的文件类型: {file.filename}"}), 400

            file_path = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(file_path)
            saved_files.append(file.filename)
            logger.info(f"文件保存成功: {file.filename}")

        return jsonify({
            "status": "success",
            "saved_files": saved_files
        })

    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}", exc_info=True)
        return jsonify({"error": "服务器内部错误"}), 500

@app.route('/analyze', methods=['POST'])
def analyze_code():
    try:
        logger.info("收到分析请求")
        
        # 记录上传目录路径（验证临时目录是否正确）
        logger.debug(f"当前上传目录: {UPLOAD_FOLDER}")

        uploaded_files = [f for f in os.listdir(UPLOAD_FOLDER) 
                         if os.path.isfile(os.path.join(UPLOAD_FOLDER, f))]
        
        logger.debug(f"待分析的文件列表: {uploaded_files}")  # 新增
        
        if not uploaded_files:
            logger.warning("没有可分析的文件")
            return jsonify({"error": "请先上传文件"}), 400

        vulnerabilities = []
        for filename in uploaded_files:
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            logger.debug(f"正在处理文件: {file_path}")  # 新增
            
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    code_content = f.read()
                logger.debug(f"文件内容长度: {len(code_content)} 字节")  # 新增
            except UnicodeDecodeError:
                logger.error(f"文件解码失败: {filename}")
                continue

            # 调用硅基流动 API
            try:
                response = requests.post(
                    API_ENDPOINT,
                    headers={
                        "Authorization": f"Bearer {SILICON_FLOW_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json=build_analysis_prompt(filename, code_content),
                )
                response.raise_for_status()
                result = response.json()
                logger.debug(f"API状态码: {response.status_code}")  # 新增
                logger.debug(f"API原始响应: {json.dumps(result, ensure_ascii=False)}")

                content = result['choices'][0]['message']['content']
                analysis_data = json.loads(content)
                logger.debug(f"解析后的漏洞数据: {analysis_data}")  # 新增
                
                vulnerabilities.extend([
                    {**vuln, "filename": filename} 
                    for vuln in analysis_data.get('vulnerabilities', [])
                ])

            except (json.JSONDecodeError, KeyError) as e:
                logger.error(f"响应解析失败: {str(e)}")
                logger.debug(f"原始响应内容: {content}")
                continue
            except requests.exceptions.RequestException as e:
                logger.error(f"API请求失败: {str(e)}")
                continue

        # 生成报告
        env = Environment(loader=FileSystemLoader('templates'))
        template = env.get_template('report.html')
        
        report_path = os.path.join(UPLOAD_FOLDER, 'security_report.pdf')
        pdfkit.from_string(
            template.render(vulnerabilities=vulnerabilities),
            report_path,
            options=PDF_OPTIONS
        )
        
        return jsonify({
            "status": "success",
            "report_path": "/report.pdf",
            "issue_count": len(vulnerabilities)
        })

    except Exception as e:
        logger.error(f"分析过程失败: {str(e)}", exc_info=True)
        return jsonify({"error": "分析服务暂不可用"}), 500

@app.route('/report.pdf')
def download_report():
    try:
        report_path = os.path.join(UPLOAD_FOLDER, 'security_report.pdf')
        if not os.path.exists(report_path):
            logger.error(f"报告文件不存在: {report_path}")  # 新增详细路径
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