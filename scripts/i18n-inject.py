"""Injeta `const t = useT();` (cliente) ou `const t = await getT();` (servidor) nos componentes que usam t()."""
import re, sys
for f in sys.argv[1:]:
    s = open(f).read()
    client = s.lstrip().startswith('"use client"')
    # localiza declarações de função de componente (nome com maiúscula)
    decls = list(re.finditer(r"^(export default |export )?(async )?function ([A-Z]\w*)\s*\(", s, re.M))
    changed = 0
    for i in reversed(range(len(decls))):
        d = decls[i]
        end = decls[i + 1].start() if i + 1 < len(decls) else len(s)
        body = s[d.start():end]
        if not re.search(r"(?<![\w.])t\(", body) or re.search(r"const t = (await )?(useT|getT)\(", body):
            continue
        # posição da chave que abre o corpo: primeira "{" após o fechamento dos parâmetros
        depth = 0; j = d.end() - 1
        while True:
            c = s[j]
            if c == "(": depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0: break
            j += 1
        k = s.index("{", j)
        if client:
            ins = "\n  const t = useT();"
        else:
            ins = "\n  const t = await getT();"
            if not d.group(2):  # torna async
                s = s[:d.start()] + s[d.start():d.end()].replace("function ", "async function ", 1) + s[d.end():]
                k += len("async ")
        s = s[:k + 1] + ins + s[k + 1:]
        changed += 1
    if changed:
        imp = 'import { useT } from "@/lib/i18n/client";' if client else 'import { getT } from "@/lib/i18n/server";'
        if imp not in s:
            lines = s.split("\n"); last = max(i for i, l in enumerate(lines) if l.startswith("import "))
            # acha fim do último import (pode ser multilinha)
            while not lines[last].rstrip().endswith(";"): last += 1
            lines.insert(last + 1, imp); s = "\n".join(lines)
    open(f, "w").write(s)
    print(f, changed)
