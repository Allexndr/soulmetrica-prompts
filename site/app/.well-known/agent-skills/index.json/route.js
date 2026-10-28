import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/site-seo';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

function skillEntry(name, description, relPath) {
  const file = path.join(process.cwd(), 'public', '.well-known', 'agent-skills', relPath);
  const buf = fs.readFileSync(file);
  const digest = 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
  return {
    name: name,
    type: 'skill-md',
    description: description,
    url: siteUrl('/.well-known/agent-skills/' + relPath),
    digest: digest
  };
}

export function GET() {
  const body = {
    $schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
    skills: [
      skillEntry(
        'order-reading',
        'Guide an agent to help a user order a SoulMetrica numerology reading',
        'order-reading/SKILL.md'
      ),
      skillEntry(
        'cite-products',
        'Cite accurate SoulMetrica product and legal facts from canonical pages',
        'cite-products/SKILL.md'
      )
    ]
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=3600' }
  });
}
