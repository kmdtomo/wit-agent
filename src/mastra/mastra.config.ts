import { Mastra } from '@mastra/core';
import Anthropic from '@anthropic-ai/sdk';

// Anthropic クライアントの設定
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Mastra設定（シンプルな設定）
export const mastra = new Mastra({});