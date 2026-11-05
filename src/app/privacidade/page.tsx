import LegalPage from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: `${t("Política de Privacidade")} — ${SITE.name}` };
}

export default async function Privacidade() {
  const t = await getT();
  return (
    <LegalPage title={t("Política de Privacidade")}>
      <p>{t("Esta Política explica quais dados o {nome} coleta, por que coleta e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).", { nome: SITE.name })}</p>

      <h2>{t("1. Dados que coletamos")}</h2>
      <ul>
        <li><b>{t("Conta:")}</b> {t("e-mail e, se você entrar com Google ou Facebook, o identificador e o e-mail fornecidos por eles. Não recebemos sua senha dessas redes.")}</li>
        <li><b>{t("Jogo:")}</b> {t("nome do herói, progresso, itens, moedas, histórico de batalhas e de compras.")}</li>
        <li><b>{t("Pagamentos:")}</b> {t("valor, moeda, data e status. Os dados do cartão ou do Pix ficam com o Stripe ou o Mercado Pago, não conosco.")}</li>
        <li><b>{t("Técnicos:")}</b> {t("endereço IP e dados do navegador, usados para segurança, limitar abusos e corrigir erros.")}</li>
        <li><b>{t("No seu navegador:")}</b> {t("cookies de sessão (para manter você conectado) e preferências locais, como som ligado/desligado e tutorial visto. Não usamos cookies de publicidade.")}</li>
      </ul>

      <h2>{t("2. Para que usamos")}</h2>
      <ul>
        <li>{t("Criar e manter sua conta e seu progresso (execução de contrato).")}</li>
        <li>{t("Processar compras e reembolsos (execução de contrato e obrigação legal).")}</li>
        <li>{t("Prevenir fraudes, trapaças e ataques (legítimo interesse).")}</li>
        <li>{t("Mostrar seu nome de herói, nível, título e pontuação no ranking para outros jogadores.")}</li>
      </ul>

      <h2>{t("3. Com quem compartilhamos")}</h2>
      <p>{t("Somente com os serviços necessários para o Jogo funcionar, que tratam os dados em nosso nome:")}</p>
      <ul>
        <li><b>Supabase</b> {t("(banco de dados e login) ·")} <b>Vercel</b> {t("(hospedagem) ·")} <b>Upstash</b> {t("(proteção contra abuso)")}</li>
        <li><b>Stripe</b> {t("e")} <b>Mercado Pago</b> {t("(pagamentos) ·")} <b>Google</b> {t("e")} <b>Facebook</b> {t("(apenas se você escolher entrar com eles)")}</li>
      </ul>
      <p>{t("Alguns desses serviços podem armazenar dados fora do Brasil, com as garantias previstas na LGPD. Não vendemos seus dados.")}</p>

      <h2>{t("4. Por quanto tempo guardamos")}</h2>
      <p>{t("Enquanto sua conta existir. Registros de compras podem ser mantidos pelo prazo exigido pela legislação fiscal e de defesa do consumidor, mesmo após a exclusão da conta.")}</p>

      <h2>{t("5. Seus direitos")}</h2>
      <p>{t("Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, portabilidade, exclusão da conta e dos dados, e informações sobre compartilhamento. Envie o pedido para")} <b>{SITE.contactEmail}</b> {t("a partir do e-mail cadastrado. Respondemos em até 15 dias.")}</p>

      <h2>{t("6. Segurança")}</h2>
      <p>{t("Usamos conexão criptografada (HTTPS), senhas protegidas pelo provedor de autenticação, controle de acesso por usuário no banco de dados e monitoramento contra abusos. Nenhum sistema é 100% seguro; em caso de incidente relevante, avisaremos os afetados e a ANPD.")}</p>

      <h2>{t("7. Crianças e adolescentes")}</h2>
      <p>{t("O Jogo não é destinado a menores de 13 anos. Se identificarmos uma conta de menor de 13 anos, ela será removida.")}</p>

      <h2>{t("8. Alterações")}</h2>
      <p>{t("Podemos atualizar esta Política. A data no topo indica a versão atual, e mudanças relevantes serão avisadas no Jogo.")}</p>
    </LegalPage>
  );
}
