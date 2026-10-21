import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Marco Legal do Transporte Escolar",
  description:
    "A legislação que rege o transporte escolar no Brasil e orienta a plataforma Rotta, com referências em norma ABNT e link para a fonte oficial de cada texto.",
  alternates: { canonical: "/legal/marco-legal" },
};

const meta = getLegalDocumentMeta("marco-legal")!;

const TOC = [
  { id: "objeto", label: "Objeto e limites deste documento" },
  { id: "veiculo", label: "1. O veículo de transporte escolar" },
  { id: "condutor", label: "2. O condutor" },
  { id: "municipio", label: "3. A competência do município" },
  { id: "crianca", label: "4. Criança e adolescente" },
  { id: "dados", label: "5. Proteção de dados pessoais" },
  { id: "consumidor", label: "6. Relação de consumo e contrato" },
  { id: "acessibilidade", label: "7. Acessibilidade" },
  { id: "trabalho", label: "8. Jornada e profissão de motorista" },
  { id: "pagamentos", label: "9. Meios de pagamento" },
  { id: "publico", label: "10. Transporte escolar público" },
  { id: "papel", label: "11. O papel da Rotta, e onde ele termina" },
  { id: "referencias", label: "Referências" },
  { id: "atualizacao", label: "Atualização e conferência" },
];

/**
 * "Marco Legal do Transporte Escolar" — pedido do fundador em
 * 21/10/2026: uma área jurídica pública "para o pessoal ficar de olho",
 * com as fontes em ABNT, visível também no app nativo.
 *
 * ## Por que o app nativo não precisou de tela nova
 *
 * `LegalWebViewScreen` embute a própria `/legal` numa WebView. Um
 * documento novo no registro `LEGAL_DOCUMENTS` aparece nas duas
 * superfícies de uma vez, sem recriar nada em React Native.
 *
 * ## O que este arquivo pode e não pode afirmar
 *
 * Cada norma citada foi localizada e teve o cabeçalho conferido
 * (título, ementa, se está revogada e a fonte oficial) — o levantamento
 * está em `empresa/juridico/2026-10-21-mapa-legal-da-rotta.md`. As
 * referências seguem a ABNT NBR 6023 e foram geradas a partir desses
 * cabeçalhos, nunca digitadas de memória.
 *
 * O que ele **não** afirma, de propósito: que a Rotta certifica a
 * conformidade de qualquer transportadora. A plataforma não inspeciona
 * veículo, não consulta prontuário de condutor no DETRAN e não
 * fiscaliza. Um texto que sugerisse isso transferiria à Rotta uma
 * garantia que ela não tem meio de dar, e seria o primeiro documento
 * apontado contra ela no dia de um acidente. A seção "O papel da Rotta"
 * existe para fechar essa porta por escrito.
 *
 * Nenhuma resolução do CONTRAN é citada por número: as resoluções que
 * regulam a condução de escolares não foram localizadas no acervo
 * consultado, e citar número não conferido num documento público é
 * exatamente o tipo de erro que este documento existe para evitar. O
 * texto remete à delegação do CTB e ao portal oficial do órgão.
 */
