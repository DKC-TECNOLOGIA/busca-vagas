// Motor transparente de compatibilidade (0 a 5) baseado exclusivamente em evidências reais do CV/perfil.

const DIMENSION_RULES = [
  {
    key: "experiencia",
    label: "Experiência profissional",
    weight: 0.18,
    jobSignals: /\b(experi[eê]ncia|atendimento|suporte|service desk|help desk|chamados|incidentes)\b/i,
    cvSignals: [
      { pattern: /\b(assistente de ti|suporte n1|n1\/n2|178 chamados|40 pdvs)\b/i, evidence: "Assistente de TI N1 desde maio/2026 no Atacadão São Roque (média de 178 chamados/mês, +40 PDVs em 6 filiais)." },
    ],
  },
  {
    key: "tecnicos",
    label: "Conhecimentos técnicos",
    weight: 0.16,
    jobSignals: /\b(windows|linux|redes|tcp\/ip|wi-?fi|vpn|hardware|impressoras|active directory|suporte remoto)\b/i,
    cvSignals: [
      { pattern: /\bwindows\b/i, evidence: "Suporte a ambientes Windows e estações de trabalho." },
      { pattern: /\blinux\b/i, evidence: "Prática informada em infraestrutura Linux." },
      { pattern: /\b(redes|tcp\/ip|hardware|impressoras)\b/i, evidence: "Diagnóstico de rede (TCP/IP), hardware e configuração de impressoras." },
      { pattern: /\bactive directory\b/i, evidence: "Gerenciamento de acessos e Active Directory em nível básico." },
    ],
  },
  {
    key: "ferramentas",
    label: "Ferramentas (ITSM / M365 / Office)",
    weight: 0.12,
    jobSignals: /\b(itsm|milvus|glpi|jira|zendesk|microsoft 365|office 365|excel|dbeaver|git)\b/i,
    cvSignals: [
      { pattern: /\bmilvus\b/i, evidence: "Registro, triagem e priorização de chamados via sistema Milvus." },
      { pattern: /\bmicrosoft 365\b/i, evidence: "Apoio a contas e permissões no Microsoft 365." },
      { pattern: /\bexcel\b/i, evidence: "Excel intermediário prático (fórmulas e tabelas dinâmicas)." },
      { pattern: /\bdbeaver\b/i, evidence: "Uso prático de DBeaver para análise em banco de dados." },
    ],
  },
  {
    key: "erp",
    label: "Sistemas ERP",
    weight: 0.1,
    jobSignals: /\b(erp|totvs|winthor|protheus|rm|sap|omie|wms|pdv)\b/i,
    cvSignals: [
      { pattern: /\b(winthor|totvs|wms|pdv)\b/i, evidence: "Sustentação de ERP TOTVS WinThor/WinThor Cloud, WMS, coletores e +40 PDVs." },
    ],
  },
  {
    key: "banco_dados",
    label: "Banco de dados",
    weight: 0.1,
    jobSignals: /\b(sql|oracle|postgresql|mysql|banco de dados|dbeaver)\b/i,
    cvSignals: [
      { pattern: /\b(oracle sql|postgresql|dbeaver)\b/i, evidence: "Consultas de análise em Oracle SQL com DBeaver e prática com PostgreSQL." },
    ],
  },
  {
    key: "formacao",
    label: "Formação acadêmica",
    weight: 0.08,
    jobSignals: /\b(ensino m[eé]dio|ensino t[eé]cnico|ensino superior|gradua[cç][aã]o|cursando|faculdade)\b/i,
    cvSignals: [
      { pattern: /\b(ensino m[eé]dio completo|jogos digitais|unifaticie)\b/i, evidence: "Ensino médio completo e graduação em Jogos Digitais em andamento (3º semestre, previsão dez/2027)." },
    ],
  },
  {
    key: "certificacoes",
    label: "Cursos e certificações",
    weight: 0.06,
    jobSignals: /\b(certifica[cç][aã]o|itil|aws|cisco|ccna|mcsa|curso)\b/i,
    cvSignals: [
      { pattern: /\b(analista de redes|sql\/oracle)\b/i, evidence: "Cursos informados: SQL/Oracle e Analista de Redes (em andamento). Sem certificações formais listadas." },
    ],
  },
  {
    key: "senioridade",
    label: "Senioridade",
    weight: 0.08,
    jobSignals: /\b(j[uú]nior|jr|n1|n2|pleno|s[eê]nior|sr|assistente|est[aá]gio)\b/i,
    cvSignals: [],
  },
  {
    key: "localizacao",
    label: "Localização e modalidade",
    weight: 0.07,
    jobSignals: /\b(remoto|remote|home office|h[ií]brido|presencial|feira de santana|s[aã]o paulo|manaus|belo horizonte|uberl[aâ]ndia)\b/i,
    cvSignals: [],
  },
  {
    key: "idiomas",
    label: "Idiomas",
    weight: 0.05,
    jobSignals: /\b(ingl[eê]s|espanhol|bil[ií]ngue|english|spanish)\b/i,
    cvSignals: [],
  },
];

