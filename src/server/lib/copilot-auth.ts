// import { connectDB } from "../db";

interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

const GITHUB_CLIENT_ID = "Iv1.b507a08c87ecfe98"; // Public GitHub Copilot client ID

export async function startDeviceCodeFlow(): Promise<DeviceCodeResponse> {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: "read:user",
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub device code request failed: ${res.status}`);
  }

  return res.json() as Promise<DeviceCodeResponse>;
}

export async function checkDeviceCode(
  deviceCode: string
): Promise<{ access_token?: string; error?: string }> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      device_code: deviceCode,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`GitHub token check failed: ${res.status}`);
  }

  return res.json() as Promise<{ access_token?: string; error?: string }>;
}
