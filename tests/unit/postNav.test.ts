import { describe, expect, it } from 'vitest';
import { neighbours } from '../../src/lib/postNav';

// neueste zuerst, wie loadPosts sie liefert
const posts = [{ slug: 'c' }, { slug: 'b' }, { slug: 'a' }];

describe('Nachbarn eines Beitrags', () => {
  it('mittlerer Beitrag: vorheriger = älterer, nächster = neuerer', () => {
    expect(neighbours(posts, 'b')).toEqual({ prev: { slug: 'a' }, next: { slug: 'c' } });
  });

  it('neuester Beitrag hat nur einen vorherigen', () => {
    const n = neighbours(posts, 'c');
    expect(n.prev).toEqual({ slug: 'b' });
    expect(n.next).toBeUndefined();
  });

  it('ältester Beitrag hat nur einen nächsten', () => {
    const n = neighbours(posts, 'a');
    expect(n.prev).toBeUndefined();
    expect(n.next).toEqual({ slug: 'b' });
  });

  it('einziger Beitrag und unbekannter Beitrag haben keine Nachbarn', () => {
    expect(neighbours([{ slug: 'x' }], 'x')).toEqual({});
    expect(neighbours(posts, 'gibt-es-nicht')).toEqual({});
  });
});
