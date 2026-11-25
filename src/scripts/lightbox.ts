/**
 * Lightbox für die Fotogalerie (Progressive Enhancement):
 * <dialog> mit showModal, Zähler, Schließen, Vor/Zurück, Tastatur (Esc, ←, →), Wischen,
 * Fokus kehrt beim Schließen zum auslösenden Foto zurück. Große Bilder werden erst bei Bedarf geladen.
 * Auf Touchgeräten startet beim Öffnen automatisch der Vollbildmodus des Browsers (Adresszeile weg,
 * mehr Platz fürs Foto); ein Knopf beendet ihn wieder, und diese Wahl gilt für den Rest der Sitzung.
 */
/** Transparentes 1×1-GIF als Platzhalter, solange die Lightbox geschlossen ist. */
export const EMPTY_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function initLightbox(doc: Document = document) {
  const dialog = doc.querySelector<HTMLDialogElement>('[data-lightbox]');
  const links = [...doc.querySelectorAll<HTMLAnchorElement>('[data-lightbox-item]')];
  if (!dialog || links.length === 0 || typeof dialog.showModal !== 'function') return;

  const img = dialog.querySelector<HTMLImageElement>('[data-img]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-caption]')!;
  const info = dialog.querySelector<HTMLElement>('[data-info]')!;
  const count = dialog.querySelector<HTMLElement>('[data-count]')!;
  const prev = dialog.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-next]')!;
  const close = dialog.querySelector<HTMLButtonElement>('[data-close]')!;
  const stage = dialog.querySelector<HTMLElement>('[data-stage]')!;
  let index = 0;
  let opener: HTMLElement | null = null;

  // Vollbild: nur wo der Browser es kann (nicht iPhone) und nur auf Touchgeräten (am Computer wäre es störend)
  const fsButton = dialog.querySelector<HTMLButtonElement>('[data-fullscreen]')!;
  const FS_KEY = 'lightbox-fullscreen';
  const fsSupported =
    doc.fullscreenEnabled === true && typeof doc.documentElement.requestFullscreen === 'function';
  const fsTouch = () => doc.defaultView?.matchMedia('(pointer: coarse)').matches === true;
  /** Wahl des Lesers für diese Sitzung: 'off' nach Beenden per Knopf oder Wischgeste, 'on' nach erneutem Einschalten. */
  const fsPreference = () => {
    try {
      return sessionStorage.getItem(FS_KEY) ?? 'on';
    } catch {
      return 'on';
    }
  };
  const fsRemember = (value: 'on' | 'off') => {
    try {
      sessionStorage.setItem(FS_KEY, value);
    } catch {
      /* ohne Speicher gilt weiter der Standard */
    }
  };
  const fsActive = () => doc.fullscreenElement != null;
  /** Umschalter: gleichbleibender Name „Vollbild“, der Zustand steht in aria-pressed (und im Symbol). */
  function fsSync() {
    fsButton.setAttribute('aria-pressed', String(fsActive()));
  }
  function fsEnter() {
    if (!fsSupported || fsActive()) return;
    doc.documentElement.requestFullscreen().catch(() => {});
  }
  function fsExit() {
    if (fsActive()) doc.exitFullscreen().catch(() => {});
  }
  if (fsSupported) {
    fsButton.hidden = false;
    fsSync();
    fsButton.addEventListener('click', () => {
      if (fsActive()) {
        fsRemember('off');
        fsExit();
      } else {
        fsRemember('on');
        fsEnter();
      }
    });
    doc.addEventListener('fullscreenchange', () => {
      fsSync();
      // Beendet der Leser das Vollbild bei offener Großansicht (Wischgeste, Zurück), merken wir uns das
      if (dialog.open && !fsActive()) fsRemember('off');
    });
  }

  const preload = (i: number) => {
    const l = links[(i + links.length) % links.length];
    if (l) new Image().src = l.href;
  };

  /**
   * Kameraangaben in Stücke teilen (Kamera, Blende, Verschlusszeit, ISO, Brennweite), damit ein
   * Zeilenumbruch nur zwischen den Angaben fällt, nie mitten in einer (siehe Gallery.astro).
   * Der Mittelpunkt bleibt am Ende des vorherigen Stücks; der Text ändert sich dadurch nicht.
   */
  function setInfo(text: string) {
    const parts = text.split(' · ').filter(Boolean);
    info.replaceChildren(
      ...parts.flatMap((part, i) => {
        const span = doc.createElement('span');
        span.className = 'lightbox__info-part';
        const last = i === parts.length - 1;
        span.textContent = last ? part : `${part} ·`;
        return last ? [span] : [span, doc.createTextNode(' ')];
      }),
    );
  }

  function show(i: number) {
    index = (i + links.length) % links.length;
    const link = links[index];
    const thumb = link.querySelector('img');
    img.src = link.href;
    img.width = Number(link.dataset.width) || 0;
    img.height = Number(link.dataset.height) || 0;
    img.alt = thumb?.alt ?? '';
    const text = link.dataset.caption ?? '';
    caption.textContent = text;
    caption.hidden = text === '';
    caption.scrollTop = 0;
    const camera = link.dataset.info ?? '';
    setInfo(camera);
    info.hidden = camera === '';
    count.textContent = `${index + 1} / ${links.length}`;
    const single = links.length < 2;
    prev.hidden = single;
    next.hidden = single;
    fit();
    if (!single) {
      preload(index + 1);
      preload(index - 1);
    }
  }

  /** Platz für Kamera-Kasten (samt Abstand) und Bildunterschrift, damit das Foto in die Höhe passt (siehe Gallery.astro). */
  const photo = dialog.querySelector<HTMLElement>('.lightbox__photo')!;
  const infoRow = dialog.querySelector<HTMLElement>('[data-info-row]')!;
  const frame = dialog.querySelector<HTMLElement>('.lightbox__frame')!;
  function fit() {
    if (!dialog!.open) return;
    // Von der vollen Foto-Größe aus messen: Ein altes --reserve könnte das Foto (und damit den Kasten) schmal halten
    photo.style.removeProperty('--reserve');
    // Handy quer: Bildunterschrift steht neben dem Foto (Bühne als Zeile) und braucht keine Höhe
    const side = getComputedStyle(stage).flexDirection === 'row';
    for (let pass = 0; pass < 3; pass++) {
      const gap = caption.hidden || side ? 0 : caption.offsetHeight + 10;
      // die Zeile enthält Kasten und Abstand darüber (leer, wenn das Foto keine Kameraangaben hat)
      photo.style.setProperty('--reserve', `${infoRow.offsetHeight + gap}px`);
    }
    fadeCaption();
    // Pfeile (Vor/Zurück) auf halber Höhe des Fotos, nicht des Bildschirms
    const f = frame.getBoundingClientRect();
    const d = dialog!.getBoundingClientRect();
    dialog!.style.setProperty('--nav-top', `${f.top - d.top + f.height / 2}px`);
  }
  /** Weicher Verlauf oben/unten an der Bildunterschrift, solange dort noch Text verborgen ist (Hinweis: scrollbar). */
  function fadeCaption() {
    const more = caption.scrollHeight - caption.clientHeight > 1;
    const top = more && caption.scrollTop > 1;
    const bottom = more && caption.scrollTop + caption.clientHeight < caption.scrollHeight - 1;
    caption.style.setProperty('--fade-top', top ? '28px' : '0px');
    caption.style.setProperty('--fade-bottom', bottom ? '28px' : '0px');
  }
  caption.addEventListener('scroll', fadeCaption, { passive: true });
  window.addEventListener('resize', fit);
  // Solange das Foto lädt, hat es keine Breite; erst danach stimmt die Höhe des Kamera-Kastens
  img.addEventListener('load', fit);

  function open(i: number, from: HTMLElement) {
    opener = from;
    show(i);
    doc.documentElement.classList.add('has-lightbox');
    dialog!.showModal();
    // Muss im Klick selbst geschehen (Nutzergeste); der Browser verlangt sie
    if (fsSupported && fsTouch() && fsPreference() === 'on') fsEnter();
    fit();
    close.focus();
  }

  links.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(i, link);
    });
  });

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    doc.documentElement.classList.remove('has-lightbox');
    fsExit();
    img.src = EMPTY_IMAGE;
    opener?.focus();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      show(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      show(index + 1);
    }
  });
  // Klick auf den dunklen Hintergrund (nicht auf Bild oder Knöpfe) schließt
  let justSwiped = false;
  dialog.addEventListener('click', (e) => {
    if (justSwiped) {
      justSwiped = false;
      return;
    }
    if (e.target === dialog || e.target === stage) dialog.close();
  });

  // Wischen (Touch und Stift)
  let startX = 0;
  let startY = 0;
  let tracking = false;
  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    tracking = true;
    startX = e.clientX;
    startY = e.clientY;
  });
  stage.addEventListener('pointercancel', () => (tracking = false));
  stage.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && links.length > 1) {
      justSwiped = true;
      setTimeout(() => (justSwiped = false), 400);
      show(dx < 0 ? index + 1 : index - 1);
    }
  });
}
