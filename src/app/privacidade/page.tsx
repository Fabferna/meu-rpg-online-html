import LegalPage from "@/components/site/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: `Política de Privacidade — ${SITE.name}` };

export default function Privacidade() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>Esta Política explica quais dados o {SITE.name} coleta, por que coleta e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018 — LGPD).</p>

      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><b>Conta:</b> e-mail e, se você entrar com Google ou Facebook, o identificador e o e-mail fornecidos por eles. Não recebemos sua senha dessas redes.</li>
        <li><b>Jogo:</b> nome do herói, progresso, itens, moedas, histórico de batalhas e de compras.</li>
        <li><b>Pagamentos:</b> valor, moeda, data e status. Os dados do cartão ou do Pix ficam com o Stripe ou o Mercado Pago, não conosco.</li>
        <li><b>Técnicos:</b> endereço IP e dados do navegador, usados para segurança, limitar abusos e corrigir erros.</li>
        <li><b>No seu navegador:</b> cookies de sessão (para manter você conectado) e preferências locais, como som ligado/desligado e tutorial visto. Não usamos cookies de publicidade.</li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Criar e manter sua conta e seu progresso (execução de contrato).</li>
        <li>Processar compras e reembolsos (execução de contrato e obrigação legal).</li>
        <li>Prevenir fraudes, trapaças e ataques (legítimo interesse).</li>
        <li>Mostrar seu nome de herói, nível, título e pontuação no ranking para outros jogadores.</li>
      </ul>

      <h2>3. Com quem compartilhamos</h2>
      <p>Somente com os serviços necessários para o Jogo funcionar, que tratam os dados em nosso nome:</p>
      <ul>
        <li><b>Supabase</b> (banco de dados e login) · <b>Vercel</b> (hospedagem) · <b>Upstash</b> (proteção contra abuso)</li>
        <li><b>Stripe</b> e <b>Mercado Pago</b> (pagamentos) · <b>Google</b> e <b>Facebook</b> (apenas se você escolher entrar com eles)</li>
      </ul>
      <p>Alguns desses serviços podem armazenar dados fora do Brasil, com as garantias previstas na LGPD. Não vendemos seus dados.</p>

      <h2>4. Por quanto tempo guardamos</h2>
      <p>Enquanto sua conta existir. Registros de compras podem ser mantidos pelo prazo exigido pela legislação fiscal e de defesa do consumidor, mesmo após a exclusão da conta.</p>

      <h2>5. Seus direitos</h2>
      <p>Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, portabilidade, exclusão da conta e dos dados, e informações sobre compartilhamento. Envie o pedido para <b>{SITE.contactEmail}</b> a partir do e-mail cadastrado. Respondemos em até 15 dias.</p>

      <h2>6. Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), senhas protegidas pelo provedor de autenticação, controle de acesso por usuário no banco de dados e monitoramento contra abusos. Nenhum sistema é 100% seguro; em caso de incidente relevante, avisaremos os afetados e a ANPD.</p>

      <h2>7. Crianças e adolescentes</h2>
      <p>O Jogo não é destinado a menores de 13 anos. Se identificarmos uma conta de menor de 13 anos, ela será removida.</p>

      <h2>8. Alterações</h2>
      <p>Podemos atualizar esta Política. A data no topo indica a versão atual, e mudanças relevantes serão avisadas no Jogo.</p>
    </LegalPage>
  );
}
