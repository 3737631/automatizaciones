import "@supabase/functions-js/edge-runtime.d.ts"
import { withSupabase } from "@supabase/server"

interface SendInput {
  to: string
  subject: string
  message: string
  gmail_access_token: string
  gmail_refresh_token: string
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

async function sendViaGmail(
  to: string,
  subject: string,
  message: string,
  accessToken: string,
): Promise<boolean> {
  const raw = btoa(
    `From: me\r\nTo: ${to}\r\nSubject: =?UTF-8?B?${btoa(subject)}?=\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${message}`,
  ).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  })

  return res.ok
}

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req) => {
    const input = await req.json() as SendInput

    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") || ""
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || ""

    let accessToken = input.gmail_access_token

    if (input.gmail_refresh_token && googleClientId && googleClientSecret) {
      const refreshed = await refreshAccessToken(input.gmail_refresh_token, googleClientId, googleClientSecret)
      if (refreshed) accessToken = refreshed
    }

    if (!accessToken) {
      return Response.json({ sent: false, error: "No Gmail access token available", mock: true })
    }

    const success = await sendViaGmail(input.to, input.subject, input.message, accessToken)

    return Response.json({
      sent: success,
      error: success ? null : "Failed to send email via Gmail API",
      access_token: accessToken !== input.gmail_access_token ? accessToken : undefined,
    })
  }),
}
