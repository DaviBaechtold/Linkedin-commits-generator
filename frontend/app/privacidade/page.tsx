import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Política de Privacidade — CommitPost",
  description:
    "Como o CommitPost coleta, usa, compartilha e protege seus dados pessoais, em conformidade com a LGPD.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidade" updatedAt="16 de junho de 2026">
      <p>
        Esta Política de Privacidade descreve como o <strong>CommitPost</strong>{" "}
        (&quot;nós&quot;, &quot;serviço&quot;) trata seus dados pessoais, em
        conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
        LGPD). O CommitPost é um projeto pessoal, gratuito e de código aberto,
        mantido por um desenvolvedor individual.
      </p>

      <LegalSection n={1} title="Quem é o controlador dos dados">
        <p>
          O controlador dos dados é o mantenedor do projeto, atuando também como
          encarregado pelo tratamento de dados pessoais (DPO). Para qualquer
          solicitação relacionada aos seus dados ou a esta política, o contato é{" "}
          <a
            href="mailto:davicampos2002@gmail.com"
            className="text-brand-light hover:underline"
          >
            davicampos2002@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection n={2} title="Quais dados coletamos">
        <p>Coletamos apenas o necessário para o serviço funcionar:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Dados de cadastro (via GitHub OAuth):</strong> nome de
            usuário, e-mail e foto de perfil públicos da sua conta GitHub.
          </li>
          <li>
            <strong>Conteúdo de repositórios:</strong> metadados de commits
            (mensagens, datas, nomes de repositório) usados para gerar os posts.
            O texto dos commits é processado, mas nunca publicado sem passar pelo
            filtro NDA e pela sua revisão.
          </li>
          <li>
            <strong>Chaves e tokens de integração:</strong> sua chave de API de
            IA (modelo BYOK — &quot;traga sua própria chave&quot;) e os tokens de
            acesso de GitHub, LinkedIn e Bluesky. Esses dados são{" "}
            <strong>criptografados em repouso (AES-256-GCM)</strong> antes de
            serem armazenados e nunca são enviados de volta ao seu navegador
            (exibimos apenas os últimos 4 caracteres como dica).
          </li>
          <li>
            <strong>Preferências e rascunhos:</strong> configurações de geração,
            posts gerados e seus status.
          </li>
          <li>
            <strong>Registros de uso:</strong> contagem de ações (geração,
            publicação) por dia, para fins de limite de uso. Não registramos seu
            endereço IP nem dados de navegação na aplicação.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Para que usamos os dados e base legal">
        <p>
          Tratamos seus dados para <strong>execução do contrato</strong> de
          prestação do serviço (art. 7º, V da LGPD) e mediante seu{" "}
          <strong>consentimento</strong> (art. 7º, I), manifestado no momento do
          cadastro. As finalidades são:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>autenticar você e manter sua sessão;</li>
          <li>
            buscar seus commits e gerar posts profissionais com a IA que você
            configurou;
          </li>
          <li>publicar nas redes que você conectar (LinkedIn, Bluesky);</li>
          <li>aplicar limites de uso e impedir abuso do serviço.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Com quem compartilhamos">
        <p>
          O CommitPost não vende seus dados. Compartilhamos dados apenas com os
          operadores necessários para o serviço funcionar:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Provedores de IA escolhidos por você</strong> (Google
            Gemini, Anthropic, OpenAI, DeepSeek, Groq, Mistral ou xAI): recebem o
            resumo dos commits para gerar o texto, usando a sua própria chave.
          </li>
          <li>
            <strong>LinkedIn e Bluesky:</strong> recebem o conteúdo que você opta
            por publicar.
          </li>
          <li>
            <strong>Provedores de imagem</strong> (Cloudflare Workers AI, OpenAI
            DALL·E, Fal.ai): quando você gera imagens.
          </li>
          <li>
            <strong>Supabase</strong> (banco de dados e autenticação) e{" "}
            <strong>Vercel</strong> (hospedagem): armazenam e processam os dados
            em nossa infraestrutura.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Transferência internacional de dados">
        <p>
          Os provedores acima podem processar dados em servidores localizados
          fora do Brasil (notadamente nos Estados Unidos e na União Europeia).
          Ao usar o serviço, você está ciente dessa transferência internacional,
          realizada nos termos do art. 33 da LGPD para a execução do serviço que
          você solicitou.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Por quanto tempo guardamos">
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa. Ao excluir a
          conta, todos os seus dados (integrações, repositórios, rascunhos,
          preferências e registros) são apagados permanentemente do banco de
          forma imediata e em cascata. Imagens já publicadas em redes externas
          permanecem sob as políticas dessas redes.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Como protegemos seus dados">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Chaves de API e tokens cifrados em repouso com AES-256-GCM; a chave
            real nunca trafega para o navegador.
          </li>
          <li>
            Isolamento por usuário no banco (Row Level Security) — você só
            acessa os seus próprios dados.
          </li>
          <li>
            Conexões via HTTPS, cabeçalhos de segurança (CSP, HSTS) e proteção
            CSRF nos fluxos de autorização.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Seus direitos (art. 18 da LGPD)">
        <p>Você pode, a qualquer momento:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>confirmar a existência de tratamento e acessar seus dados;</li>
          <li>corrigir dados incompletos ou desatualizados;</li>
          <li>
            solicitar a exclusão dos dados — disponível diretamente em{" "}
            <strong>Configurações → Zona de Perigo</strong>;
          </li>
          <li>solicitar a portabilidade dos seus dados;</li>
          <li>revogar o consentimento.</li>
        </ul>
        <p>
          Para exercer qualquer direito que não esteja disponível no painel,
          basta escrever para{" "}
          <a
            href="mailto:davicampos2002@gmail.com"
            className="text-brand-light hover:underline"
          >
            davicampos2002@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cookies">
        <p>
          Usamos <strong>apenas cookies estritamente necessários</strong> para
          manter sua sessão autenticada. Não utilizamos cookies de análise,
          rastreamento ou publicidade — por isso, não exibimos banner de
          consentimento de cookies.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Alterações nesta política">
        <p>
          Podemos atualizar esta política periodicamente. Mudanças relevantes
          serão indicadas pela data de &quot;última atualização&quot; no topo
          desta página.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
