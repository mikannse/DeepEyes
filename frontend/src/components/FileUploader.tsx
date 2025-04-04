// FileUploader.tsx
import { useState } from 'react';
import { Button, CircularProgress, Chip, Alert } from '@mui/material';

export default function FileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [serverFiles, setServerFiles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files).filter(file => {
      const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
      return ['.py', '.js', '.java', '.c', '.cpp'].includes(ext);
    });

    setFiles(selectedFiles);
  };

  // 提交上传
  const handleUpload = async () => {
    setUploadStatus('uploading');
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('codeFiles', file));

      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上传失败');
      }

      const { saved_files } = await response.json();
      setServerFiles(saved_files);
      setUploadStatus('success');
    } catch (err) {
      setUploadStatus('error');
      setErrorMsg(err instanceof Error ? err.message : '未知错误');
    }
  };

  return (
    <div className="upload-section">
      <input
        type="file"
        multiple
        hidden
        id="code-upload"
        onChange={handleFileSelect}
        accept=".py,.js,.java,.c,.cpp"
      />
      <label htmlFor="code-upload">
        <Button variant="contained" component="span">
          选择代码文件
        </Button>
      </label>

      {files.length > 0 && (
        <div className="file-list">
          {files.map(file => (
            <Chip
              key={file.name}
              label={file.name}
              onDelete={() => setFiles(files.filter(f => f !== file))}
            />
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={uploadStatus === 'uploading'}
        >
          {uploadStatus === 'uploading' ? <CircularProgress size={24} /> : '上传文件'}
        </Button>
      )}

      {uploadStatus === 'error' && (
        <Alert severity="error" className="mt-2">
          {errorMsg}
        </Alert>
      )}

      {serverFiles.length > 0 && (
        <div className="mt-4">
          <h4>已上传文件:</h4>
          <ul>
            {serverFiles.map(file => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}