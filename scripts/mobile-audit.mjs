// Auditoria de celular: abre o modo demo em Pixel 7 e iPhone 13, passa por todas as telas,
// tira prints e mede problemas comuns (rolagem horizontal, alvos < 44px, coisas fora da tela,
// textos cortados e o botão do chat por cima de botões).
// Uso: node scripts/mobile-audit.mjs http://localhost:3000 pasta-dos-prints [rótulo]
import { createRequire } from "node:module";
// Playwright já vem instalado no ambiente (fora do package.json): carrega via require.
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "mobile-shots";
const LABEL = process.argv[4] ?? "";
mkdirSync(OUT, { recursive: true });

const TABS = ["Herói", "Mundo", "Objetivos", "Missões", "Caçada", "Arena", "Guilda", "Habilidades", "Inventário", "Forja", "Passe", "Loja", "Ranking"];
const slug = (s) => s.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase();

// Luta de exemplo (o demo não tem backend): /api/battle/start "dá certo" e /api/state devolve esta luta.
const BATTLE = {
  enemyId: "story_rainha_harpia",
  enemy: { name: "Rainha das Harpias", image: "/assets/enemies/vulto_menor-hd.webp", hp: 1210, maxHp: 1980, boss: true },
  player: { hp: 640, maxHp: 1010 }, turn: 7, skillCooldown: 0, cds: { h_demolidor: 2 }, effects: { pStun: 1, ePoison: 2 },
  log: [
    { turn: 6, actor: "player", action: "skill", skillId: "h_adaptavel", dmg: 182, crit: false },
    { turn: 6, actor: "enemy", action: "attack", dmg: 96 },
    { turn: 7, actor: "player", action: "attack", dmg: 77, crit: true },
    { turn: 7, actor: "enemy", action: "attack", dmg: 88, effect: "stun" },
  ],
};

async function audit(page) {
  return page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight;
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05; };
    const label = (el) => (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 32);
    const scrollParent = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll" || o === "hidden") return p; } return null; };
    const targets = [...document.querySelectorAll("button, a[href], select, input:not([type=hidden]), [role=button]")].filter(vis);
    const small = targets.filter((el) => { const r = el.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; })
      .filter((el) => !(el.tagName === "A" && getComputedStyle(el).display === "inline")); // links no meio do texto
    const off = [...document.querySelectorAll("body *")].filter(vis).filter((el) => {
      const r = el.getBoundingClientRect(); if (r.right <= W + 1 && r.left >= -1) return false;
      return !scrollParent(el); // dentro de carrossel com rolagem é intencional
    });
    const cut = [...document.querySelectorAll("p, span, h1, h2, h3, button, li")].filter(vis).filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible" && el.children.length === 0);
    const modal = [...document.querySelectorAll("[role=dialog], .fixed")].filter(vis).filter((el) => { const r = el.getBoundingClientRect(); return r.height > H + 1 || r.width > W + 1; });
    const chat = [...document.querySelectorAll("button")].find((b) => /💬/.test(b.textContent || "") && getComputedStyle(b.closest(".fixed") ?? b).position === "fixed");
    let overlaps = [];
    if (chat) {
      const c = chat.getBoundingClientRect();
      overlaps = targets.filter((el) => el !== chat && !chat.contains(el) && !el.contains(chat)).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top;
      });
    }
    return {
      hScroll: document.documentElement.scrollWidth > W + 1 ? document.documentElement.scrollWidth - W : 0,
      small: small.length, smallList: [...new Set(small.map(label))].slice(0, 10),
      off: off.length, offList: [...new Set(off.map((e) => `${e.tagName.toLowerCase()}:${label(e)}`))].slice(0, 6),
      cut: cut.length, cutList: [...new Set(cut.map(label))].slice(0, 6),
      bigModal: modal.length, chatOverlap: overlaps.map(label).slice(0, 5),
    };
  });
}

