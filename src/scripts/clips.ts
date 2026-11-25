/**
 * Videos im Vollbild-Fenster abspielen (Progressive Enhancement):
 * Ein Tipp auf die Vorschaukachel öffnet ein <dialog> mit dem Player und startet das Video.
 * Die Videodatei wird erst dann geladen; beim Schließen wird sie angehalten und freigegeben.
 * Ohne JavaScript verlinkt die Kachel direkt auf die MP4-Datei (Player des Browsers).
 */
export function initClips(doc: Document = document) {
  const dialog = doc.querySelector<HTMLDialogElement>('[data-clip-dialog]');
  const links = [...doc.querySelectorAll<HTMLAnchorElement>('[data-clip-item]')];
  if (!dialog || links.length === 0 || typeof dialog.showModal !== 'function') return;

  const video = dialog.querySelector<HTMLVideoElement>('[data-clip-video]')!;
  const title = dialog.querySelector<HTMLElement>('[data-clip-title]')!;
  const close = dialog.querySelector<HTMLButtonElement>('[data-close]')!;
  let opener: HTMLElement | null = null;

  function open(link: HTMLAnchorElement) {
    opener = link;
    const name = link.dataset.title ?? '';
    title.textContent = name;
    video.setAttribute('aria-label', name);
    video.poster = link.dataset.poster ?? '';
    video.src = link.href;
    doc.documentElement.classList.add('has-lightbox');
    dialog!.showModal();
    close.focus();
    // Das Antippen der Kachel zählt als Nutzeraktion, daher darf das Video mit Ton starten.
    void video.play().catch(() => undefined);
  }

  for (const link of links) {
    link.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(link);
    });
  }

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load(); // laufenden Abruf abbrechen
    doc.documentElement.classList.remove('has-lightbox');
    opener?.focus();
  });
  // Klick auf den dunklen Hintergrund (nicht auf das Video oder die Knöpfe) schließt
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
