import LegalPage from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Termos de Uso")} — ${SITE.name}` };
}

export default async function Termos() {
  const t = await getT();
  return (
    <LegalPage title={t("Termos de Uso")}>
      <p>{t("Ao criar uma conta ou jogar o {nome} (“Jogo”), você concorda com estes Termos. Se não concordar, não utilize o Jogo.", { nome: SITE.name })}</p>

      <h2>{t("1. Conta")}</h2>
      <ul>
        <li>{t("Você precisa ter pelo menos 13 anos. Menores de 18 anos devem ter autorização dos pais ou responsáveis, inclusive para compras.")}</li>
        <li>{t("Você é responsável pela segurança da sua conta e por tudo o que acontece nela. Cada pessoa pode ter uma conta.")}</li>
        <li>{t("Informações falsas, contas compartilhadas ou vendidas podem ser encerradas.")}</li>
      </ul>

      <h2>{t("2. Regras de conduta")}</h2>
      <ul>
        <li>{t("É proibido usar bots, scripts, macros, exploits ou qualquer ferramenta que automatize ou altere o funcionamento do Jogo.")}</li>
        <li>{t("É proibido explorar falhas. Se encontrar uma, avise pelo e-mail {email}.", { email: SITE.contactEmail })}</li>
        <li>{t("Nomes de herói ofensivos, discriminatórios ou que imitem a equipe podem ser alterados ou banidos.")}</li>
        <li>{t("Violações podem resultar em advertência, remoção de itens e moedas, suspensão ou banimento, sem reembolso.")}</li>
      </ul>

      <h2>{t("3. Moedas e itens virtuais")}</h2>
      <ul>
        <li>{t("O Ouro (moeda do jogo) e as Gemas (moeda premium) são licenças de uso limitadas, pessoais e intransferíveis. Não são dinheiro, não têm valor fora do Jogo e não podem ser trocados por dinheiro real.")}</li>
        <li>{t("É proibido vender, comprar ou trocar contas, moedas ou itens fora do Jogo.")}</li>
        <li>{t("Os preços são exibidos em Reais (BRL) ou Dólares (USD) com impostos inclusos. Os pagamentos são processados pelo Stripe ou pelo Mercado Pago; não armazenamos dados de cartão.")}</li>
        <li><b>{t("Direito de arrependimento (CDC, art. 49):")}</b> {t("você pode pedir reembolso em até 7 dias após a compra, desde que as Gemas compradas não tenham sido usadas. Escreva para {email}.", { email: SITE.contactEmail })}</li>
        <li>{t("Estornos ou contestações abertos após o uso das Gemas podem levar à remoção dos itens e à suspensão da conta.")}</li>
        <li>{t("O Jogo não vende caixas de recompensa aleatórias (“loot boxes”) com dinheiro real: toda compra mostra exatamente o que você recebe.")}</li>
      </ul>

      <h2>{t("4. Ofertas e eventos")}</h2>
      <p>{t("Ofertas por tempo limitado, estoques limitados, rankings semanais e recompensas podem mudar ou terminar. Recompensas de ranking são entregues conforme as regras exibidas no Jogo durante a temporada.")}</p>

      <h2>{t("5. Disponibilidade e alterações")}</h2>
      <p>{t("O Jogo é oferecido “no estado em que se encontra”. Podemos alterar o equilíbrio do jogo, os itens, as regras e estes Termos. Mudanças relevantes serão avisadas no Jogo. Se o Jogo for encerrado, avisaremos com pelo menos 30 dias de antecedência.")}</p>

      <h2>{t("6. Propriedade intelectual")}</h2>
      <p>{t("Textos, artes, marcas e código do Jogo pertencem aos seus criadores. Você não pode copiá-los ou redistribuí-los sem autorização.")}</p>

      <h2>{t("7. Lei aplicável")}</h2>
      <p>{t("Estes Termos seguem as leis do Brasil, incluindo o Código de Defesa do Consumidor e a Lei Geral de Proteção de Dados (LGPD).")}</p>

      <h2>{t("8. Contato")}</h2>
      <p>{t("Dúvidas, denúncias e pedidos de reembolso:")} <b>{SITE.contactEmail}</b>.</p>
    </LegalPage>
  );
}
