/**
 * „Mehr anzeigen“ für Raster mit Fotos oder Videos (Progressive Enhancement).
 * Die Kürzung selbst macht das Stylesheet (.media-grid, siehe global.css); das Skript zeigt den
 * Knopf nur, wenn mehr Einträge da sind als `--limit`, und schaltet `data-open` am Raster.
 * Ohne JavaScript ist nichts gekürzt (die CSS-Kürzung gilt nur bei `scripting: enabled`).
 */
export function initMore(doc: Document = document) {
  for (const grid of doc.querySelectorAll<HTMLElement>('[data-more-grid]')) {
    if (grid.dataset.moreReady) continue; // nie doppelt anmelden
    const section = grid.closest<HTMLElement>('section');
    const btn = section?.querySelector<HTMLButtonElement>('[data-more-btn]');
    const label = btn?.querySelector<HTMLElement>('[data-more-label]');
    if (!section || !btn || !label) continue;
    grid.dataset.moreReady = 'true';

    // Nur anzeigen, wenn etwas verborgen wäre (die Grenze steht in --limit, je nach Breite).
    const update = () => {
      const limit = Number(getComputedStyle(grid).getPropertyValue('--limit')) || Infinity;
      btn.hidden = grid.children.length <= limit;
    };

    btn.addEventListener('click', () => {
      const open = !grid.hasAttribute('data-open');
      grid.toggleAttribute('data-open', open);
      btn.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Weniger anzeigen' : 'Mehr anzeigen';
      // Beim Zuklappen den Abschnitt wieder ins Bild holen, falls sein Anfang oben herausgerutscht ist.
      if (!open && section.getBoundingClientRect().top < 0) section.scrollIntoView();
    });

    update();
    let frame = 0;
    window.addEventListener('resize', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
  }
}
