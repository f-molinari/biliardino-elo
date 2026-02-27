/**
 * VS Code-style fuzzy match: each query char must appear in order in the target.
 * Returns matched indices or null if no match.
 */
export function fuzzyMatch(query: string, target: string): number[] | null {
  const indices: number[] = [];
  let ti = 0;

  for (let qi = 0; qi < query.length; qi++) {
    const qc = query[qi];
    let found = false;
    while (ti < target.length) {
      if (target[ti] === qc) {
        indices.push(ti);
        ti++;
        found = true;
        break;
      }
      ti++;
    }
    if (!found) return null;
  }

  return indices;
}

/** Wrap matched character positions in a highlight span (gold + bold). */
export function highlightChars(name: string, indices: number[]): string {
  const set = new Set(indices);
  let out = '';
  for (let i = 0; i < name.length; i++) {
    const ch = name[i].replace(/&/g, '&amp;').replace(/</g, '&lt;');
    if (set.has(i)) {
      out += `<span style="color:#FFD700;font-weight:700">${ch}</span>`;
    } else {
      out += ch;
    }
  }
  return out;
}
