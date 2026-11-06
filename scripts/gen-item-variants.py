#!/usr/bin/env python3
"""Gera artes de itens novos como VARIAÇÕES (cor) de artes existentes, 256×256 webp.
Uso: python3 scripts/gen-item-variants.py
Arte definitiva depois: salve com nome NOVO (sufixo -v2) e troque em items.ts (cache da CDN)."""
import colorsys
from PIL import Image, ImageEnhance, ImageFilter

# id novo: (arte base, giro de matiz em graus, saturação, brilho)
VARIANTS = {
    "arco_tempestade": ("items/arco_lunar-v2", 190, 1.35, 1.05),
    "martelo_trovao": ("icone_forja_ancestral", 200, 1.25, 1.0),
    "machado_colosso": ("items/machado_escarlate-v2", 40, 1.2, 0.95),
    "cajado_astral": ("items/cajado_eter-v2", 120, 1.3, 1.05),
    "arco_longo": ("arco_elfico_elegante", 30, 0.85, 0.95),
    "martelo_guerra": ("icone_forja_ancestral", 0, 0.45, 0.85),
    "espada_capitao": ("items/lamina_valerion-v2", 200, 1.2, 1.0),
    "cajado_carvalho": ("cajado_magico_luminoso", 80, 0.9, 0.95),
    "machado_guerra": ("items/machado_bronze-v2", 330, 1.1, 0.9),
    "capuz_sentinela": ("items/capuz_viajante-v2", 150, 1.3, 1.0),
    "elmo_estelar": ("items/elmo_ferro-v2", 210, 1.4, 1.1),
    "couraca_escamas": ("items/cota_malha-v2", 100, 1.4, 1.0),
    "veste_lunar": ("items/manto_arcano-v2", 220, 1.2, 0.9),
    "botas_cavaleiro": ("items/botas_patrulheiro-v2", 200, 0.8, 0.95),
    "botas_guardiao": ("items/botas_vento-v2", 0, 0.3, 0.95),
    "grevas_eter": ("items/grevas_runicas-v2", 180, 1.3, 1.05),
    "anel_tempestade": ("items/anel_vigor-v2", 200, 1.3, 1.05),
    "talisma_estelar": ("canalizacao_de_magia", 160, 1.2, 1.05),
}

def hue_shift(im, deg, sat, bright):
    im = im.convert("RGB")
    if deg:
        px = im.load()
        w, h = im.size
        d = deg / 360.0
        for y in range(h):
            for x in range(w):
                r, g, b = px[x, y]
                hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
                r2, g2, b2 = colorsys.hls_to_rgb((hh + d) % 1.0, ll, ss)
                px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255))
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Brightness(im).enhance(bright)
    return im.filter(ImageFilter.SHARPEN)

for new, (base, deg, sat, bright) in VARIANTS.items():
    src = Image.open(f"public/assets/{base}.webp").resize((256, 256), Image.LANCZOS)
    hue_shift(src, deg, sat, bright).save(f"public/assets/items/{new}.webp", "WEBP", quality=82, method=6)
    print("ok", new)
