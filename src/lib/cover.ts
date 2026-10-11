export type ImageCover = { image: string; alt: string };
export type ImaxtCoverData = { kind: 'word' | 'stat' | 'quote' | 'stack'; text: string; sub?: string };
export type Cover = ImageCover | ImaxtCoverData;

export const isImageCover = (c: Cover | undefined): c is ImageCover => !!c && 'image' in c;
export const isImaxtCover = (c: Cover | undefined): c is ImaxtCoverData => !!c && 'kind' in c;
