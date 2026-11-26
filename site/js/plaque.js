/* Scales the engraved plaque text with the trophy image.
   The text sits in the image's own pixel space (864 x 1152) and a
   matrix3d (in winners.css) bends it onto the plaque's real angle.
   This script only sets one number: rendered width / 864. */
(function () {
  var NATIVE_WIDTH = 864;
  function fit(stage) {
    stage.style.setProperty('--plaque-scale', String(stage.clientWidth / NATIVE_WIDTH));
    stage.classList.add('plaque-ready');
  }
  function init() {
    var stages = document.querySelectorAll('.trophy-stage');
    Array.prototype.forEach.call(stages, function (stage) {
      fit(stage);
      if ('ResizeObserver' in window) {
        new ResizeObserver(function () { fit(stage); }).observe(stage);
      } else {
        window.addEventListener('resize', function () { fit(stage); });
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
