import { useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState<File[]>([]); // 存储用户选择的文件
  const [isUploaded, setIsUploaded] = useState(false); // 是否已上传文件
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 是否正在分析
  const [reportUrl, setReportUrl] = useState<string | null>(null); // 报告下载链接

  // 处理文件上传
// 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const filesArray = Array.from(selectedFiles);
      setFiles(filesArray);
      setIsUploaded(false); // 重置上传状态
    }
  };

  // 调用 /upload 接口上传文件
  const uploadFiles = async () => {
    if (files.length === 0) {
      alert("请先选择文件");
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('codeFiles', file);
    });

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('文件上传失败');
      }

      const result = await response.json();
      console.log('文件上传成功:', result);
      alert("文件上传成功！");
      setIsUploaded(true); // 仅在上传成功后点亮“开始分析”按钮
    } catch (error) {
      console.error('文件上传失败:', error);
      alert("文件上传失败，请重试");
      setIsUploaded(false); // 确保上传失败时不点亮按钮
    }
  };

  // 调用 /analyze 接口进行分析
  const startAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('分析请求失败');
      }

      const { report_path } = await response.json();
      console.log('报告路径:', report_path);
      setReportUrl(`http://localhost:5000${report_path}`); // 设置报告下载链接
    } catch (error) {
      console.error('分析失败:', error);
      alert("分析失败，请检查后端服务");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container">
      <h1>代码安全分析器</h1>

      {/* 文件上传 */}
      <div>
        <input
          type="file"
          multiple
          onChange={handleFileUpload}
          accept=".py,.js,.java,.c,.cpp,.go,.php"
        />
        <button onClick={uploadFiles} disabled={files.length === 0}>
          上传
        </button>
      </div>

      {/* 开始分析 */}
      <div>
        <button
          onClick={startAnalysis}
          disabled={!isUploaded || isAnalyzing} // 只有上传完成后才能点击
        >
          {isAnalyzing ? '分析中...' : '开始分析'}
        </button>
      </div>

      {/* 下载报告 */}
      {reportUrl && (
        <div>
          <a href={reportUrl} download="安全报告.pdf" className="download-link">
            ↓ 下载 PDF 报告
          </a>
        </div>
      )}
    </div>
  );
}

export default App;