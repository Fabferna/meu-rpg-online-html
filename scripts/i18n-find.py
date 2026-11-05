"""Lista strings em português ainda não traduzidas (heurística)."""
import re, sys
PT = re.compile(r"[ãõçáéíóúâêôÁÉÍÓÚÂÊÔÃÕÇ]|\b(de|da|do|para|com|sem|seu|sua|você|não|mais|por|em|dia|nível|ouro|gemas?|missão|herói|Nv|Requer|Volte|Esgotado|Remover|Equipar|Vender|Entrar|Sair|Usar|Resgatar|Comprar|Carregando|Termina|Restam|Feito)\b", re.I)
STR = re.compile(r'(?<![\w$])(?:"([^"\n]*)"|`([^`]*)`|\'([^\'\n]*)\')')
for f in sys.argv[1:]:
    for n, line in enumerate(open(f), 1):
        if line.strip().startswith(("import", "//", "*", "/*")) or "className=" in line and not PT.search(re.sub(r'className=("[^"]*"|\{`[^`]*`\})', "", line)):
            pass
        for m in STR.finditer(line):
            s = next(g for g in m.groups() if g is not None)
            if not PT.search(s) or re.fullmatch(r"[\w\-/.:@ %]+", s) and " " not in s: continue
            before = line[:m.start()]
            if re.search(r"t\($", before) or "className" in before[-20:] or before.rstrip().endswith(("from", "import")): continue
            if re.search(r"(href|src|key|id|data-\w+)=$", before.rstrip()): continue
            print(f"{f}:{n}: {s[:90]}")
