// Holds the static fallback copy to the same hard constraints the model output
// must pass, across every combination the app can serve. Run: node scripts/check-copy.mjs
import { validate } from '../lib/generate.js';
import { fallbackCopy } from '../lib/copy.js';
import { QUESTIONS, deriveVariables } from '../public/quiz-data.js';

let failures = 0;
let checked = 0;

const roles = QUESTIONS[0].options;
for (let q1 = 0; q1 < roles.length; q1 += 1) {
  if (roles[q1].exit) continue;
  for (let q2 = 0; q2 < 4; q2 += 1) {
    for (let q3 = 0; q3 < 4; q3 += 1) {
      for (let q4 = 0; q4 < 4; q4 += 1) {
        const vars = deriveVariables([q1, q2, q3, q4]);
        if (!vars) { console.error(`derive failed: ${[q1, q2, q3, q4]}`); failures += 1; continue; }
        const reason = validate(fallbackCopy(vars));
        checked += 1;
        if (reason) {
          console.error(`FAIL ${vars.role_type}|${vars.altitude}|${vars.ai_level}: ${reason}`);
          failures += 1;
        }
      }
    }
  }
}

// The exit route must be refused server-side.
if (deriveVariables([9, 0, 0, 0]) !== null) {
  console.error('FAIL: exit option produced variables');
  failures += 1;
}

console.log(`${checked} combinations checked, ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
