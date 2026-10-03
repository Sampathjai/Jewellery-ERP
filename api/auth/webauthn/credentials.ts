import {
  handleListCredentials,
  handleRevokeCredential,
  handleRenameCredential,
} from '../../../server/webauthnHandler';

export default async function handler(req: any, res: any) {
  const method = req.method;

  try {
    if (method === 'GET') {
      const userId = (req.query?.userId || req.headers?.['x-user-id']) as string;
      const result = await handleListCredentials(userId);
      return res.status(result.status).json(result.body);
    }

    if (method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const credentialId = (req.query?.credentialId || body.credentialId) as string;
      const userId = (req.query?.userId || body.userId) as string;
      const result = await handleRevokeCredential(credentialId, userId);
      return res.status(result.status).json(result.body);
    }

    if (method === 'PATCH') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { credentialId, userId, name } = body;
      const result = await handleRenameCredential(credentialId, userId, name);
      return res.status(result.status).json(result.body);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('Credentials handler error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
