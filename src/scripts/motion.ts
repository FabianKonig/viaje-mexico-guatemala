/**
 * Bewegtfotos in der Galerie (Progressive Enhancement): Die stumme Schleife liegt über dem Standbild
 * und läuft nur, solange das Foto im Bild ist. Wer „Bewegung reduzieren“ eingestellt hat, sieht nur das
 * Standbild. Ohne JavaScript bleibt das Video durchsichtig (nichts wird geladen) und das Standbild steht.
 * Sichtbar wird es über data-playing; `hidden` ginge nicht, weil ein verstecktes Element nie „im Bild“ ist.
 */
export function initMotion(doc: Document = document, win: Window = window) {
  const videos = [...doc.querySelectorAll<HTMLVideoElement>('video[data-motion]')];
  if (videos.length === 0 || typeof win.IntersectionObserver !== 'function') return;
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');

  const stop = (v: HTMLVideoElement) => {
    v.pause();
    delete v.dataset.playing;
  };
  const start = (v: HTMLVideoElement) => {
    if (reduce.matches) return;
    v.muted = true;
    v.play().then(
      () => {
        v.dataset.playing = '';
      },
      () => stop(v), // z. B. Stromsparmodus: Standbild bleibt
    );
  };

  const observer = new win.IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement;
        if (e.isIntersecting) start(v);
        else stop(v);
      }
    },
    { threshold: 0.5 },
  );
  for (const v of videos) observer.observe(v);
  reduce.addEventListener('change', () => {
    if (reduce.matches) for (const v of videos) stop(v);
  });
}
