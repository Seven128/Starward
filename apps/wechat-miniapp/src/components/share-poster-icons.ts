import type Taro from "@tarojs/taro";
import type { PosterIcon } from "./adopted-share-poster";

/** The frame releases pending native decodes when its existing poster owner retires it. */
export function loadPosterIcons(canvas: Taro.Canvas, path: (name: PosterIcon) => string) {
  const pending = new Set<() => void>();
  const load = (name: PosterIcon) => new Promise<CanvasImageSource>((resolve, reject) => {
    const image = canvas.createImage() as unknown as { src: string; onload: (() => void) | null; onerror: (() => void) | null };
    const detach = () => { image.onload = null; image.onerror = null; pending.delete(cancel); };
    const cancel = () => { detach(); reject(new Error("poster_image_retired")); };
    pending.add(cancel);
    image.onload = () => { detach(); resolve(image as unknown as CanvasImageSource); };
    image.onerror = () => { detach(); reject(new Error("poster_icon_unavailable")); };
    try { image.src = path(name); } catch (cause) { detach(); reject(cause); }
  });
  const names = ["favorite-star", "meteor", "place-pin"] as const;
  const promise = Promise.all(names.map(load)).then(images => Object.fromEntries(names.map((name, index) => [name, images[index]!])) as Record<PosterIcon, CanvasImageSource>);
  return { promise, cancel: () => { for (const cancel of [...pending]) cancel(); } };
}
