/** A published fixed image can remain usable after its manifest refresh fails.
 * Only the loss of decoded pixels warrants an image-unavailable fallback. */
export function skyFixedImageStatus(active:boolean,image:object|null,
  manifestError:boolean,refreshError:boolean,imageError:boolean){
  return {
    failed:active&&!image&&(manifestError||refreshError||imageError),
    refreshFailed:active&&Boolean(image)&&refreshError,
  };
}
