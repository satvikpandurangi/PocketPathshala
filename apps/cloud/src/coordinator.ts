import { SKILLS } from '@pp/shared';
export function coordinatorPage(rows: Record<string, unknown>[]) {
  const escape = (value: unknown) =>
    String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]!,
    );
  const schools = [...new Set(rows.map((row) => String(row.schoolId)))];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pocket Pathshala · Coordinator simulator</title><style>
  @font-face{font-family:DM;src:url('/fonts/dm-sans-latin-400-normal.woff2')}@font-face{font-family:Archivo;src:url('/fonts/archivo-black-latin-400-normal.woff2')}
  *{box-sizing:border-box}body{margin:0;background:#f6f0e4;color:#1c1c1c;font:15px DM,system-ui,sans-serif}header{height:90px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #ddd5c5;padding:20px 5vw;color:#1e2b6e}.brand{font:19px Archivo,sans-serif;letter-spacing:-.5px;display:flex;gap:12px;align-items:center}svg{width:35px;height:35px}.pill{font-size:12px;padding:9px 15px;background:#e7e5dc;border-radius:24px}main{max-width:1260px;margin:auto;padding:52px 5vw}h1{font:38px Archivo,sans-serif;letter-spacing:-1.3px;line-height:1.2;color:#1e2b6e;margin:15px 0}h2{color:#1e2b6e;font-size:21px;margin:0 0 10px}p{color:#6a665b;line-height:1.8;max-width:75ch}.intro{border-bottom:1px solid #ddd5c5;padding-bottom:25px;margin-bottom:35px}.notice{font-size:12px;color:#7d6243}.table-wrap{overflow:auto;border:1px solid #dbd5c7;border-radius:13px;background:#fcfaf6;margin:25px 0}table{border-collapse:collapse;width:100%;min-width:740px}th,td{padding:23px 18px;text-align:left;border-bottom:1px solid #e8e1d3;font-size:13px}th{background:#eeeadf;color:#676459;font-weight:400;font-size:12px}td:first-child{font-weight:700;color:#1e2b6e;min-width:170px}tr:last-child td{border-bottom:0}.score{display:block;padding:13px 16px;border-radius:7px;font-size:17px;color:#37623c;background:#e5eddf}.score.gap{color:#935a2d;background:#f3e2cb}.score small{display:block;font-size:10px;margin-top:6px}.empty{color:#8b8475;font-size:12px}a{color:#1e2b6e;text-decoration:none;display:inline-flex;align-items:center;min-height:56px}a:focus-visible{outline:3px solid #e07b2e;outline-offset:4px}.foot{border-top:1px solid #ddd5c5;padding-top:20px;margin-top:40px;display:flex;justify-content:space-between;font-size:11px;color:#7b7568}.legend{font-size:12px}.empty-state{padding:30px;color:#625f56} @media(max-width:600px){header{height:80px}.brand{font-size:15px}main{padding-top:30px}h1{font-size:29px}.pill{font-size:10px;padding:8px 10px}.foot{display:block;line-height:2}}
  </style></head><body><header><span class="brand"><svg viewBox="0 0 24 24" fill="#f6e8c9" stroke="#1e2b6e" stroke-width="1.6"><path d="M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/></svg>Pocket Pathshala</span><span class="pill">Local cloud simulator</span></header><main><section class="intro"><span class="notice">Coordinator space · Synthetic demo data</span><h1>A clearer view of learning.</h1><p>See which skills need another small step. These summaries use answers received by this local simulator; they are not pilot results or a measure of mastery.</p></section><h2>Skills across classrooms</h2><p>${schools.length} demo classroom${schools.length === 1 ? '' : 's'} received. Cells show correct answers out of submitted attempts.</p><div class="table-wrap">${
    schools.length
      ? `<table><thead><tr><th scope="col">Classroom</th>${SKILLS.map((skill) => `<th scope="col">${escape(skill.name)}</th>`).join('')}</tr></thead><tbody>${schools
          .map(
            (school) =>
              `<tr><td scope="row">${escape(school)}</td>${SKILLS.map(
                (skill) => {
                  const row = rows.find(
                    (r) =>
                      String(r.schoolId) === school && r.skill === skill.id,
                  );
                  return row
                    ? `<td><span class="score ${Number(row.correct) / Number(row.n) < 0.7 ? 'gap' : ''}">${escape(row.correct)} / ${escape(row.n)}<small>correct / submitted</small></span></td>`
                    : '<td><span class="empty">No answers yet</span></td>';
                },
              ).join('')}</tr>`,
          )
          .join('')}</tbody></table>`
      : '<div class="empty-state">No progress has arrived yet. Open the teacher’s Data & sync screen and choose “Flush to cloud”.</div>'
  }</div><p class="legend">Warm cells indicate fewer than 70% correct on received attempts. Counts include synthetic seed practice. This is a support signal, not a learner ranking.</p><a href="http://localhost:8080/teacher">← Return to teacher space</a><div class="foot"><span>Learning belongs everywhere.</span><span>Simulated receiver · AWS not deployed</span></div></main></body></html>`;
}
