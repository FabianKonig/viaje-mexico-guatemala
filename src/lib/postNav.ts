/** Nachbarn eines Beitrags für die Knöpfe „Vorheriger/Nächster Beitrag“. */
export interface NavTarget {
  slug: string;
}

export interface Neighbours<T extends NavTarget> {
  /** Der zeitlich vorherige (ältere) Beitrag, falls es einen gibt. */
  prev?: T;
  /** Der zeitlich nächste (neuere) Beitrag, falls es einen gibt. */
  next?: T;
}

/**
 * `posts` muss neueste zuerst sortiert sein (wie `loadPosts` sie liefert). Der neueste Beitrag hat
 * dann nur `prev`, der älteste nur `next`.
 */
export function neighbours<T extends NavTarget>(posts: T[], slug: string): Neighbours<T> {
  const i = posts.findIndex((p) => p.slug === slug);
  if (i < 0) return {};
  return { prev: posts[i + 1], next: posts[i - 1] };
}
