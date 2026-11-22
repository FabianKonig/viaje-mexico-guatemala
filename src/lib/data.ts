/** Einmal geladene Inhalte für alle Seiten eines Builds. */
import { contentDir, loadPlaces, loadPosts, type Place, type Post } from './content';

let cache: { places: Place[]; posts: Post[] } | undefined;

export function getContent() {
  if (!cache) {
    const dir = contentDir();
    const places = loadPlaces(dir);
    cache = { places, posts: loadPosts(dir, places) };
  }
  return cache;
}
