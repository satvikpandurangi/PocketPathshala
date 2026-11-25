import Fastify from 'fastify';
import compress from '@fastify/compress';
import { DatabaseSync } from 'node:sqlite';
import { IngestSchema } from '@pp/shared';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { coordinatorPage } from './coordinator';
export async function createCloud(path: string) {
  const app = Fastify({ bodyLimit: 4 * 1024 * 1024 }),
    db = new DatabaseSync(path);
  db.exec(
    'CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,schoolId TEXT,json TEXT)',
  );
  await app.register(compress, { global: true, encodings: ['gzip'] });
  app.setErrorHandler((_error, _req, reply) =>
    reply.code(400).send({ error: 'Invalid ingest envelope' }),
  );
  app.addHook('onClose', async () => {
    db.close();
  });
  app.post('/ingest', async (request) => {
    const body = IngestSchema.parse(request.body);
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const a of body.attempts) {
        const existing = db
          .prepare('SELECT schoolId,json FROM events WHERE id=?')
          .get(a.id);
        if (
          existing &&
          (existing.schoolId !== body.schoolId ||
            String(existing.json) !== JSON.stringify(a))
        )
          throw new Error('Conflicting immutable event');
        db.prepare('INSERT OR IGNORE INTO events VALUES (?,?,?)').run(
          a.id,
          body.schoolId,
          JSON.stringify(a),
        );
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
    return { acceptedIds: body.attempts.map((a) => a.id), simulated: true };
  });
  app.get('/api/coordinator', async () => ({
    simulated: true,
    gaps: db
      .prepare(
        "SELECT schoolId, json_extract(json,'$.skillId') skill, COUNT(*) attempts, SUM(CASE WHEN json_extract(json,'$.correct')=1 THEN 1 ELSE 0 END) correct FROM events GROUP BY schoolId,skill",
      )
      .all(),
  }));
  app.get<{ Params: { font: string } }>(
    '/fonts/:font',
    async (request, reply) => {
      const font = request.params.font;
      if (
        ![
          'dm-sans-latin-400-normal.woff2',
          'archivo-black-latin-400-normal.woff2',
        ].includes(font)
      )
        return reply.code(404).send({ error: 'Unknown font' });
      const file = fileURLToPath(
        new URL(`../../app/src/assets/fonts/${font}`, import.meta.url),
      );
      return reply.type('font/woff2').send(await readFile(file));
    },
  );
  app.get('/coordinator', async (_req, reply) => {
    const rows = db
      .prepare(
        "SELECT schoolId, json_extract(json,'$.skillId') skill, COUNT(*) n, SUM(CASE WHEN json_extract(json,'$.correct')=1 THEN 1 ELSE 0 END) correct FROM events GROUP BY schoolId,skill",
      )
      .all();
    return reply.type('text/html').send(coordinatorPage(rows));
  });
  return app;
}
