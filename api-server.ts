import express from 'express';
import cors from 'cors';
import { ComplianceWorkflow } from './src/mastra/workflows/compliance-workflow';

const app = express();
const PORT = process.env.API_PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Analyze endpoint
app.post('/api/analyze', async (req, res) => {
  const { recordId } = req.body;
  
  if (!recordId) {
    return res.status(400).json({ error: 'Record ID is required' });
  }
  
  try {
    const workflow = new ComplianceWorkflow();
    const result = await workflow.execute(recordId);
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Analysis failed' 
    });
  }
});

// Stream endpoint with Server-Sent Events
app.get('/api/analyze/stream', (req, res) => {
  const recordId = req.query.recordId as string;
  
  if (!recordId) {
    return res.status(400).json({ error: 'Record ID is required' });
  }
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Run workflow with progress streaming
  (async () => {
    try {
      const workflow = new ComplianceWorkflow();
      const progressGen = workflow.executeWithProgress(recordId);
      
      for await (const progress of progressGen) {
        sendEvent(progress);
      }
    } catch (error) {
      sendEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Analysis failed'
      });
    } finally {
      res.end();
    }
  })();
});

// Stream detailed endpoint (with thinking process)
app.get('/api/analyze/stream-detailed', (req, res) => {
  const recordId = req.query.recordId as string;
  
  if (!recordId) {
    return res.status(400).json({ error: 'Record ID is required' });
  }
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Send initial detailed message
  sendEvent({
    type: 'log',
    payload: {
      id: 'init',
      timestamp: new Date().toISOString(),
      level: 'info',
      step: 'INIT',
      message: `🚀 レコード ${recordId} の詳細審査を開始します`,
      details: {
        モード: '詳細ログモード',
        AI: 'Claude 3.5 Sonnet',
        タイムスタンプ: new Date().toISOString()
      }
    }
  });
  
  // Run workflow with progress streaming (enhanced for detailed mode)
  (async () => {
    try {
      const workflow = new ComplianceWorkflow();
      const progressGen = workflow.executeWithProgress(recordId);
      
      for await (const progress of progressGen) {
        if (progress.type === 'log') {
          // Enhanced for detailed mode - show as thinking process
          const isAnalysisStep = ['AI_CAPITAL', 'AI_ESTABLISHMENT', 'AI_TRANSACTION', 'AI_DEBT', 'AI_RISK'].includes(progress.step);
          
          sendEvent({
            type: 'log',
            payload: {
              id: progress.step || 'progress',
              timestamp: progress.timestamp,
              level: isAnalysisStep ? 'thinking' : (progress.level || 'info'),
              step: progress.step,
              message: isAnalysisStep ? `💭 ${progress.message}` : progress.message,
              details: progress.details
            }
          });
        } else {
          sendEvent(progress);
        }
      }
    } catch (error) {
      sendEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Analysis failed'
      });
    } finally {
      res.end();
    }
  })();
});

app.listen(PORT, () => {
  console.log(`Mastra API Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});