import { useState } from 'react';
import { Dashboard } from '@uppy/react';
import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import './App.css';

function App() {
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const uppy = new Uppy({
    restrictions: {
      allowedFileTypes: ['.py', '.js', '.java', '.c', '.cpp', '.go', '.php']
    }
  }).use(XHRUpload, {
    endpoint: 'http://localhost:5000/upload',
    fieldName: 'codeFiles',
  }).on('upload', () => {
    setUploadProgress(0);
  }).on('upload-progress', (file, progress) => {
    if (progress.percentage !== undefined) {
      setUploadProgress(Math.round(progress.percentage));
    }
  }).on('complete', (result) => {
    console.log('上传完成结果:', result);  // 添加日志
    if (result.successful && result.successful.length > 0) {
      setUploadProgress(null);
      setUploadComplete(true);
      handleAnalyze();  // 自动触发分析
    } else {
      alert("文件上传失败");
    }
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      uppy.getFiles().forEach(file => {
        formData.append('codeFiles', file.data);
      });
  
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('分析请求失败');
      }
  
      const { reportPath } = await response.json();
      console.log('报告路径:', reportPath);  // 添加日志
      setReportUrl(`http://localhost:5000/${reportPath}`);
    } catch (error) {
      alert("分析失败，请检查后端服务");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container">
      <h1>代码安全分析器</h1>
      {uploadProgress !== null && (
        <div>上传进度: {uploadProgress}%</div>
      )}
      <Dashboard uppy={uppy} />
      {uploadComplete && (
        <button 
          onClick={handleAnalyze} 
          disabled={isAnalyzing}
          className="analyze-button"
        >
          {isAnalyzing ? '分析中...' : '开始分析'}
        </button>
      )}
      {reportUrl && (
  <a href={reportUrl} download="安全报告.pdf" className="download-link">
    ↓ 下载 PDF 报告
  </a>
)}
    </div>
  );
}

export default App;