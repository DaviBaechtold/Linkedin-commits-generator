import type { Metadata } from "next";
import LegalShell, { LegalSection } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Termos de Uso — CommitPost",
  description:
    "Termos e condições de uso do CommitPost — serviço gratuito e open source para gerar posts a partir de commits.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Termos de Uso" updatedAt="16 de junho de 2026">
      <p>
        Ao acessar e usar o <strong>CommitPost</strong>, você concorda com estes
        Termos de Uso. Leia-os com atenção. Se não concordar, não utilize o
        serviço.
      </p>

      <LegalSection n={1} title="O que é o serviço">
        <p>
          O CommitPost é uma ferramenta gratuita e de código aberto que conecta
          sua conta do GitHub, gera textos para o LinkedIn e o Bluesky a partir
          dos seus commits usando inteligência artificial, e permite revisar e
          publicar esse conteúdo. É um projeto pessoal mantido sem fins
          lucrativos.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Modelo BYOK — sua própria chave de IA">
        <p>
          O serviço opera no modelo <strong>BYOK (Bring Your Own Key)</strong>:
          você fornece a sua própria chave de API do provedor de IA. Isso
          significa que:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            os custos de uso da IA são de sua inteira responsabilidade e cobrados
            diretamente pelo provedor escolhido;
          </li>
          <li>
            você deve cumprir os termos de uso do provedor de IA que configurar;
          </li>
          <li>
            armazenamos sua chave de forma criptografada e a usamos apenas para
            executar as gerações que você solicitar.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Suas responsabilidades">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Você é responsável pelo conteúdo que publica. O filtro NDA é uma
            camada automática de proteção, mas{" "}
            <strong>a revisão final antes de publicar é sua</strong>.
          </li>
          <li>
            Não use o serviço para expor dados confidenciais de terceiros,
            empregadores ou clientes em violação a acordos de
            confidencialidade.
          </li>
          <li>
            Não use o serviço para fins ilícitos, spam ou para violar os termos
            do GitHub, LinkedIn, Bluesky ou dos provedores de IA.
          </li>
          <li>
            Você é responsável por manter a segurança da sua conta GitHub usada
            para autenticação.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Filtro NDA e revisão humana">
        <p>
          O serviço aplica regras automáticas para evitar a exposição de nomes
          de empresas, clientes, código-fonte e arquitetura interna. Contudo,
          nenhum filtro automático é infalível. O conteúdo só é publicado após
          sua aprovação explícita (ou após o período de revisão que você
          configurar no modo automático). Você reconhece que a responsabilidade
          final pelo que é publicado é sua.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Disponibilidade e isenção de garantias">
        <p>
          O serviço é fornecido <strong>&quot;no estado em que se encontra&quot;</strong>{" "}
          (as is), sem garantias de qualquer tipo, expressas ou implícitas. Por
          ser um projeto gratuito e pessoal, não há garantia de disponibilidade,
          continuidade, ausência de erros ou de que atenderá a uma finalidade
          específica. O serviço pode ser modificado ou descontinuado a qualquer
          momento, sem aviso prévio.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Limitação de responsabilidade">
        <p>
          Na máxima extensão permitida pela lei, o mantenedor do CommitPost não
          se responsabiliza por danos diretos, indiretos, incidentais ou
          consequentes decorrentes do uso ou da impossibilidade de uso do
          serviço — incluindo, mas não se limitando a, publicações indevidas,
          custos com provedores de IA, perda de dados ou consequências
          profissionais de conteúdo publicado.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Conteúdo e propriedade intelectual">
        <p>
          Você mantém todos os direitos sobre seus commits e sobre o conteúdo
          gerado e publicado por você. O código-fonte do CommitPost é aberto e
          regido por sua respectiva licença, disponível no repositório do
          projeto no GitHub.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Encerramento da conta">
        <p>
          Você pode encerrar sua conta a qualquer momento em{" "}
          <strong>Configurações → Zona de Perigo</strong>, o que apaga
          permanentemente seus dados. Podemos suspender o acesso de contas que
          violem estes termos.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Privacidade">
        <p>
          O tratamento dos seus dados é descrito na nossa{" "}
          <a href="/privacidade" className="text-brand-light hover:underline">
            Política de Privacidade
          </a>
          , que é parte integrante destes Termos.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Lei aplicável e foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro do domicílio do usuário para dirimir eventuais
          controvérsias.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
