import { discoveryNotFoundResponse, discoveryPreflightResponse } from '../../../lib/mcp/oauth-discovery';

export async function GET(request: Request): Promise<Response> {
  return discoveryNotFoundResponse(request.headers.get('origin'));
}

export async function OPTIONS(request: Request): Promise<Response> {
  return discoveryPreflightResponse(request.headers.get('origin'));
}