const report = [];
const browser = await chromium.launch();
for (const dev of ["Pixel 7", "iPhone 13"]) {
  const ctx = await browser.newContext({ ...devices[dev] });
  await ctx.addInitScript(() => { try { localStorage.setItem("aethelgard:tutorial-done", "1"); localStorage.setItem("aethelgard:lang", "pt"); } catch {} });
  const page = await ctx.newPage();
  const shot = async (name) => {
    await page.waitForTimeout(450);
    const a = await audit(page);
    // O botão flutuante só é problema se cobrir algo mesmo com a página rolada até o fim.
    const y = await page.evaluate(() => { const y = window.scrollY; window.scrollTo(0, document.body.scrollHeight); return y; });
    await page.waitForTimeout(150);
    a.chatOverlap = (await audit(page)).chatOverlap;
    await page.evaluate((y) => window.scrollTo(0, y), y);
    report.push({ device: dev, screen: name, ...a });
    await page.screenshot({ path: `${OUT}/${slug(dev)}-${slug(name)}${LABEL ? `-${LABEL}` : ""}.png`, fullPage: false });
  };
  const tab = async (name) => {
    await page.locator("nav button", { hasText: name }).first().click();
    await page.waitForTimeout(350);
  };
  // A recompensa diária abre sozinha: fotografa uma vez (é um modal) e fecha.
  let dailyShot = false;
  const open = async (url) => {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    if (await page.getByRole("dialog").count()) {
      if (!dailyShot) { await shot("recompensa-diaria"); dailyShot = true; }
      await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
  };
  await open(`${BASE}/demo`);
  await shot("topo");
  for (const name of TABS) { await tab(name); await shot(name); }

  // Combate: finge que a caçada começou e a API devolve a luta de exemplo.
  await page.evaluate((battle) => {
    const f = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input.url;
      if (url === "/api/battle/start" || url === "/api/story/battle") return new Response('{"ok":true}', { status: 200, headers: { "Content-Type": "application/json" } });
      const r = await f(input, init);
      if (url === "/api/state") { const s = await r.clone().json(); s.battle = { id: "b1", state: battle }; return new Response(JSON.stringify(s), { status: 200, headers: { "Content-Type": "application/json" } }); }
      return r;
    };
  }, BATTLE);
  await tab("Caçada");
  await page.locator("main button.panel").first().click();
  await page.waitForTimeout(900);
  await shot("combate");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await shot("combate-fim");

  // Chat e amigos.
  await page.evaluate(() => window.scrollTo(0, 0));
  await tab("Herói"); // durante a luta o botão do chat some no celular
  const chatBtn = page.locator("button", { hasText: "💬" }).last();
  if (await chatBtn.count()) {
    await chatBtn.click(); await shot("chat");
    const amigos = page.getByRole("button", { name: /Amigos/ });
    if (await amigos.count()) { await amigos.first().click(); await shot("amigos"); }
    await page.keyboard.press("Escape");
    const x = page.getByRole("button", { name: "Fechar" }); if (await x.count()) await x.first().click().catch(() => {});
  }
  // Perfil (clicando num jogador do ranking).
  await open(`${BASE}/demo`);
  await tab("Ranking");
  const row = page.locator("main li button, main tr button, main button:has(img)").first();
  if (await row.count()) { await row.click().catch(() => {}); await shot("perfil"); }
  // Criação de herói (cena do demo).
  await open(`${BASE}/demo?cena=criar`);
  await shot("criar-heroi");
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/relatorio${LABEL ? `-${LABEL}` : ""}.json`, JSON.stringify(report, null, 2));
for (const r of report) {
  const issues = [r.hScroll && `rolagem-horizontal ${r.hScroll}px`, r.small && `${r.small} alvos<44px`, r.off && `${r.off} fora-da-tela`, r.cut && `${r.cut} cortados`, r.bigModal && "modal>tela", r.chatOverlap.length && `chat-sobre: ${r.chatOverlap.join(", ")}`].filter(Boolean);
  console.log(`${r.device.padEnd(10)} ${r.screen.padEnd(13)} ${issues.join(" | ") || "ok"}`);
}
