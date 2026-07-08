import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { RequestScheduler } from '../scheduler/RequestScheduler';
import { getLogger } from '../logger';
import { ChatMessage } from '../types';

export function createOpenAIRouter(
  requestScheduler: RequestScheduler,
): Router {
  const router = Router();
  const log = getLogger();

  router.get('/models', async (_req: Request, res: Response) => {
    try {
      const response = await fetch('https://api.puter.com/puterai/chat/models/details', {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        res.json({ object: 'list', data: [] });
        return;
      }

      const data = await response.json() as { models?: Array<{ id: string; name?: string; provider?: string }> };
      const models = (data?.models || []).map(m => ({
        id: m.id,
        object: 'model',
        created: Math.floor(Date.now() / 1000),
        owned_by: m.provider || 'puter',
      }));

      res.json({ object: 'list', data: models });
    } catch {
      res.json({ object: 'list', data: [] });
    }
  });

  router.post('/chat/completions', async (req: Request, res: Response) => {
    try {
      const { model, messages, stream, max_tokens, temperature } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
          error: { message: 'messages is required and must be a non-empty array', type: 'invalid_request_error' },
        });
        return;
      }

      const modelId = model || 'gpt-4o-mini';
      const prompt = messages.map((m: ChatMessage) => `${m.role}: ${m.content}`).join('\n');

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        const completionId = `chatcmpl-${uuidv4().replace(/-/g, '')}`;
        const created = Math.floor(Date.now() / 1000);

        const result = await requestScheduler.submitRequest({
          model: modelId,
          prompt,
          messages,
          maxTokens: max_tokens,
          temperature,
        });

        const content = result.success ? (result.response || '') : '';

        const words = content.split(/(\s+)/);
        for (let i = 0; i < words.length; i++) {
          const chunk = {
            id: completionId,
            object: 'chat.completion.chunk',
            created,
            model: modelId,
            choices: [{
              index: 0,
              delta: { content: words[i] || '' },
              finish_reason: null,
            }],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        const done = {
          id: completionId,
          object: 'chat.completion.chunk',
          created,
          model: modelId,
          choices: [{
            index: 0,
            delta: {},
            finish_reason: 'stop',
          }],
        };
        res.write(`data: ${JSON.stringify(done)}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      const result = await requestScheduler.submitRequest({
        model: modelId,
        prompt,
        messages,
        maxTokens: max_tokens,
        temperature,
      });

      const completionId = `chatcmpl-${uuidv4().replace(/-/g, '')}`;
      const created = Math.floor(Date.now() / 1000);

      if (!result.success) {
        res.status(502).json({
          id: completionId,
          object: 'chat.completion',
          created,
          model: modelId,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: '' },
            finish_reason: 'error',
          }],
          error: {
            message: result.error || 'Request failed',
            type: 'server_error',
          },
          usage: {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        });
        return;
      }

      res.json({
        id: completionId,
        object: 'chat.completion',
        created,
        model: modelId,
        choices: [{
          index: 0,
          message: { role: 'assistant', content: result.response || '' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('OpenAI', 'Chat completion failed', { error: errorMsg });
      res.status(500).json({
        error: { message: errorMsg, type: 'server_error' },
      });
    }
  });

  return router;
}
