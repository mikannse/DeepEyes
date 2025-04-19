import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:5000/list_files');
      const data = await response.json();
      setFiles(data.files);
      setIsUploaded(data.files.length > 0);
    } catch (error) {
      console.error('获取文件列表失败:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setSelectedFiles(Array.from(selectedFiles));
      setIsUploaded(false);
    }
  };

  const uploadFiles = async () => {
    const filesToUpload = selectedFiles;
    if (filesToUpload.length === 0) {
      alert("请先选择文件");
      return;
    }

    try {
      const formData = new FormData();
      filesToUpload.forEach(file => formData.append('codeFiles', file));

      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('文件上传成功:', result);
        alert("文件上传成功！");
        setSelectedFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsUploaded(true);
        await fetchFiles();
      } else {
        throw new Error('文件上传失败');
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      alert("文件上传失败，请重试");
      setIsUploaded(false);
    }
  };

  const deleteFile = async (filename: string) => {
    try {
      await fetch('http://localhost:5000/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      await fetchFiles();
    } catch (error) {
      console.error('删除文件时发生错误:', error);
      alert("文件删除失败，请重试");
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
      });
      if (response.ok) {
        const result = await response.json();
        setReportUrl(`http://localhost:5000${result.report_path}`);
      } else {
        throw new Error('分析请求失败');
      }
    } catch (error) {
      console.error('分析失败:', error);
      alert("分析失败，请检查后端服务");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>代码安全分析器</h1>
      </header>

      <main className="content-container">
        {/* 文件上传区域 */}
        <section className="upload-section">
          <div className="file-input-wrapper">
            <input
              type="file"
              id="fileInput"
              multiple
              accept=".py,.js,.java,.c,.cpp,.go,.php"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden-file-input"
            />
            <label htmlFor="fileInput" className="upload-button">
              <span>选择文件</span>
              <svg className="upload-icon" viewBox="0 0 24 24">
                <path d="M19 13h-6v6H5v-6H1v-2h4V5h6V1h2v4h6v6z"/>
              </svg>
            </label>
          </div>

          <button
            onClick={uploadFiles}
            className={`primary-button ${selectedFiles.length === 0 && 'disabled'}`}
            disabled={selectedFiles.length === 0}
          >
            上传文件
          </button>
        </section>

        {/* 文件列表 */}
        <section className="file-list-section">
          <h2>已上传文件</h2>
          <ul className="file-list">
            {files.map(file => (
              <li key={file} className="file-item">
                <span className="file-name">{file}</span>
                <button
                  onClick={() => deleteFile(file)}
                  className="delete-button"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7h-10v12zM19 4h-3.5L15 5.5 17.5 8 20 5.5 17.5 4zm-6.17 3L14 11.17 15.17 12 12 15.17 8.83 12 10 11.17 12 13.17z"/>
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* 分析按钮 */}
        <section className="analysis-section">
          <button
            onClick={startAnalysis}
            className={`primary-button ${!isUploaded || isAnalyzing || files.length === 0 ? 'disabled' : ''}`}
            disabled={!isUploaded || isAnalyzing || files.length === 0}
          >
            {isAnalyzing ? (
              <div className="loading-spinner"></div>
            ) : (
              "开始分析"
            )}
          </button>
        </section>

        {/* 下载报告 */}
        {reportUrl && (
          <section className="download-section">
            <a
              href={reportUrl}
              download="安全报告.pdf"
              className="download-button"
            >
              <svg className="download-icon" viewBox="0 0 24 24">
                <path d="M19 13H5v-2h14v2zm0-6H5v2h14V5zm4 10v-8l-4-4H3v18h18v-6z"/>
              </svg>
              下载报告
            </a>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;