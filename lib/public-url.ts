export function publicBusinessPath(slug: string): string {
  return `/business/${encodeURIComponent(slug)}`;
}

function normaliseOrigin(originOrHost?: string | null): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_ORIGIN;
  if (!originOrHost && configured) return configured.replace(/\/$/, '');
  if (!originOrHost) return 'https://app.openbook.ie';

  const raw = originOrHost.replace(/\/$/, '');
  const hasProtocol = /^https?:\/\//i.test(raw);
  const url = hasProtocol ? new URL(raw) : null;
  const host = url?.host ?? raw;

  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return `${url?.protocol ?? 'http:'}//${host}`;
  }

  const appHost = host.replace(/^dash\./, 'app.');
  return `https://${appHost}`;
}

export function publicBusinessUrl(
  slug: string,
  originOrHost?: string | null,
): string {
  return `${normaliseOrigin(originOrHost)}${publicBusinessPath(slug)}`;
}

export function publicBusinessDisplayUrl(
  slug: string,
  originOrHost?: string | null,
): string {
  const url = new URL(publicBusinessUrl(slug, originOrHost));
  return `${url.host}${url.pathname}`;
}
