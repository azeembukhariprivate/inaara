# Cuts Inaara out of the character sheet: removes the plain background by filling in from the edges.
import numpy as np
from PIL import Image, ImageFilter
import sys

def cutout(img, thresh, sides=('top', 'left', 'right', 'bottom')):
    a = np.asarray(img.convert('RGB')).astype(np.int32)
    h, w, _ = a.shape
    border = np.concatenate([a[2], a[:, 2], a[:, -3]])
    # Hair can cover most of the edge: take the background colour from the light edge pixels only.
    light = border[border.sum(axis=1) > 600]
    bg = np.median(light if len(light) else border, axis=0)
    # Background-like: close to the background colour, and light (the sheet's backgrounds are pale).
    dist = np.sqrt(((a - bg) ** 2).sum(axis=2))
    like = (dist < thresh) & (a.sum(axis=2) > 560)
    reach = np.zeros((h, w), bool)
    if 'top' in sides: reach[0] = like[0]
    if 'left' in sides: reach[:, 0] |= like[:, 0]
    if 'right' in sides: reach[:, -1] |= like[:, -1]
    if 'bottom' in sides: reach[-1] |= like[-1]
    while True:
        grow = reach.copy()
        grow[1:] |= reach[:-1]; grow[:-1] |= reach[1:]; grow[:, 1:] |= reach[:, :-1]; grow[:, :-1] |= reach[:, 1:]
        grow &= like
        if (grow == reach).all(): break
        reach = grow
    alpha = Image.fromarray(np.where(reach, 0, 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = img.convert('RGBA'); out.putalpha(alpha)
    return out

def head(img, chin):
    # Keeps the head: a soft oval around the hair and face, ending just under the chin (no straight cut edges).
    w, h = img.size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w * 0.5, chin * 0.52
    rx, ry = w * 0.5, chin * 0.54
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    m = np.clip((1.0 - d) / 0.06 + 1.0, 0, 1)
    m[: int(cy)] = np.maximum(m[: int(cy)], np.clip((1.0 - np.abs(xx[: int(cy)] - cx) / rx) / 0.04, 0, 1))
    a = np.asarray(img).astype(np.float32)
    a[:, :, 3] *= m
    return Image.fromarray(a.astype(np.uint8))

sheet = Image.open(sys.argv[1]).convert('RGB')
# Each face tile: (box, how far down the chin is).
tiles = {'happy': ((700, 50, 822, 214), 0.74), 'excited': ((832, 50, 952, 214), 0.74), 'playful': ((962, 50, 1084, 214), 0.84),
         'surprised': ((832, 258, 952, 424), 0.76), 'shy': ((962, 258, 1084, 424), 0.74)}
for name, (box, chin) in tiles.items():
    t = sheet.crop(box).resize(((box[2] - box[0]) * 2, (box[3] - box[1]) * 2), Image.LANCZOS)
    c = cutout(t, 48, sides=('top', 'left', 'right'))
    head(c, int(c.size[1] * chin)).save(f'head-{name}.png')
body = sheet.crop((368, 10, 522, 472)).resize((308, 924), Image.LANCZOS)
full = cutout(body, 22)
# Keep only the figure itself (drops bits of the sheet's other drawings at the edges).
a = np.asarray(full).copy()
solid = a[:, :, 3] > 20
keep = np.zeros_like(solid); h, w = solid.shape; keep[h // 2, w // 2] = solid[h // 2, w // 2]
keep[h // 3, w // 2] = True
while True:
    g = keep.copy(); g[1:] |= keep[:-1]; g[:-1] |= keep[1:]; g[:, 1:] |= keep[:, :-1]; g[:, :-1] |= keep[:, 1:]
    g &= solid
    if (g == keep).all(): break
    keep = g
a[~keep, 3] = 0
Image.fromarray(a).save('full-front.png')
portrait = sheet.crop((60, 98, 366, 492))
cutout(portrait, 30, sides=('top', 'left', 'right')).save('portrait.png')
print('ok')
