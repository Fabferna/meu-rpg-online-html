"""Envolve textos visíveis de JSX em t("...") (uso único na migração para i18n)."""
import re, sys, json

LETTER = re.compile(r"[A-Za-zÀ-ÿ]")
BAD = [";", "=>", "{", "}", "`", "const ", "return", "&&", "||", "import ", "className", "===", "\"", "x.", "?.", " ?\n"]

def esc(s): return json.dumps(s, ensure_ascii=False)

def wrap_text_nodes(src):
    out = []; i = 0
    pat = re.compile(r">([^<>]*)<")
    pos = 0
    for m in pat.finditer(src):
        seg = m.group(1); start = m.start()
        prev = src[start - 1] if start > 0 else ""
        nxt = src[m.end()] if m.end() < len(src) else ""
        core = seg.strip()
        ok = (core and LETTER.search(core) and not any(b in seg for b in BAD)
              and prev not in "=-" and (nxt.isalpha() or nxt in "/{>") and "\n\n" not in seg
              and not (re.fullmatch(r"[A-Za-z_][\w.]*", core) and not core[0].isupper()) or False)
        # palavras únicas tipo identificadores (ex.: "Avatar") só se tiverem acento ou espaço ou pontuação
        if ok and re.fullmatch(r"[A-Za-z]+", core) and not core[0].isupper():
            ok = False
        if ok and (core[0] in ":?" or re.search(r"\?\s*$", core) and ":" in src[m.end():m.end()+200].split("<")[0]):
            ok = False
        if ok and re.search(r"^\s*[:?]", seg, re.M):
            ok = False
        if not ok: continue
        lead = seg[: len(seg) - len(seg.lstrip())]; trail = seg[len(seg.rstrip()):]
        # espaços nas bordas viram parte do JSX (preserva espaçamento entre fragmentos)
        repl = ">" + lead + "{t(" + esc(core) + ")}" + trail + "<"
        out.append((m.start(), m.end(), repl))
    for s, e, r in reversed(out):
        src = src[:s] + r + src[e:]
    return src, len(out)

ATTR = re.compile(r'\b(title|placeholder|aria-label|alt|label)="([^"{}]*[A-Za-zÀ-ÿ][^"{}]*)"')
def wrap_attrs(src):
    n = 0
    def r(m):
        nonlocal n; n += 1
        return f'{m.group(1)}={{t({esc(m.group(2))})}}'
    return ATTR.sub(r, src), n

for f in sys.argv[1:]:
    s = open(f).read()
    s, a = wrap_text_nodes(s)
    s, b = wrap_attrs(s)
    open(f, "w").write(s)
    print(f"{f}: {a} textos, {b} atributos")
