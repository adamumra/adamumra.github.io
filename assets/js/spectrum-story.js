/* Illustrative curves only: no radar estimator or trained model runs here. */
(function () {
  'use strict';
  const W = 640, H = 260, left = 44, right = 622, top = 22, bottom = 216;
  const sx = x => left + (x + 20) / 40 * (right - left);
  const sy = y => bottom - y / 1.3 * (bottom - top);
  const gaussian = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2);
  const signal = x => gaussian(x, -6, 1.1) + .92 * gaussian(x, 6, 1.1) + .025;
  const candidates = [
    [-6.3, 6.2, 14], [-5.8, 5.7, -14], [-6.1, 6.1, 0], [-5.7, 6.4, 11]
  ];
  function line(fn, css = '', opacity = 1) {
    const points = Array.from({ length: 321 }, (_, i) => {
      const x = -20 + i / 8;
      return `${i ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(fn(x)).toFixed(2)}`;
    }).join(' ');
    return `<path class="plot-line ${css}" opacity="${opacity}" d="${points}"/>`;
  }
  function frame(title, paths, targets = []) {
    const ticks = [-20, -10, 0, 10, 20].map(x => `<line class="plot-grid" x1="${sx(x)}" y1="${top}" x2="${sx(x)}" y2="${bottom}"/><text text-anchor="middle" x="${sx(x)}" y="238">${x}°</text>`).join('');
    const marks = targets.map(x => `<line class="plot-target" x1="${sx(x)}" y1="${top}" x2="${sx(x)}" y2="${bottom}"/>`).join('');
    return `<title>${title}</title><text x="44" y="13">Relative score (illustrative)</text>${ticks}<line class="plot-grid" x1="${left}" y1="${bottom}" x2="${right}" y2="${bottom}"/>${marks}${paths}<text x="333" y="258" text-anchor="middle">Angle relative to scene center</text>`;
  }
  function aperture(separation) {
    const a = separation / 2;
    const broad = x => .65 * (gaussian(x, -a, 4) + gaussian(x, a, 4));
    const narrow = x => gaussian(x, -a, 1.35) + gaussian(x, a, 1.35);
    return frame(`Schematic broad and narrow peaks for two targets separated by ${separation} degrees`, line(broad, 'secondary') + line(narrow), [-a, a]);
  }
  function diffusion(step) {
    const t = step / 5;
    const noisy = x => .52 + .21 * Math.sin(x * 2.7) + .13 * Math.sin(x * 5.1 + 2) + .1 * Math.cos(x * 7.3);
    return frame(`Illustrative refinement, step ${step} of 5; not a model trajectory`, line(x => (1 - t) * noisy(x) + t * signal(x)), [-6, 6]);
  }
  function candidateCurve(index) {
    const p = candidates[index];
    return x => .025 + gaussian(x, p[0], .9) + .88 * gaussian(x, p[1], .9) + .42 * gaussian(x, p[2], .8);
  }
  function consensus(selected) {
    let paths = '';
    if (selected === 'all') {
      candidates.forEach((_, i) => { paths += line(candidateCurve(i), 'secondary', .25); });
      const vote = x => candidates.reduce((sum, peaks) => sum + peaks.reduce((s, p) => s + gaussian(x, p, .5), 0), 0) / 4;
      paths += line(vote);
    } else {
      paths += line(candidateCurve(Number(selected)));
    }
    return frame(selected === 'all' ? 'Schematic peak vote: recurring peaks near minus six and plus six degrees dominate isolated peaks' : `Illustrative candidate ${Number(selected) + 1}, with two recurring peaks and one competing peak`, paths, [-6, 6]);
  }
  // Used to generate the initial inline SVGs, which also work without JavaScript.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { aperture, diffusion, consensus, W, H };
  }
  if (typeof document === 'undefined') return;
  function setupRange(inputId, plotId, outputId, draw, text) {
    const input = document.getElementById(inputId);
    const svg = document.getElementById(plotId);
    const output = document.getElementById(outputId);
    if (!input || !svg || !output) return;
    const update = () => {
      const value = Number(input.value);
      svg.innerHTML = draw(value);
      output.textContent = text(value);
    };
    input.addEventListener('input', update);
    update();
    input.closest('.interactive-controls').hidden = false;
  }
  setupRange('target-separation', 'aperture-plot', 'separation-value', aperture, v => `${v}° apart`);
  setupRange('denoising-step', 'diffusion-plot', 'step-value', diffusion, v => `${v} / 5`);
  const buttons = document.querySelectorAll('[data-candidate]');
  const plot = document.getElementById('consensus-plot');
  const status = document.getElementById('consensus-status');
  if (plot && status && buttons.length) {
    buttons.forEach(button => button.addEventListener('click', () => {
      const selected = button.dataset.candidate;
      buttons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
      plot.innerHTML = consensus(selected);
      status.textContent = selected === 'all'
        ? 'Combined vote: recurring peak locations receive the most support. Dashed curves show the four candidates.'
        : `Candidate ${Number(selected) + 1}: two recurring peaks and a competing peak. Compare with the combined vote.`;
    }));
    document.getElementById('candidate-controls').hidden = false;
  }
}());
