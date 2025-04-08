# DeepEyes - 代码安全分析工具

DeepEyes 是一个基于 AI 的代码安全分析工具，旨在帮助开发者快速识别代码中的潜在漏洞，并提供修复建议。通过上传代码文件，用户可以获得一份详细的 PDF 安全报告。

## 功能特性

- **多语言支持**：支持分析多种编程语言的代码文件（如 Python、JavaScript、Java、C/C++、Go、PHP 等）。
- **AI 驱动分析**：利用硅基流动 API 对代码进行深度分析，识别潜在的安全漏洞。
- **漏洞分类与建议**：每个漏洞都包含类型、严重性、位置描述以及修复建议。
- **PDF 报告生成**：分析完成后自动生成专业的 PDF 安全报告，便于分享和存档。
- **前后端分离架构**：前端使用 React 构建，后端基于 Flask 提供 RESTful API。

---

## 快速开始

### 前置依赖

1. **Python 环境**：
   - Python 3.8 或更高版本。
   - 依赖库安装：
     ```bash
     pip install -r requirements.txt
     ```

2. **Node.js 环境**：
   - Node.js 16 或更高版本。
   - 安装前端依赖：
     ```bash
     cd frontend
     npm install
     ```

3. **第三方服务**：
   - 配置硅基流动 API 密钥：
     在 `.env` 文件中设置 `SILICON_FLOW_API_KEY`。
   - 确保 `wkhtmltopdf` 已安装并配置在系统路径中（用于生成 PDF）。

---

### 启动项目

#### 后端启动

```bash
cd backend
python app.py
```

### 前端启动

```bash
cd fronted
npm start
```

