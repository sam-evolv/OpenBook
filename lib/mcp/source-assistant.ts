export function detectSourceAssistant(headers: Headers): string {
  const ua = (headers.get('user-agent') || '').toLowerCase();
  const origin = (headers.get('origin') || '').toLowerCase();
  if (ua.includes('chatgpt') || origin.includes('openai.com') || origin.includes('chatgpt.com')) return 'chatgpt';
  if (ua.includes('claude') || origin.includes('anthropic.com') || origin.includes('claude.ai')) return 'claude';
  if (ua.includes('gemini') || origin.includes('google.com')) return 'gemini';
  if (ua.includes('apple') || ua.includes('siri')) return 'siri';
  return 'other';
}
