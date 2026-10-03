import { handleRegisterVerify } from '../../../../server/webauthnHandler';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const result = await handleRegisterVerify(body, req);
    return res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('Registration verify error:', err);
    return res.status(500).json({ error: err?.message || 'Internal Server Error' });
  }
}
