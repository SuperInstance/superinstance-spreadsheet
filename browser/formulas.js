// SuperInstance Formula Engine — browser/formulas.js
// Parses and evaluates spreadsheet formulas like =EVOLVE(B2:B50, 100)

(function () {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────────────

  /** Parse a column letter to 0-based index: A→0, B→1, … Z→25 */
  function colIndex(letter) {
    return letter.toUpperCase().charCodeAt(0) - 65;
  }

  /** Parse "B2:B50" → { startCol, startRow, endCol, endRow } (0-based) */
  function parseRange(str) {
    const m = str.trim().match(/^\$?([A-Z])\$?(\d+):\$?([A-Z])\$?(\d+)$/i);
    if (!m) return null;
    return {
      startCol: colIndex(m[1]),
      startRow: parseInt(m[2], 10) - 1,
      endCol: colIndex(m[3]),
      endRow: parseInt(m[4], 10) - 1,
    };
  }

  /** Parse "B:B" → { col } or "B" → { col } */
  function parseColRef(str) {
    str = str.trim().replace(/^\$|\$$/g, '');
    // "B:B"
    let m = str.match(/^([A-Z]):([A-Z])$/i);
    if (m) return { col: colIndex(m[1]) };
    // "B3" — single cell, return col + row
    m = str.match(/^([A-Z])(\d+)$/i);
    if (m) return { col: colIndex(m[1]), row: parseInt(m[2], 10) - 1 };
    // "B" bare letter
    if (/^[A-Z]$/i.test(str)) return { col: colIndex(str) };
    return null;
  }

  /** Resolve a range to actual agent indices from the grid.
   *  The grid layout is: col 0 = row-header, col 1 = Strategy, col 2..2+N-1 = env columns, col 2+N = Avg.
   *  So environment col index i maps to grid column (2 + i).
   *  Agent rows in the <tbody> map directly to agent index (row index).
   */
  function rangeToAgentIndices(range) {
    // We only support ranges in the strategy column (col 1) or env columns (col 2+).
    // If range covers env columns, we return { agentIndices, envIndices }.
    const envStart = range.startCol - 2;
    const envEnd = range.endCol - 2;
    const envs = [];
    for (let e = Math.max(0, envStart); e <= Math.min(envEnd, (window.envs ? window.envs.length - 1 : 100)); e++) {
      envs.push(e);
    }
    const agentStart = Math.max(0, range.startRow);
    const agentEnd = range.endRow;
    const agentCount = window.agents ? window.agents.length : 0;
    const agentIndices = [];
    for (let a = agentStart; a <= Math.min(agentEnd, agentCount - 1); a++) {
      agentIndices.push(a);
    }
    return { agentIndices, envIndices: envs };
  }

  /** Get fitness of agent a in environment e */
  function fitness(e, a) {
    if (!window.outcomes || !window.outcomes[e]) return 0;
    return window.outcomes[e][a] || 0;
  }

  /** Average fitness across all environments for agent a */
  function avgFitness(a) {
    if (!window.envs) return 0;
    let sum = 0;
    for (let e = 0; e < window.envs.length; e++) sum += fitness(e, a);
    return sum / window.envs.length;
  }

  /** Hamming distance between two ternary weight vectors */
  function hamming(w1, w2) {
    let d = 0;
    for (let i = 0; i < Math.max(w1.length, w2.length); i++) {
      if ((w1[i] || 0) !== (w2[i] || 0)) d++;
    }
    return d;
  }

  /** Pearson correlation between two arrays */
  function pearson(x, y) {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) {
      const a = x[i] - mx, b = y[i] - my;
      num += a * b;
      dx += a * a;
      dy += b * b;
    }
    const denom = Math.sqrt(dx * dy);
    return denom === 0 ? 0 : num / denom;
  }

  // ── Formula Parser ───────────────────────────────────────────────

  function parseFormula(str) {
    str = str.trim();
    if (!str.startsWith('=')) return null;
    str = str.slice(1);

    // Match FUNCTION(args)
    const fm = str.match(/^(\w+)\((.+)\)$/s);
    if (!fm) return null;
    const fn = fm[1].toUpperCase();
    const rawArgs = fm[2];

    // Split args on commas, respecting parentheses (none nested here, but safe)
    const args = [];
    let depth = 0, current = '';
    for (const ch of rawArgs) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) args.push(current.trim());

    return { fn, args };
  }

  // ── Formula Functions ────────────────────────────────────────────

  /**
   * EVOLVE(range, generations)
   * Run N generations of selection on agents in range.
   * Keep top 50%, mutate children.
   */
  function cmdEvolve(args) {
    const range = parseRange(args[0]);
    if (!range) return { error: 'Invalid range. Use like B2:B50' };
    const gens = parseInt(args[1], 10) || 10;
    const { agentIndices } = rangeToAgentIndices(range);
    if (agentIndices.length < 2) return { error: 'Need at least 2 agents in range' };

    // Extract the sub-population
    let pop = agentIndices.map(i => ({ agent: window.agents[i], idx: i }));

    for (let g = 0; g < gens; g++) {
      // Evaluate each agent's avg fitness
      const scored = pop.map(p => ({
        ...p,
        score: avgFitness(p.idx),
      }));
      scored.sort((a, b) => b.score - a.score);

      // Keep top 50%
      const keep = Math.max(1, Math.ceil(scored.length / 2));
      const survivors = scored.slice(0, keep);

      // Create children by mutation
      const children = survivors.map(s => {
        const child = s.agent.mutate();
        return { agent: child, idx: -1 }; // idx will be reassigned
      });

      pop = [...survivors.map(s => ({ agent: s.agent, idx: s.idx })), ...children];
    }

    // Write back into the agents array
    for (let i = 0; i < pop.length && i < agentIndices.length; i++) {
      window.agents[agentIndices[i]] = pop[i].agent;
    }

    window.generation += gens;
    window.computeOutcomes();
    window.render();

    return {
      toast: `Evolved ${gens} generations on ${pop.length} agents.`,
      type: 'evolve',
    };
  }

  /**
   * BEST(col) — find agent with highest fitness in that environment column.
   * Highlight it in the grid.
   */
  function cmdBest(args) {
    const ref = parseColRef(args[0]);
    if (!ref) return { error: 'Invalid column ref. Use like B or B:B' };
    const envIdx = ref.col - 2; // env columns start at grid col 2
    if (envIdx < 0 || envIdx >= (window.envs || []).length) {
      // Could be asking for best overall — if col is the Avg column
      // Try average fitness
      let bestIdx = 0, bestScore = -1;
      for (let a = 0; a < window.agents.length; a++) {
        const s = avgFitness(a);
        if (s > bestScore) { bestScore = s; bestIdx = a; }
      }
      highlightRows([bestIdx]);
      return {
        toast: `Best overall: Agent ${bestIdx + 1} (avg ${bestScore.toFixed(3)}) — strategy ${window.agents[bestIdx].toString()}`,
        type: 'best',
      };
    }

    let bestIdx = 0, bestScore = -1;
    for (let a = 0; a < window.agents.length; a++) {
      const s = fitness(envIdx, a);
      if (s > bestScore) { bestScore = s; bestIdx = a; }
    }
    highlightRows([bestIdx]);
    return {
      toast: `Best in ${window.envs[envIdx].name}: Agent ${bestIdx + 1} (${bestScore.toFixed(3)}) — strategy ${window.agents[bestIdx].toString()}`,
      type: 'best',
    };
  }

  /**
   * SPECIES(range) — cluster agents by Hamming distance on ternary weights.
   * Return species count + top species. Color-code agents in grid.
   */
  function cmdSpecies(args) {
    const range = parseRange(args[0]);
    const ref = !range ? parseColRef(args[0]) : null;

    let agentIndices;
    if (range) {
      ({ agentIndices } = rangeToAgentIndices(range));
    } else if (ref) {
      // All agents
      agentIndices = window.agents.map((_, i) => i);
    } else {
      return { error: 'Invalid range/ref.' };
    }

    // Simple single-link clustering with threshold 1 (identical = same species)
    const species = [];
    const assignment = new Map(); // agentIdx → speciesId

    for (const idx of agentIndices) {
      const w = window.agents[idx].w;
      let found = -1;
      for (const sp of species) {
        // Compare to representative of this species
        if (hamming(w, window.agents[sp[0]].w) <= 1) {
          found = sp[0];
          break;
        }
      }
      if (found >= 0) {
        const spId = species.findIndex(sp => sp[0] === found);
        species[spId].push(idx);
        assignment.set(idx, spId);
      } else {
        assignment.set(idx, species.length);
        species.push([idx]);
      }
    }

    // Color-code agents
    colorBySpecies(assignment, species.length);

    // Sort species by size descending
    const sorted = [...species].sort((a, b) => b.length - a.length);
    const topStrat = window.agents[sorted[0][0]].toString();
    const details = sorted.map((sp, i) => `Species ${i + 1}: ${sp.length} agents — ${window.agents[sp[0]].toString()}`).join('\n');

    return {
      toast: `${species.length} species found. Largest: ${sorted[0].length} agents with ${topStrat}`,
      detail: details,
      type: 'species',
    };
  }

  /**
   * EXHAUSTIVE(envCol) — generate ALL 81 ternary strategies (3^4),
   * evaluate against that environment, return ranked list.
   */
  function cmdExhaustive(args) {
    const ref = parseColRef(args[0]);
    if (!ref) return { error: 'Invalid column ref. Use like C or C:C' };
    const envIdx = ref.col - 2;
    if (envIdx < 0 || envIdx >= (window.envs || []).length) {
      return { error: 'Column does not map to an environment.' };
    }
    const env = window.envs[envIdx];

    // Generate all 3^4 = 81 ternary weight vectors
    const all = [];
    for (let i = 0; i < 81; i++) {
      const w = [
        Math.floor(i / 27) % 3 - 1,
        Math.floor(i / 9) % 3 - 1,
        Math.floor(i / 3) % 3 - 1,
        i % 3 - 1,
      ];
      const agent = new window.TernaryAgent(w);
      // Run 50 stochastic rounds like the main engine
      let wins = 0;
      for (let r = 0; r < 50; r++) wins += env.stochastic(agent);
      all.push({ w, score: wins / 50, agent });
    }
    all.sort((a, b) => b.score - a.score);

    return {
      type: 'exhaustive',
      envName: env.name,
      strategies: all,
    };
  }

  /**
   * ENTROPY(range) — compute strategy diversity in bits.
   */
  function cmdEntropy(args) {
    const range = parseRange(args[0]);
    const ref = !range ? parseColRef(args[0]) : null;
    let agentIndices;
    if (range) {
      ({ agentIndices } = rangeToAgentIndices(range));
    } else {
      agentIndices = window.agents.map((_, i) => i);
    }

    // Count unique strategies
    const counts = {};
    for (const idx of agentIndices) {
      const key = window.agents[idx].toString();
      counts[key] = (counts[key] || 0) + 1;
    }

    const total = agentIndices.length;
    let entropy = 0;
    for (const key in counts) {
      const p = counts[key] / total;
      if (p > 0) entropy -= p * Math.log2(p);
    }

    const unique = Object.keys(counts).length;
    const maxEntropy = Math.log2(total);

    return {
      toast: `Entropy: ${entropy.toFixed(3)} bits (${unique} unique / ${total} agents, max ${maxEntropy.toFixed(2)})`,
      type: 'entropy',
    };
  }

  /**
   * PARETO(range) — find Pareto-optimal agents across all environments.
   */
  function cmdPareto(args) {
    const range = parseRange(args[0]);
    const ref = !range ? parseColRef(args[0]) : null;
    let agentIndices;
    if (range) {
      ({ agentIndices } = rangeToAgentIndices(range));
    } else {
      agentIndices = window.agents.map((_, i) => i);
    }

    if (!window.envs || window.envs.length < 2) {
      return { error: 'Need at least 2 environments for Pareto analysis.' };
    }

    // Build fitness vectors
    const vectors = agentIndices.map(idx => {
      const fits = [];
      for (let e = 0; e < window.envs.length; e++) fits.push(fitness(e, idx));
      return { idx, fits };
    });

    // Find Pareto front: an agent is dominated if another is >= it on all envs and > on at least one
    const pareto = [];
    for (let i = 0; i < vectors.length; i++) {
      let dominated = false;
      for (let j = 0; j < vectors.length; j++) {
        if (i === j) continue;
        const vi = vectors[i].fits, vj = vectors[j].fits;
        let allGe = true, oneGt = false;
        for (let k = 0; k < vi.length; k++) {
          if (vj[k] < vi[k]) { allGe = false; break; }
          if (vj[k] > vi[k]) oneGt = true;
        }
        if (allGe && oneGt) { dominated = true; break; }
      }
      if (!dominated) pareto.push(vectors[i]);
    }

    // Highlight Pareto-optimal agents
    highlightRows(pareto.map(p => p.idx));

    const details = pareto.map(p => {
      const fits = p.fits.map((f, i) => `${window.envs[i].name}=${f.toFixed(3)}`).join(', ');
      return `Agent ${p.idx + 1}: ${window.agents[p.idx].toString()} → ${fits}`;
    }).join('\n');

    return {
      toast: `${pareto.length} Pareto-optimal agents found (out of ${vectors.length})`,
      detail: details,
      type: 'pareto',
    };
  }

  /**
   * CORRELATE(col1, col2) — Pearson correlation between two environment columns.
   */
  function cmdCorrelate(args) {
    const ref1 = parseColRef(args[0]);
    const ref2 = parseColRef(args[1]);
    if (!ref1 || !ref2) return { error: 'Need two column refs like =CORRELATE(C, D)' };

    const envIdx1 = ref1.col - 2;
    const envIdx2 = ref2.col - 2;
    if (envIdx1 < 0 || envIdx1 >= (window.envs || []).length ||
        envIdx2 < 0 || envIdx2 >= (window.envs || []).length) {
      return { error: 'Columns must map to environments.' };
    }

    const x = [], y = [];
    for (let a = 0; a < window.agents.length; a++) {
      x.push(fitness(envIdx1, a));
      y.push(fitness(envIdx2, a));
    }

    const r = pearson(x, y);
    const strength = Math.abs(r) > 0.7 ? 'strong' : Math.abs(r) > 0.4 ? 'moderate' : 'weak';
    const dir = r > 0 ? 'positive' : 'negative';

    return {
      toast: `r = ${r.toFixed(4)} (${strength} ${dir}) between ${window.envs[envIdx1].name} and ${window.envs[envIdx2].name}`,
      type: 'correlate',
    };
  }

  // ── Visual Helpers ───────────────────────────────────────────────

  const SPECIES_COLORS = [
    '#58a6ff', '#3fb950', '#d2a8ff', '#f0883e', '#ff7b72',
    '#79c0ff', '#56d364', '#e2c5ff', '#ffa657', '#ffa198',
    '#388bfd', '#2ea043', '#b180f7', '#d29922', '#da3633',
    '#a5d6ff', '#7ee787', '#cb9eff', '#f7c843', '#f8756e',
  ];

  function highlightRows(agentIndices) {
    // Clear previous highlights
    document.querySelectorAll('tr.highlighted-row').forEach(tr => {
      tr.style.outline = '';
      tr.classList.remove('highlighted-row');
    });
    // Highlight matching rows
    const rows = document.querySelectorAll('#grid-body tr');
    for (const idx of agentIndices) {
      if (rows[idx]) {
        rows[idx].style.outline = '2px solid #f0883e';
        rows[idx].classList.add('highlighted-row');
      }
    }
  }

  function colorBySpecies(assignment, numSpecies) {
    // Clear previous species colors
    document.querySelectorAll('.species-tag').forEach(el => el.remove());
    document.querySelectorAll('#grid-body tr').forEach(tr => {
      tr.style.borderLeft = '';
    });

    const rows = document.querySelectorAll('#grid-body tr');
    for (const [idx, spId] of assignment) {
      if (rows[idx]) {
        const color = SPECIES_COLORS[spId % SPECIES_COLORS.length];
        rows[idx].style.borderLeft = `4px solid ${color}`;
        // Add species tag to first cell
        const firstTd = rows[idx].querySelector('td');
        if (firstTd && !firstTd.querySelector('.species-tag')) {
          const tag = document.createElement('span');
          tag.className = 'species-tag';
          tag.style.cssText = `font-size:9px;background:${color};color:#0d1117;border-radius:3px;padding:1px 4px;margin-left:4px;`;
          tag.textContent = `S${spId + 1}`;
          firstTd.appendChild(tag);
        }
      }
    }
  }

  // ── Toast / Modal UI ─────────────────────────────────────────────

  function showToast(msg, duration) {
    duration = duration || 4000;
    const existing = document.getElementById('toast-container');
    if (!existing) {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:420px;';
      document.body.appendChild(c);
    }
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.style.cssText = 'background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 16px;color:#c9d1d9;font-size:12px;font-family:monospace;box-shadow:0 4px 12px rgba(0,0,0,0.4);opacity:0;transition:opacity 0.3s;';
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function showExhaustiveModal(envName, strategies) {
    // Remove existing modal
    const old = document.getElementById('exhaustive-modal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'exhaustive-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px 24px;max-width:640px;max-height:80vh;overflow:auto;color:#c9d1d9;font-family:monospace;font-size:12px;';

    const title = document.createElement('h2');
    title.style.cssText = 'color:#58a6ff;margin-bottom:12px;font-size:16px;';
    title.textContent = `All 81 Ternary Strategies — ${envName}`;
    modal.appendChild(title);

    const table = document.createElement('table');
    table.style.cssText = 'width:100%;border-collapse:collapse;';
    table.innerHTML = `<thead><tr style="color:#8b949e;border-bottom:1px solid #30363d;">
      <th style="text-align:left;padding:4px 8px;">#</th>
      <th style="text-align:left;padding:4px 8px;">Strategy</th>
      <th style="text-align:left;padding:4px 8px;">Best Action</th>
      <th style="text-align:right;padding:4px 8px;">Fitness</th>
      <th style="text-align:left;padding:4px 8px;">Bar</th>
    </tr></thead>`;

    const tbody = document.createElement('tbody');
    const maxScore = strategies[0] ? strategies[0].score : 1;

    strategies.forEach((s, i) => {
      const tr = document.createElement('tr');
      const bg = i < 3 ? '#0e4429' : i >= 78 ? '#3d1a1a' : 'transparent';
      tr.style.cssText = `background:${bg};`;

      const actionNames = ['A0', 'A1', 'A2', 'A3'];
      const bestAction = s.agent.bestAction();
      const barWidth = Math.round((s.score / (maxScore || 1)) * 100);
      const barColor = s.score > 0.6 ? '#238636' : s.score > 0.4 ? '#d29922' : '#da3633';

      tr.innerHTML = `
        <td style="padding:3px 8px;color:#8b949e;">${i + 1}</td>
        <td style="padding:3px 8px;color:#79c0ff;">${s.agent.toString()}</td>
        <td style="padding:3px 8px;">${actionNames[bestAction]}</td>
        <td style="padding:3px 8px;text-align:right;font-weight:bold;">${s.score.toFixed(3)}</td>
        <td style="padding:3px 8px;"><div style="background:${barColor};height:8px;width:${barWidth}%;border-radius:4px;min-width:2px;"></div></td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    modal.appendChild(table);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'btn';
    closeBtn.style.cssText = 'margin-top:12px;';
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  function showDetailModal(title, detail) {
    const old = document.getElementById('detail-modal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'detail-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#161b22;border:1px solid #30363d;border-radius:12px;padding:20px 24px;max-width:560px;max-height:70vh;overflow:auto;color:#c9d1d9;font-family:monospace;font-size:12px;';

    const h = document.createElement('h2');
    h.style.cssText = 'color:#58a6ff;margin-bottom:12px;font-size:14px;';
    h.textContent = title;
    modal.appendChild(h);

    const pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;line-height:1.6;';
    pre.textContent = detail;
    modal.appendChild(pre);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'btn';
    closeBtn.style.cssText = 'margin-top:12px;';
    closeBtn.onclick = () => overlay.remove();
    modal.appendChild(closeBtn);

    overlay.appendChild(modal);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  // ── Dispatcher ───────────────────────────────────────────────────

  const DISPATCH = {
    EVOLVE: cmdEvolve,
    BEST: cmdBest,
    SPECIES: cmdSpecies,
    EXHAUSTIVE: cmdExhaustive,
    ENTROPY: cmdEntropy,
    PARETO: cmdPareto,
    CORRELATE: cmdCorrelate,
  };

  function evaluateFormula(str) {
    const parsed = parseFormula(str);
    if (!parsed) return { error: 'Invalid formula. Start with = and use FUNCTION(args)' };

    const handler = DISPATCH[parsed.fn];
    if (!handler) return { error: `Unknown function: ${parsed.fn}. Available: ${Object.keys(DISPATCH).join(', ')}` };

    try {
      return handler(parsed.args);
    } catch (err) {
      return { error: `Error in ${parsed.fn}: ${err.message}` };
    }
  }

  function handleFxInput(e) {
    if (e.key !== 'Enter') return;
    const input = document.getElementById('fx-input');
    const val = input.value.trim();
    if (!val) return;

    const result = evaluateFormula(val);

    if (result.error) {
      showToast('❌ ' + result.error, 6000);
      window.setStatus(result.error);
      return;
    }

    if (result.type === 'exhaustive') {
      showExhaustiveModal(result.envName, result.strategies);
      window.setStatus(`Exhaustive search: 81 strategies ranked for ${result.envName}`);
    } else if (result.detail) {
      showDetailModal(result.toast, result.detail);
      window.setStatus(result.toast);
    } else {
      window.setStatus(result.toast || 'Done');
    }

    if (result.toast) {
      showToast(result.toast);
    }
  }

  // ── Wire Up ──────────────────────────────────────────────────────

  function init() {
    const fxInput = document.getElementById('fx-input');
    if (fxInput) {
      fxInput.addEventListener('keydown', handleFxInput);
    }
  }

  // Wait for DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.FormulaEngine = { parseFormula, evaluateFormula };
})();
