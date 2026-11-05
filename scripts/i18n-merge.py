"""Gera src/lib/i18n/dict/{en,es,zh}.json a partir de scripts/i18n-keys.json + scripts/i18n-tr/*.tsv."""
import glob, json, re, sys
keys = json.load(open("scripts/i18n-keys.json"))
es, zh, bad = {}, {}, 0
en = {}
for f in sorted(glob.glob("scripts/i18n-tr/en/*.tsv")):
    for line in open(f, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip(): continue
        idx, v = line.split("\t")
        k = keys[int(idx)]
        if sorted(re.findall(r"\{\w+\}", v)) != sorted(re.findall(r"\{\w+\}", k)):
            print(f"placeholder mismatch {idx} en: {v}"); bad += 1
        en[k] = v
for f in sorted(x for x in glob.glob("scripts/i18n-tr/*.tsv") if not x.endswith("extra.tsv")):
    for line in open(f, encoding="utf-8"):
        line = line.rstrip("\n")
        if not line.strip(): continue
        idx, a, b = line.split("\t")
        k = keys[int(idx)]
        want = sorted(re.findall(r"\{\w+\}", k))
        for lang, v in (("es", a), ("zh", b)):
            if sorted(re.findall(r"\{\w+\}", v)) != want:
                print(f"placeholder mismatch {idx} {lang}: {v}"); bad += 1
        es[k], zh[k] = a, b
for line in open("scripts/i18n-tr/extra.tsv", encoding="utf-8"):
    if not line.strip(): continue
    k, a_en, a_es, a_zh = line.rstrip("\n").split("\t")
    en[k], es[k], zh[k] = a_en, a_es, a_zh
for name, d in (("en", en), ("es", es), ("zh", zh)):
    json.dump(dict(sorted(d.items())), open(f"src/lib/i18n/dict/{name}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print(len(es), "entries;", bad, "problems")
sys.exit(1 if bad else 0)