/**
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.company]
 * @param {string} [params.location]
 * @param {string} [params.description]
 * @param {string} params.cvText
 * @param {string} [params.profileText]
 */
export function evaluateCompatibility({
  title,
  company = "",
  location = "",
  description = "",
  cvText,
  profileText = "",
}) {
  const jobText = `${title}\n${company}\n${location}\n${description}`.trim();
  const candidateText = `${cvText}\n${profileText}`.trim();

  const dimensions = [];
  const metRequirements = [];
  const missingRequirements = [];
  const risks = [];
  const improvementTips = [];

  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of DIMENSION_RULES) {
    let scoreRatio = 0.75; // neutra quando não exigido explicitamente
    let status = "nao_exigido";
    let evidence = "Não exigido explicitamente na descrição.";

    const demanded = dim.jobSignals.test(jobText);

    if (dim.key === "senioridade") {
      if (/\b(s[eê]nior|\bsr\b|especialista)\b/i.test(title)) {
        scoreRatio = 0.25;
        status = "nao_atende";
        evidence = "Vaga de nível Sênior; histórico atual em TI iniciou em maio/2026 (Assistente N1).";
        missingRequirements.push("Experiência sênior consolidada exigida pelo cargo.");
        risks.push("Senioridade acima do momento atual de carreira (N1/Júnior).");
      } else if (/\bpleno\b/i.test(title)) {
        scoreRatio = 0.55;
        status = "parcial";
        evidence = "Vaga Pleno; atuação N1/N2 com +40 PDVs e Oracle SQL oferece base parcial (stretch).";
        risks.push("Cargo Pleno pode exigir autonomia maior ou tempo de casa superior ao comprovado.");
      } else {
        scoreRatio = 0.95;
        status = "atende";
        evidence = "Alinhado ao nível Júnior / N1-N2 do candidato.";
        metRequirements.push("Senioridade compatível (Júnior / Assistente / N1-N2).");
      }
    } else if (dim.key === "localizacao") {
      if (/\b(remoto|remote|home office|home-office|todo brasil|feira de santana)\b/i.test(`${location} ${jobText}`)) {
        if (/\b(residir em s[aã]o paulo|manaus|belo horizonte|s[aã]o jos[eé] dos campos|uberl[aâ]ndia|s[aã]o jos[eé]\s*-\s*sc)\b/i.test(jobText)) {
          scoreRatio = 0.1;
          status = "nao_atende";
          evidence = "Vaga restringe residência a outra cidade/estado fora de Feira de Santana/BA.";
          missingRequirements.push("Residência na cidade/estado exigida pelo anúncio.");
          risks.push("Bloqueio geográfico incompatível com Feira de Santana/BA.");
        } else {
          scoreRatio = 1.0;
          status = "atende";
          evidence = "Modalidade remota ou presencial em Feira de Santana, compatível com o perfil.";
          metRequirements.push("Localização/modalidade compatível (Remoto ou Feira de Santana - BA).");
        }
      } else {
        scoreRatio = 0.5;
        status = "parcial";
        evidence = "Localização ou modalidade presencial não confirmada para Feira de Santana.";
        risks.push("Confirmar se a vaga aceita atuação 100% remota da Bahia.");
      }
    } else if (dim.key === "idiomas") {
      if (/\b(ingl[eê]s fluente|espanhol fluente|bil[ií]ngue)\b/i.test(jobText)) {
        scoreRatio = 0.1;
        status = "nao_atende";
        evidence = "A vaga exige fluência em idioma estrangeiro, não confirmada no perfil.";
        missingRequirements.push("Fluência em inglês/espanhol exigida na vaga.");
        risks.push("Requisito eliminatório de idioma fluente.");
      } else if (demanded) {
        scoreRatio = 0.6;
        status = "parcial";
        evidence = "Menciona idioma (básico/técnico); não há certificação de fluência no CV.";
        improvementTips.push("Informar honestamente seu nível real de leitura técnica caso seja questionado.");
      }
    } else if (dim.key === "formacao") {
      if (/\bensino superior completo\b/i.test(jobText)) {
        scoreRatio = 0.35;
        status = "nao_atende";
        evidence = "Vaga exige Ensino Superior completo; candidato cursa 3º semestre (previsão dez/2027).";
        missingRequirements.push("Ensino Superior completo (conclusão prevista para dez/2027).");
        risks.push("Exigência formal de diploma já concluído.");
      } else if (demanded) {
        scoreRatio = 0.9;
        status = "atende";
        evidence = "Ensino médio completo + graduação em Jogos Digitais em andamento (3º semestre).";
        metRequirements.push("Escolaridade compatível (Ensino Médio completo / Superior em andamento).");
      }
    } else if (dim.key === "erp" && /\b(protheus|totvs rm|sap basis)\b/i.test(jobText) && !/\bwinthor\b/i.test(jobText)) {
      scoreRatio = 0.3;
      status = "nao_atende";
      evidence = "Exige módulo ERP específico (Protheus/RM/SAP) distinto do TOTVS WinThor utilizado no perfil.";
      missingRequirements.push("Experiência prática no ERP específico pedido pela vaga (ex: Protheus/RM).");
      risks.push("Troca de ecossistema ERP pode exigir curva de aprendizado não atendida.");
    } else if (demanded) {
      const matched = dim.cvSignals.filter((sig) => sig.pattern.test(candidateText));
      if (matched.length > 0) {
        scoreRatio = Math.min(1.0, 0.75 + matched.length * 0.1);
        status = "atende";
        evidence = matched.map((m) => m.evidence).join(" ");
        metRequirements.push(`${dim.label}: ${matched[0].evidence}`);
      } else {
        scoreRatio = 0.35;
        status = "nao_atende";
        evidence = `Vaga solicita requisitos de ${dim.label.toLowerCase()} sem evidência direta no CV.`;
        missingRequirements.push(`Evidência prática em ${dim.label.toLowerCase()} conforme descrição.`);
      }
    } else {
      const matched = dim.cvSignals.filter((sig) => sig.pattern.test(candidateText));
      if (matched.length > 0) {
        scoreRatio = 0.85;
        evidence = `Base disponível no CV: ${matched[0].evidence}`;
      }
    }

    weightedSum += scoreRatio * dim.weight;
    totalWeight += dim.weight;

    dimensions.push({
      key: dim.key,
      label: dim.label,
      weight: dim.weight,
      score: Number((scoreRatio * 5).toFixed(1)),
      status,
      evidence,
    });
  }

  if (!/R\$\s*[\d.,]+/i.test(jobText)) {
    risks.push("Salário não divulgado no anúncio; validar faixa na triagem (referência: R$ 2.500/mês).");
  }

  if (improvementTips.length === 0) {
    improvementTips.push(
      "Destacar métricas verificadas: média de 178 chamados/mês no Milvus, +40 PDVs em 6 filiais e apoio a +30 sistemas.",
      "Enfatizar investigação de incidentes no WinThor com consultas Oracle SQL/DBeaver e diagnóstico de rede/hardware.",
    );
  }
  if (missingRequirements.length > 0) {
    improvementTips.push("Na entrevista, ser transparente sobre os pontos em desenvolvimento e focar na rápida adaptação no varejo.");
  }

  let rawScore = (weightedSum / totalWeight) * 5;
  const hardBlockersCount = dimensions.filter((d) => d.status === "nao_atende").length;
  if (hardBlockersCount >= 2) {
    rawScore = Math.min(rawScore, 2.75);
  }
  const finalScore = Number(Math.max(0, Math.min(5, rawScore)).toFixed(2));
  const whyMatches =
    metRequirements.length > 0
      ? `Aderência sustentada por ${metRequirements.length} bloco(s) comprovado(s) no seu currículo atual (${metRequirements
          .slice(0, 2)
          .map((m) => m.split(":")[0])
          .join(", ")}).`
      : "Pouca sobreposição direta identificada com os requisitos explícitos da vaga.";

  return {
    score: finalScore,
    whyMatches,
    metRequirements,
    missingRequirements,
    risks,
    improvementTips,
    dimensions,
  };
}
