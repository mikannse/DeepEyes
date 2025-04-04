// CodeAnalyzer.tsx
import { useState } from 'react';
import { Button, LinearProgress, Alert } from '@mui/material';

interface Vulnerability {
  filename: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  line: number;
  description: string;
  suggestion: string;
}

export default function CodeAnalyzer() {
  const [analysisResult, setAnalysisResult] = useState<Vulnerability[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const triggerAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError('');
    
    try {
      const response = await fetch('http://localhost:5000/analyze', {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '分析失败');
      }

      const { issue_count } = await response.json();
      if (issue_count === 0) {
        setAnalysisResult([]);
        return;
      }

      // 获取报告数据
      const reportResponse = await fetch('http://localhost:5000/report.pdf');
      const reportBlob = await reportResponse.blob();
      const reportUrl = URL.createObjectURL(reportBlob);
      
      // 此处可添加解析PDF或显示预览的逻辑
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="analyzer-section">
      <Button
        variant="contained"
        color="secondary"
        onClick={triggerAnalysis}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? '分析中...' : '开始安全分析'}
      </Button>

      {isAnalyzing && <LinearProgress className="mt-2" />}

      {analysisError && (
        <Alert severity="error" className="mt-2">
          {analysisError}
        </Alert>
      )}

      {analysisResult.length > 0 && (
        <div className="analysis-results mt-4">
          <h3>发现 {analysisResult.length} 个安全问题</h3>
          <div className="vulnerability-list">
            {analysisResult.map((vuln, index) => (
              <div key={index} className={`vuln-item severity-${vuln.severity}`}>
                <div className="vuln-header">
                  <span className="filename">{vuln.filename}:{vuln.line}</span>
                  <span className="severity-badge">{vuln.severity.toUpperCase()}</span>
                </div>
                <h4>{vuln.type}</h4>
                <p>{vuln.description}</p>
                <div className="suggestion">
                  <strong>修复建议:</strong> {vuln.suggestion}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}