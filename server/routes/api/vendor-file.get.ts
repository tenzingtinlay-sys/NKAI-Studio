import { defineEventHandler, readBody, setHeader } from 'h3';
import { createReadStream, statSync, existsSync } from 'fs';
import { join, normalize } from 'path';

const ROOT = normalize(join(process.cwd(), 'vendor'));

export default defineEventHandler(async (event) => {
  const node = event.node!;
  const url = new URL(node.req.url || '', `http://${node.req.headers.host}`);
  const p = url.searchParams.get('path');
  if (!p) return { error: 'Missing path' };
  // Prevent path traversal
  const safePath = normalize(join(ROOT, p));
  if (!safePath.startsWith(ROOT)) {
    return { error: 'Invalid path' };
  }
  if (!existsSync(safePath)) {
    node.res!.statusCode = 404;
    return { error: 'Not found' };
  }
  const stat = statSync(safePath);
  const stream = createReadStream(safePath);
  // Set content-type by extension
  const ext = safePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string,string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', mp4: 'video/mp4' };
  const ct = map[ext] || 'application/octet-stream';
  node.res!.setHeader('Content-Type', ct);
  node.res!.setHeader('Content-Length', String(stat.size));
  // Pipe stream
  return stream as any;
});