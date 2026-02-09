import express from 'express';
import { ZodError } from 'zod';
import { parseConversationRequest, runConversationTurn } from '../services/conversation/conversationService';

export const conversationRoutes = express.Router();

conversationRoutes.post('/', async (req, res) => {
  try {
    const requestId = req.header('x-request-id') || `req-${Date.now()}`;
    const request = parseConversationRequest({
      ...req.body,
      requestId,
    });
    const responses = await runConversationTurn(request);

    res.status(201).json({
      status: 'success',
      responses,
      sessionId: request.sessionId,
      requestId,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request payload',
        details: error.issues,
      });
    }

    const message = error instanceof Error ? error.message : 'Failed to generate responses. Please try again.';
    return res.status(500).json({
      status: 'error',
      message,
    });
  }
});
