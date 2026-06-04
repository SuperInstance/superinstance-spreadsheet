// SuperInstance Spreadsheet — Canvas Visualizations
// Pure JS + Canvas, zero dependencies

(function() {
  'use strict';

  const COLORS = {
    avoid: '#f85149', choose: '#3fb950', neutral: '#484f58',
    species: ['#58a6ff', '#f0883e', '#3fb950', '#bc8cff', '#f85149',
              '#39d353', '#d2a8ff', '#79c0ff', '#ffa657', '#ff7b72'],
    grid: '#21262d', text: '#8b949e', highlight: '#58a6ff'
  };

  // === FITNESS HEATMAP ===
  class FitnessHeatmap {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }
    render(agents, envs, outcomes) {
      const W = this.canvas.width, H = this.canvas.height;
      this.ctx.clearRect(0, 0, W, H);
      if (!outcomes || !outcomes.length) return;
      const nE = outcomes.length, nA = outcomes[0].length;
      const cellW = Math.max(2, Math.min(30, W / nA));
      const cellH = Math.max(4, Math.min(20, H / nE));
      const labelW = 80;
      this.ctx.font = '10px monospace';

      for (let e = 0; e < nE; e++) {
        this.ctx.fillStyle = COLORS.text;
        this.ctx.fillText(envs[e] ? envs[e].name : `E${e}`, 2, e * cellH + cellH - 2);
        for (let a = 0; a < nA; a++) {
          const v = outcomes[e][a];
          const r = v < 0.4 ? 255 : Math.round(255 * (1 - v));
          const g = v > 0.5 ? 200 : Math.round(200 * v);
          this.ctx.fillStyle = `rgb(${r},${g},60)`;
          this.ctx.fillRect(labelW + a * cellW, e * cellH, cellW - 1, cellH - 1);
        }
      }
      // Legend
      const grad = this.ctx.createLinearGradient(W - 100, 0, W - 10, 0);
      grad.addColorStop(0, '#f85149');
      grad.addColorStop(0.5, '#e3b341');
      grad.addColorStop(1, '#3fb950');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(W - 100, 5, 90, 12);
      this.ctx.fillStyle = COLORS.text;
      this.ctx.fillText('0.0', W - 100, 30);
      this.ctx.fillText('1.0', W - 25, 30);
    }
  }

  // === ENTROPY CHART ===
  class EntropyChart {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.data = [];
    }
    addPoint(gen, entropy, species) {
      this.data.push({ gen, entropy, species });
      this.render();
    }
    setData(history) {
      this.data = history;
      this.render();
    }
    render() {
      const W = this.canvas.width, H = this.canvas.height;
      this.ctx.clearRect(0, 0, W, H);
      if (!this.data.length) return;

      const pad = 40;
      const maxEnt = Math.max(3, ...this.data.map(d => d.entropy));
      const maxGen = this.data[this.data.length - 1].gen || 1;

      // Grid
      this.ctx.strokeStyle = COLORS.grid;
      this.ctx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const y = pad + (H - 2 * pad) * i / 5;
        this.ctx.beginPath(); this.ctx.moveTo(pad, y); this.ctx.lineTo(W - pad, y); this.ctx.stroke();
        this.ctx.fillStyle = COLORS.text; this.ctx.font = '10px monospace';
        this.ctx.fillText((maxEnt * (1 - i/5)).toFixed(1), 2, y + 4);
      }

      // Entropy line
      this.ctx.strokeStyle = '#58a6ff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.data.forEach((d, i) => {
        const x = pad + (W - 2*pad) * d.gen / maxGen;
        const y = pad + (H - 2*pad) * (1 - d.entropy / maxEnt);
        i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
      });
      this.ctx.stroke();

      // Species line (secondary)
      this.ctx.strokeStyle = '#3fb950';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      const maxSp = Math.max(10, ...this.data.map(d => d.species || 0));
      this.data.forEach((d, i) => {
        const x = pad + (W - 2*pad) * d.gen / maxGen;
        const y = pad + (H - 2*pad) * (1 - (d.species || 0) / maxSp);
        i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y);
      });
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      // Labels
      this.ctx.fillStyle = '#58a6ff'; this.ctx.fillText('— Entropy', W - 140, 20);
      this.ctx.fillStyle = '#3fb950'; this.ctx.fillText('--- Species', W - 140, 34);
    }
  }

  // === SPECIES PIE ===
  class SpeciesPie {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }
    render(agents) {
      const W = this.canvas.width, H = this.canvas.height;
      this.ctx.clearRect(0, 0, W, H);
      if (!agents || !agents.length) return;

      const counts = {};
      agents.forEach(a => {
        const key = a.w ? a.w.toString() : a.toString();
        counts[key] = (counts[key] || 0) + 1;
      });

      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      const total = agents.length;
      const cx = W / 2, cy = H / 2, r = Math.min(cx, cy) - 20;

      let angle = -Math.PI / 2;
      sorted.forEach(([strat, count], i) => {
        const slice = 2 * Math.PI * count / total;
        this.ctx.fillStyle = COLORS.species[i % COLORS.species.length];
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.arc(cx, cy, r, angle, angle + slice);
        this.ctx.fill();

        // Label
        const mid = angle + slice / 2;
        const lx = cx + (r * 0.65) * Math.cos(mid);
        const ly = cy + (r * 0.65) * Math.sin(mid);
        if (count / total > 0.05) {
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '10px monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(`${(count/total*100).toFixed(0)}%`, lx, ly);
        }
        angle += slice;
      });

      // Legend
      this.ctx.font = '9px monospace';
      this.ctx.textAlign = 'left';
      sorted.slice(0, 6).forEach(([strat, count], i) => {
        const y = H - 15 - (sorted.length - 1 - i) * 12;
        if (y < 10) return;
        this.ctx.fillStyle = COLORS.species[i % COLORS.species.length];
        this.ctx.fillRect(5, y - 8, 8, 8);
        this.ctx.fillStyle = COLORS.text;
        this.ctx.fillText(`${strat} (${count})`, 18, y);
      });
    }
  }

  // === PARETO SCATTER ===
  class ParetoScatter {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }
    render(agents, outcomes, envIdx1, envIdx2) {
      const W = this.canvas.width, H = this.canvas.height;
      this.ctx.clearRect(0, 0, W, H);
      if (!outcomes) return;

      const pad = 40;
      const nA = outcomes[0] ? outcomes[0].length : 0;

      // Find Pareto front
      const points = [];
      for (let a = 0; a < nA; a++) {
        points.push({
          idx: a,
          x: outcomes[envIdx1][a],
          y: outcomes[envIdx2][a],
        });
      }

      // Determine Pareto-optimal
      const pareto = new Set();
      points.forEach(p => {
        const dominated = points.some(q => q.x >= p.x && q.y >= p.y && (q.x > p.x || q.y > p.y));
        if (!dominated) pareto.add(p.idx);
      });

      // Draw axes
      this.ctx.strokeStyle = COLORS.grid;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(pad, pad); this.ctx.lineTo(pad, H - pad); this.ctx.lineTo(W - pad, H - pad);
      this.ctx.stroke();

      this.ctx.fillStyle = COLORS.text;
      this.ctx.font = '10px monospace';
      this.ctx.fillText(`Env ${envIdx1}`, W/2, H - 5);
      this.ctx.save();
      this.ctx.translate(12, H/2);
      this.ctx.rotate(-Math.PI/2);
      this.ctx.fillText(`Env ${envIdx2}`, 0, 0);
      this.ctx.restore();

      // Draw points
      points.forEach(p => {
        const px = pad + (W - 2*pad) * p.x;
        const py = H - pad - (H - 2*pad) * p.y;
        const isPareto = pareto.has(p.idx);
        this.ctx.fillStyle = isPareto ? '#e3b341' : '#484f58';
        this.ctx.beginPath();
        this.ctx.arc(px, py, isPareto ? 5 : 2, 0, 2 * Math.PI);
        this.ctx.fill();
        if (isPareto) {
          this.ctx.strokeStyle = '#e3b341';
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      });

      // Pareto count
      this.ctx.fillStyle = '#e3b341';
      this.ctx.font = '11px monospace';
      this.ctx.fillText(`Pareto: ${pareto.size}/${nA}`, W - 120, 20);
    }
  }

  // === SPECIES DENDROGRAM ===
  class SpeciesDendrogram {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
    }
    render(agents) {
      const W = this.canvas.width, H = this.canvas.height;
      this.ctx.clearRect(0, 0, W, H);
      if (!agents || !agents.length) return;

      // Cluster by Hamming distance
      const strats = agents.map(a => a.w ? Array.from(a.w) : a);
      const unique = [...new Map(strats.map(s => [JSON.stringify(s), s])).values()];

      // Simple dendrogram: sort by strategy similarity
      unique.sort((a, b) => {
        const sa = a.reduce((s, v) => s + v, 0);
        const sb = b.reduce((s, v) => s + v, 0);
        return sa - sb;
      });

      const counts = {};
      strats.forEach(s => { const k = JSON.stringify(s); counts[k] = (counts[k]||0)+1; });

      const pad = 10;
      const barH = Math.max(8, Math.min(20, (H - 2*pad) / unique.length));

      unique.forEach((strat, i) => {
        const key = JSON.stringify(strat);
        const count = counts[key] || 0;
        const pct = count / agents.length;
        const y = pad + i * barH;

        // Color by position in ternary space
        const sum = strat.reduce((s, v) => s + v, 0);
        const colorIdx = Math.abs(sum) % COLORS.species.length;
        this.ctx.fillStyle = COLORS.species[colorIdx];
        this.ctx.fillRect(pad, y, pct * (W - 2*pad), barH - 2);

        this.ctx.fillStyle = COLORS.text;
        this.ctx.font = '9px monospace';
        this.ctx.fillText(`[${strat}] ${count} (${(pct*100).toFixed(0)}%)`, pad + pct * (W - 2*pad) + 5, y + barH - 5);
      });
    }
  }

  // Export for use in index.html
  window.SIVis = { FitnessHeatmap, EntropyChart, SpeciesPie, ParetoScatter, SpeciesDendrogram };
})();
