/* A soft pointer spotlight over the muted, decorative matrix. */
(function () {
  'use strict';
  document.querySelectorAll('.research-graphic').forEach(function (graphic) {
    var cells = Array.from(graphic.querySelectorAll('rect')).map(function (cell) {
      return {
        element: cell,
        x: Number(cell.getAttribute('x')) + Number(cell.getAttribute('width')) / 2,
        y: Number(cell.getAttribute('y')) + Number(cell.getAttribute('height')) / 2,
        rest: Number(cell.getAttribute('opacity'))
      };
    });
    if (!cells.length) return;
    var frame = null;
    var position = null;

    function restore() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      position = null;
      cells.forEach(function (cell) {
        cell.element.style.removeProperty('opacity');
      });
    }

    function render() {
      frame = null;
      var transform = graphic.getScreenCTM();
      if (!position || !transform || !graphic.getClientRects().length) return;
      var point = graphic.createSVGPoint();
      point.x = position.x;
      point.y = position.y;
      point = point.matrixTransform(transform.inverse());
      cells.forEach(function (cell) {
        var distance = Math.hypot(cell.x - point.x, cell.y - point.y);
        // Full brightness in the center, smoothly fading across two cell widths.
        var edge = Math.max(0, Math.min(1, (distance - 7) / 27));
        var focus = 1 - edge * edge * (3 - 2 * edge);
        var dimmed = cell.rest * 0.32;
        cell.element.style.opacity = (dimmed + (0.98 - dimmed) * focus).toFixed(3);
      });
    }

    function follow(event) {
      if (event.pointerType === 'touch') {
        restore();
        return;
      }
      position = { x: event.clientX, y: event.clientY };
      if (frame === null) frame = window.requestAnimationFrame(render);
    }

    graphic.addEventListener('pointerenter', follow);
    graphic.addEventListener('pointermove', follow);
    graphic.addEventListener('pointerleave', restore);
    graphic.addEventListener('pointercancel', restore);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) restore();
    });
  });
}());
