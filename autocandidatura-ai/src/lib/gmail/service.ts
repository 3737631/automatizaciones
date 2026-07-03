interface TokenResponse {
  access_token: string;
  refresh_token: string;
}

export function getGmailAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = process.env.GMAIL_REDIRECT_URI!;
  const scope = encodeURIComponent('https://mail.google.com/');

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
}

export async function exchangeGmailCode(
  code: string
): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = process.env.GMAIL_REDIRECT_URI!;

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error al intercambiar código Gmail: ${body}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  };
}

async function refreshAccessToken(
  refreshToken: string
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error al refrescar token Gmail: ${body}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function sendGmailEmail(
  accessToken: string,
  refreshToken: string,
  to: string,
  subject: string,
  messageHtml: string,
  attachmentBase64?: string
): Promise<boolean> {
  const boundary = 'boundary_' + Date.now().toString(36);

  let rawMessage = `From: me\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\n`;

  if (attachmentBase64) {
    rawMessage += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
    rawMessage += `${messageHtml}\r\n\r\n`;
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: application/pdf; name="cv.pdf"\r\n`;
    rawMessage += `Content-Disposition: attachment; filename="cv.pdf"\r\n`;
    rawMessage += `Content-Transfer-Encoding: base64\r\n\r\n`;
    rawMessage += `${attachmentBase64}\r\n\r\n`;
    rawMessage += `--${boundary}--`;
  } else {
    rawMessage += `Content-Type: text/html; charset="UTF-8"\r\n\r\n${messageHtml}`;
  }

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const send = async (token: string) => {
    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      }
    );
    return response;
  };

  let response = await send(accessToken);

  // If 401, try refreshing the token
  if (response.status === 401) {
    const newAccessToken = await refreshAccessToken(refreshToken);
    response = await send(newAccessToken);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Error al enviar email por Gmail: ${body}`);
  }

  return true;
}

export async function sendMockEmail(
  to: string,
  subject: string,
  message: string
): Promise<boolean> {
  console.log('[MOCK EMAIL]', { to, subject, message: message.slice(0, 200) });
  return true;
}

interface SendEmailParams {
  to: string;
  subject: string;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  attachmentBase64?: string;
}

export async function sendEmail(
  params: SendEmailParams
): Promise<boolean> {
  const provider = process.env.EMAIL_PROVIDER || 'mock';

  switch (provider) {
    case 'gmail':
      if (!params.accessToken || !params.refreshToken) {
        throw new Error('Gmail requiere access_token y refresh_token');
      }
      return sendGmailEmail(
        params.accessToken,
        params.refreshToken,
        params.to,
        params.subject,
        params.message,
        params.attachmentBase64
      );

    case 'mock':
    default:
      return sendMockEmail(params.to, params.subject, params.message);
  }
}
