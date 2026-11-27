// About page fight-night video: muted autoplay loop, tap for sound, pause/play.
(function () {
  var v = document.getElementById('bc-fight-video');
  if (!v) return;
  var snd = document.querySelector('[data-video-sound]');
  var pp = document.querySelector('[data-video-play]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  v.muted = true;
  if (reduce) { v.removeAttribute('autoplay'); v.pause(); }
  var ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9l6 6M22 9l-6 6"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';
  var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5l12 7-12 7z"/></svg>';
  function render() {
    if (snd) {
      snd.innerHTML = v.muted ? ICON_ON + '<span>Tap for sound</span>' : ICON_OFF + '<span>Mute</span>';
      snd.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
      snd.classList.toggle('is-sound', v.muted);
    }
    if (pp) {
      pp.innerHTML = v.paused ? ICON_PLAY + '<span>Play</span>' : ICON_PAUSE + '<span>Pause</span>';
    }
  }
  if (snd) snd.addEventListener('click', function () {
    if (v.muted) { v.muted = false; v.currentTime = 0; v.play(); }
    else { v.muted = true; }
    render();
  });
  if (pp) pp.addEventListener('click', function () {
    if (v.paused) v.play(); else v.pause();
    render();
  });
  v.addEventListener('play', render);
  v.addEventListener('pause', render);
  // Decorative channel knob (Winners page): clicks one notch each time the video loops.
  var knob = document.querySelector('[data-tv-knob]');
  if (knob && !reduce) {
    var ch = 0, last = 0;
    v.addEventListener('timeupdate', function () {
      if (v.currentTime + 1 < last) { ch = (ch + 1) % 12; knob.setAttribute('data-ch', String(ch)); }
      last = v.currentTime;
    });
  }
  render();
})();
