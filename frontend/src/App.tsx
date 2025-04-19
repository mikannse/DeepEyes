import { useState, useEffect } from 'react';
import './App.css';

function App() {
  // 文件列表（来自后端）
  const [files, setFiles] = useState<string[]>([]);
  // 用户选择但未上传的文件列表
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploaded, setIsUploaded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('http://localhost:5000/list_files');
      const data = await response.json();
      if (response.ok) {
        setFiles(data.files);
        setIsUploaded(data.files.length > 0);
      }
    } catch (error) {
      console.error('获取文件列表失败:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      setSelectedFiles(Array.from(selectedFiles));
      setIsUploaded(false); // 重置上传状态
    }
  };

  const uploadFiles = async () => {
    const filesToUpload = selectedFiles;
    if (filesToUpload.length === 0) {
      alert("请先选择文件");
      return;
    }

    const formData = new FormData();
    filesToUpload.forEach((file) => {
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

      // 重置输入框和 selectedFiles
      const fileInput = document.getElementById('fileInput') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
      setSelectedFiles([]);

      // 更新状态
      setIsUploaded(true);
      await fetchFiles();
    } catch (error) {
      console.error('文件上传失败:', error);
      alert("文件上传失败，请重试");
      setIsUploaded(false);
    }
  };

  const deleteFile = async (filename: string) => {
    try {
      const response = await fetch('http://localhost:5000/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      if (response.ok) {
        await fetchFiles();
      } else {
        console.error('文件删除失败');
        alert("文件删除失败，请重试");
      }
    } catch (error) {
      console.error('删除文件时发生错误:', error);
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);

    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('分析请求失败');
      }

      const result = await response.json();
      setReportUrl(`http://localhost:5000${result.report_path}`);
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
          id="fileInput"
          multiple
          accept=".py,.js,.java,.c,.cpp,.go,.php"
          onChange={handleFileUpload}
        />
        <button
          onClick={uploadFiles}
          // 按钮启用条件：选中的文件存在 或 已上传的文件存在
          disabled={selectedFiles.length === 0 && files.length === 0}
        >
          上传
        </button>
      </div>

      {/* 文件列表 */}
      <div>
        <h2>已上传文件列表</h2>
        <ul>
          {files.map((file, index) => (
            <li key={file}>
              {file}
              <button onClick={() => deleteFile(file)}>删除</button>
            </li>
          ))}
        </ul>
      </div>

      {/* 开始分析 */}
      <div>
        <button
          onClick={startAnalysis}
          disabled={!isUploaded || isAnalyzing || files.length === 0}
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