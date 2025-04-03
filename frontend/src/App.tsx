// frontend/src/App.tsx
import { useState } from 'react';
import { Dashboard } from '@uppy/react';
import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import './App.css';

function App() {
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const uppy = new Uppy({
    restrictions: {
      allowedFileTypes: ['.py', '.js', '.java', '.c', '.cpp']
    }
  }).use(XHRUpload, {
    endpoint: 'http://localhost:5000/upload',
    fieldName: 'codeFiles',
  }).on('complete', () => {
    setUploadComplete(true);
  });

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
      });
      const { reportPath } = await response.json();
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