export default function MarcoLegalPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/privacidade", label: "Política de Privacidade / LGPD" },
        { href: "/legal/termos", label: "Termos de Uso" },
        { href: "/legal/seguranca", label: "Segurança na Rotta" },
        { href: "/legal/motoristas", label: "Diretrizes para Motoristas" },
      ]}
    >
      <LegalSection id="objeto" title="Objeto e limites deste documento">
        <p>
          Este documento reúne a legislação brasileira que rege o transporte escolar e que orienta a
          construção da plataforma Rotta. Ele é publicado com finalidade informativa e de
          transparência, para que famílias, transportadoras, escolas e o poder público possam
          verificar, na fonte oficial, as regras aplicáveis ao serviço.
        </p>
        <p>
          <strong>Este documento não constitui parecer jurídico</strong> e não substitui a consulta
          a profissional habilitado nem a leitura do texto publicado no Diário Oficial. As
          referências da seção final remetem ao repositório oficial de cada norma.
        </p>
      </LegalSection>

      <LegalSection id="veiculo" title="1. O veículo de transporte escolar">
        <p>
          O Código de Trânsito Brasileiro dedica o Capítulo XIII à condução de escolares. Conforme o
          art. 136, o veículo especialmente destinado à condução coletiva de escolares somente pode
          circular com autorização emitida pelo órgão executivo de trânsito do Estado ou do Distrito
          Federal, exigindo-se cumulativamente:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>registro como veículo de passageiros;</li>
          <li>
            <strong>inspeção semestral</strong> para verificação dos equipamentos obrigatórios e de
            segurança;
          </li>
          <li>
            faixa horizontal amarela de quarenta centímetros à meia altura, em toda a extensão das
            laterais e da traseira, com o dístico <strong>ESCOLAR</strong> em preto — invertendo-se
            as cores quando a carroçaria já for amarela;
          </li>
          <li>equipamento registrador instantâneo inalterável de velocidade e tempo;</li>
          <li>
            lanternas de luz branca, fosca ou amarela nas extremidades superiores dianteiras, e de
            luz vermelha na extremidade superior traseira;
          </li>
          <li>
            <strong>cintos de segurança em número igual à lotação</strong>;
          </li>
          <li>os demais requisitos e equipamentos obrigatórios estabelecidos pelo CONTRAN.</li>
        </ul>
        <p>
          O art. 137 determina que a autorização seja afixada na parte interna do veículo, em local
          visível, com a inscrição da lotação permitida, e{" "}
          <strong>
            veda a condução de escolares em número superior à capacidade estabelecida pelo
            fabricante
          </strong>
          . A ausência da autorização em via é tipificada como infração no art. 231, inciso XX.
        </p>
      </LegalSection>

      <LegalSection id="condutor" title="2. O condutor">
        <p>
          O art. 138 do Código de Trânsito Brasileiro exige que o condutor de veículo destinado à
          condução de escolares: tenha idade superior a vinte e um anos; seja habilitado na{" "}
          <strong>categoria D</strong>; não tenha cometido mais de uma infração gravíssima nos doze
          últimos meses — redação dada pela Lei nº 14.071, de 2020 — e seja aprovado em{" "}
          <strong>curso especializado</strong>, nos termos da regulamentação do CONTRAN.
        </p>
        <p>
          O art. 145 reitera a exigência de habilitação nas categorias D ou E para a condução de
          veículo de transporte de escolares, entre outros requisitos para habilitação nessas
          categorias.
        </p>
        <p>
          O conteúdo do curso especializado e os requisitos adicionais de equipamento são definidos
          por resolução do CONTRAN, por delegação expressa dos arts. 136, inciso VII, e 138, inciso
          V. Este documento não indica número de resolução: a consulta deve ser feita diretamente no
          portal oficial do órgão, cujos atos são revistos periodicamente.
        </p>
      </LegalSection>

      <LegalSection id="municipio" title="3. A competência do município">
        <p>
          O art. 139 do Código de Trânsito Brasileiro estabelece que o disposto naquele capítulo{" "}
          <strong>não exclui a competência municipal</strong> de aplicar as exigências previstas em
          seus regulamentos para o transporte de escolares.
        </p>
        <p>
          Na prática, é com frequência na legislação municipal que se encontram o cadastro do
          veículo, a vistoria local, o alvará do condutor e a exigência de atestado de antecedentes.
          Como essas regras variam por município, este documento não as reproduz: a transportadora e
          a família devem consultar a prefeitura e o órgão de trânsito do próprio município.
        </p>
      </LegalSection>

      <LegalSection id="crianca" title="4. Criança e adolescente">
        <p>
          O art. 227 da Constituição Federal atribui à família, à sociedade e ao Estado o dever de
          assegurar à criança e ao adolescente, com absoluta prioridade, entre outros, o direito à
          vida, à saúde e à segurança.
        </p>
        <p>
          O Estatuto da Criança e do Adolescente rege a proteção integral de quem é transportado e
          alcança diretamente a guarda exercida durante o trajeto. A Lei nº 13.431, de 2017,
          estabelece o sistema de garantia de direitos da criança e do adolescente vítima ou
          testemunha de violência, com regras sobre a forma de colher o relato — o que orienta como
          a plataforma trata o registro de ocorrência envolvendo aluno.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="5. Proteção de dados pessoais">
        <p>
          A operação envolve tratamento de dados pessoais de criança, inclusive de localização
          durante a viagem. Aplica-se o art. 14 da Lei Geral de Proteção de Dados Pessoais, segundo
          o qual o tratamento de dados pessoais de crianças e de adolescentes deve ser realizado em
          seu melhor interesse e, no caso de crianças,{" "}
          <strong>
            com o consentimento específico e em destaque dado por pelo menos um dos pais ou pelo
            responsável legal
          </strong>
          .
        </p>
        <p>
          A Lei nº 12.965, de 2014 — Marco Civil da Internet — rege a guarda de registros e os
          deveres do provedor de aplicação. O detalhamento das bases legais, das finalidades, dos
          prazos de retenção e dos canais de exercício de direitos consta da Política de Privacidade
          desta mesma central.
        </p>
      </LegalSection>

      <LegalSection id="consumidor" title="6. Relação de consumo e contrato">
        <p>
          A contratação do transporte escolar por família configura relação de consumo, regida pelo
          Código de Defesa do Consumidor, que alcança o dever de informação clara sobre preço e
          reajuste, as regras de cancelamento e os limites da cobrança.
        </p>
        <p>
          O Código Civil disciplina o contrato de prestação de serviço e, em capítulo próprio, o
          contrato de transporte, com a responsabilidade do transportador perante o passageiro.
        </p>
      </LegalSection>

      <LegalSection id="acessibilidade" title="7. Acessibilidade">
        <p>
          A Lei Brasileira de Inclusão da Pessoa com Deficiência incide em duas frentes desta
          operação: no transporte, quanto ao direito a deslocamento acessível e ao atendimento
          adequado do aluno com deficiência; e nos canais digitais, quanto à acessibilidade da
          informação e da interface.
        </p>
      </LegalSection>

      <LegalSection id="trabalho" title="8. Jornada e profissão de motorista">
        <p>
          A Consolidação das Leis do Trabalho e a Lei nº 13.103, de 2015, disciplinam o exercício da
          profissão de motorista, a jornada e o tempo de direção. A Lei nº 14.599, de 2023, alterou
          o Código de Trânsito Brasileiro e postergou a exigência do exame toxicológico periódico
          para obtenção e renovação da Carteira Nacional de Habilitação — razão pela qual a
          exigência vigente deve ser verificada na data da consulta.
        </p>
      </LegalSection>

      <LegalSection id="pagamentos" title="9. Meios de pagamento">
        <p>
          A Lei nº 12.865, de 2013, dispõe sobre os arranjos de pagamento e as instituições de
          pagamento integrantes do Sistema de Pagamentos Brasileiro. A Rotta não é instituição
          financeira nem de pagamento: a emissão e a liquidação das cobranças ocorrem por meio de
          instituição de pagamento autorizada, contratada para esse fim.
        </p>
        <p>
          O enquadramento tributário e societário da transportadora — microempreendedor individual,
          microempresa ou sociedade — segue a Lei Complementar nº 123, de 2006; o Imposto Sobre
          Serviços de Qualquer Natureza, de competência municipal, segue a Lei Complementar nº 116,
          de 2003.
        </p>
      </LegalSection>

      <LegalSection id="publico" title="10. Transporte escolar público">
        <p>
          O art. 208, inciso VII, da Constituição Federal e o art. 4º, inciso VIII, da Lei de
          Diretrizes e Bases da Educação Nacional estabelecem o dever do Estado quanto a programas
          de transporte para o educando da educação básica pública. A Lei nº 10.880, de 2004,
          institui o Programa Nacional de Apoio ao Transporte do Escolar, e a Lei nº 13.005, de
          2014, aprova o Plano Nacional de Educação.
        </p>
        <p>
          Quando a contratação é feita pelo poder público, aplicam-se a Lei nº 14.133, de 2021, de
          licitações e contratos administrativos, e a Lei nº 12.846, de 2013, de responsabilização
          administrativa e civil por atos contra a administração pública.
        </p>
      </LegalSection>

      <LegalSection id="papel" title="11. O papel da Rotta, e onde ele termina">
        <p>
          A Rotta é plataforma de tecnologia. O serviço de transporte é prestado pela
          transportadora, que é a responsável pelo cumprimento das exigências legais aplicáveis ao
          veículo, ao condutor e à operação.
        </p>
        <p>
          <strong>
            A Rotta não inspeciona veículos, não emite autorização de transporte escolar, não
            consulta prontuário de condutor junto ao órgão de trânsito e não exerce atividade de
            fiscalização.
          </strong>{" "}
          A plataforma não atesta, não certifica e não garante a conformidade legal de qualquer
          transportadora, veículo ou condutor.
        </p>
        <p>O que a plataforma faz, e que pode ser verificado por quem contrata:</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>
            organiza o cadastro de veículos e de condutores, com os documentos que a transportadora
            envia e as respectivas datas de validade;
          </li>
          <li>avisa a transportadora quando um documento registrado está próximo do vencimento;</li>
          <li>
            registra embarque, desembarque e ocorrências de cada viagem, com data e hora, e dá à
            família acesso ao histórico do próprio aluno;
          </li>
          <li>
            restringe o acesso a dado de aluno a quem tem vínculo com ele, aplicando a separação no
            servidor e não apenas na tela.
          </li>
        </ul>
        <p>
          Quando esta central exibir a validade de um documento, a informação indicará a data em que
          foi registrada e por quem foi enviada. Trata-se de informação documental, e não de
          declaração de conformidade.
        </p>
      </LegalSection>

      <LegalSection id="referencias" title="Referências">
        <p>
          Referências elaboradas conforme a ABNT NBR 6023. A data de acesso é a da última
          conferência de cada texto na fonte oficial.
        </p>
        <div className="flex flex-col gap-3 text-sm">
          <p>
            BRASIL. [Constituição (1988)].{" "}
            <em>Constituição da República Federativa do Brasil de 1988</em>. Brasília, DF:
            Presidência da República, [1988]. Disponível em:
            https://www.planalto.gov.br/ccivil_03/constituicao/constituicaocompilado.htm. Acesso em:
            21 out. 2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 8.069, de 13 de julho de 1990</em>. Dispõe sobre o Estatuto da
            Criança e do Adolescente, e dá outras providências. Brasília, DF: Senado Federal,
            [1990]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-07-13;8069. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 8.078, de 11 de setembro de 1990</em>. Dispõe sobre a proteção do
            consumidor e dá outras providências. Brasília, DF: Senado Federal, [1990]. Disponível
            em: https://normas.leg.br/?urn=urn:lex:br:federal:lei:1990-09-11;8078. Acesso em: 21
            out. 2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 9.394, de 20 de dezembro de 1996</em>. Estabelece as diretrizes e
            bases da educação nacional. Brasília, DF: Senado Federal, [1996]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:1996-12-20;9394. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 9.503, de 23 de setembro de 1997</em>. Institui o Código de Trânsito
            Brasileiro. Brasília, DF: Senado Federal, [1997]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:1997-09-23;9503. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 10.406, de 10 de janeiro de 2002</em>. Institui o Código Civil.
            Brasília, DF: Senado Federal, [2002]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 10.880, de 9 de junho de 2004</em>. Institui o Programa Nacional de
            Apoio ao Transporte do Escolar — PNATE [...]. Brasília, DF: Senado Federal, [2004].
            Disponível em: https://normas.leg.br/?urn=urn:lex:br:federal:lei:2004-06-09;10880.
            Acesso em: 21 out. 2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 12.587, de 3 de janeiro de 2012</em>. Institui as diretrizes da
            Política Nacional de Mobilidade Urbana [...]. Brasília, DF: Senado Federal, [2012].
            Disponível em: https://normas.leg.br/?urn=urn:lex:br:federal:lei:2012-01-03;12587.
            Acesso em: 21 out. 2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 12.846, de 1º de agosto de 2013</em>. Dispõe sobre a
            responsabilização administrativa e civil de pessoas jurídicas pela prática de atos
            contra a administração pública, nacional ou estrangeira, e dá outras providências.
            Brasília, DF: Senado Federal, [2013]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2013-08-01;12846. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 12.865, de 9 de outubro de 2013</em>. [...] dispõe sobre os arranjos
            de pagamento e as instituições de pagamento integrantes do Sistema de Pagamentos
            Brasileiro (SPB) [...]. Brasília, DF: Senado Federal, [2013]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2013-10-09;12865. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 12.965, de 23 de abril de 2014</em>. Estabelece princípios,
            garantias, direitos e deveres para o uso da Internet no Brasil. Brasília, DF: Senado
            Federal, [2014]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-04-23;12965. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 13.005, de 25 de junho de 2014</em>. Aprova o Plano Nacional de
            Educação — PNE e dá outras providências. Brasília, DF: Senado Federal, [2014].
            Disponível em: https://normas.leg.br/?urn=urn:lex:br:federal:lei:2014-06-25;13005.
            Acesso em: 21 out. 2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 13.103, de 2 de março de 2015</em>. Dispõe sobre o exercício da
            profissão de motorista [...]. Brasília, DF: Senado Federal, [2015]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2015-03-02;13103. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 13.146, de 6 de julho de 2015</em>. Institui a Lei Brasileira de
            Inclusão da Pessoa com Deficiência (Estatuto da Pessoa com Deficiência). Brasília, DF:
            Senado Federal, [2015]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2015-07-06;13146. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 13.431, de 4 de abril de 2017</em>. Estabelece o sistema de garantia
            de direitos da criança e do adolescente vítima ou testemunha de violência e altera a Lei
            nº 8.069, de 13 de julho de 1990 (Estatuto da Criança e do Adolescente). Brasília, DF:
            Senado Federal, [2017]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2017-04-04;13431. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 13.709, de 14 de agosto de 2018</em>. Lei Geral de Proteção de Dados
            Pessoais (LGPD). Brasília, DF: Senado Federal, [2018]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 14.133, de 1º de abril de 2021</em>. Lei de Licitações e Contratos
            Administrativos. Brasília, DF: Senado Federal, [2021]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2021-04-01;14133. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei nº 14.599, de 19 de junho de 2023</em>. Posterga a exigência do exame
            toxicológico periódico para obtenção e renovação da Carteira Nacional de Habilitação; e
            altera a Lei nº 9.503, de 23 de setembro de 1997 (Código de Trânsito Brasileiro) [...].
            Brasília, DF: Senado Federal, [2023]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei:2023-06-19;14599. Acesso em: 21 out.
            2026.
          </p>
          <p>
            BRASIL. <em>Lei Complementar nº 116, de 31 de julho de 2003</em>. Dispõe sobre o Imposto
            Sobre Serviços de Qualquer Natureza, de competência dos Municípios e do Distrito
            Federal, e dá outras providências. Brasília, DF: Senado Federal, [2003]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2003-07-31;116. Acesso
            em: 21 out. 2026.
          </p>
          <p>
            BRASIL. <em>Lei Complementar nº 123, de 14 de dezembro de 2006</em>. Institui o Estatuto
            Nacional da Microempresa e da Empresa de Pequeno Porte [...]. Brasília, DF: Senado
            Federal, [2006]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:lei.complementar:2006-12-14;123. Acesso
            em: 21 out. 2026.
          </p>
          <p>
            BRASIL. <em>Decreto-Lei nº 5.452, de 1º de maio de 1943</em>. Aprova a Consolidação das
            Leis do Trabalho. Brasília, DF: Senado Federal, [1943]. Disponível em:
            https://normas.leg.br/?urn=urn:lex:br:federal:decreto.lei:1943-05-01;5452. Acesso em: 21
            out. 2026.
          </p>
          <p>
            CONSELHO NACIONAL DE TRÂNSITO (Brasil). <em>Resoluções e deliberações</em>. Brasília,
            DF: Ministério dos Transportes. Disponível em: https://www.gov.br/transportes/pt-br.
            Acesso em: 21 out. 2026.
          </p>
        </div>
      </LegalSection>

      <LegalSection id="atualizacao" title="Atualização e conferência">
        <p>
          Legislação muda. As referências acima registram a data em que cada texto foi conferido na
          fonte oficial, e é por essa fonte que a verificação deve ser feita — não por este resumo.
          Alterações relevantes publicadas após a data de acesso podem ainda não estar refletidas
          aqui.
        </p>
        <p>
          A legislação estadual e municipal aplicável varia conforme o local da operação e não é
          reproduzida neste documento, conforme a seção 3.
        </p>
      </LegalSection>
    </LegalDocumentShell>
  );
}
