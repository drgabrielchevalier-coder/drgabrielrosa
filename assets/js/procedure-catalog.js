/**
 * Catálogo de procedimentos odontológicos — clínicos e cirúrgicos.
 * Formato: [id, specialtyId, name, kind, price, extra, materialIds[]]
 * price/extra começam em 0 para você precificar depois (exceto seeds já usados).
 * kind: 'clinico' | 'cirurgico'
 * Componha tratamentos somando linhas (ex.: plantio + enxerto + coroa).
 */
window.CHEVALIER_PROCEDURE_CATALOG_VERSION = 2;

window.DENTAL_PROCEDURE_SPECIALTIES = [
  { id: 'cirurgia', name: 'Cirurgia' },
  { id: 'implante', name: 'Implante dentário' },
  { id: 'protese', name: 'Prótese dentária' },
  { id: 'endodontia', name: 'Endodontia' },
  { id: 'periodontia', name: 'Periodontia' },
  { id: 'clinica', name: 'Clínica geral / estética' },
  { id: 'ortodontia', name: 'Ortodontia' },
  { id: 'pediatria', name: 'Odontopediatria' },
  { id: 'diagnostico', name: 'Diagnóstico / imagem' },
  { id: 'hof', name: 'Harmonização orofacial' }
];

window.DENTAL_PROCEDURE_CATALOG = [
  /* —— Cirurgia —— */
  ['proc-exodontia-simples', 'cirurgia', 'Exodontia simples', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-exodontia-retida', 'cirurgia', 'Exodontia de dente retido / semi-incluso', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-sisos-simples', 'cirurgia', 'Exodontia de siso (simples)', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-sisos-cirurgico', 'cirurgia', 'Exodontia de siso (cirúrgica)', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-raiz-residual', 'cirurgia', 'Remoção de raiz residual', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-alveoloplastia', 'cirurgia', 'Alveoloplastia', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-freectomia', 'cirurgia', 'Frenectomia (labial / lingual)', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-biopsia', 'cirurgia', 'Biópsia (incisional / excisional)', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-abscesso', 'cirurgia', 'Drenagem de abscesso', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-sutura-complexa', 'cirurgia', 'Sutura / revisão pós-operatória', 'cirurgico', 0, 0, ['m4']],
  ['proc-ulectomia', 'cirurgia', 'Ulectomia / urotomia', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-apicectomia', 'cirurgia', 'Apicectomia', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-cisto', 'cirurgia', 'Remoção de cisto / tumores benignos', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-torus', 'cirurgia', 'Remoção de tórus / exostose', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-comunicacao-bs', 'cirurgia', 'Tratamento de comunicação buco-sinusal', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-osteotomia', 'cirurgia', 'Osteotomia / ostectomia', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-incisao-drenagem', 'cirurgia', 'Incisão e drenagem', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-remocao-corpo', 'cirurgia', 'Remoção de corpo estranho', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-plastia-vestibular', 'cirurgia', 'Plastia do vestíbulo / fundo de sulco', 'cirurgico', 0, 0, ['m4', 'm5']],

  /* —— Implante —— */
  ['p1', 'implante', 'Implante unitário (plantio)', 'cirurgico', 1500, 44, ['m1', 'm4', 'm5', 'm6']],
  ['p2', 'implante', 'Implante + enxerto (pacote)', 'cirurgico', 1700, 44, ['m1', 'm3', 'm4', 'm5', 'm6']],
  ['proc-implante-2estagio', 'implante', 'Reabertura / 2º estágio (cicatrizador)', 'cirurgico', 0, 0, ['m4', 'm11']],
  ['proc-enxerto-osseo', 'implante', 'Enxerto ósseo (particulado)', 'cirurgico', 0, 0, ['m3', 'm4', 'm5', 'm15']],
  ['proc-enxerto-bloco', 'implante', 'Enxerto em bloco', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-membrana', 'implante', 'Membrana / barreira (regeneração)', 'cirurgico', 0, 0, ['m15', 'm4']],
  ['proc-levantamento-seio-interno', 'implante', 'Levantamento de seio (abordagem interna)', 'cirurgico', 0, 0, ['m3', 'm4', 'm5', 'm15']],
  ['proc-levantamento-seio-externo', 'implante', 'Levantamento de seio (abordagem externa)', 'cirurgico', 0, 0, ['m3', 'm4', 'm5', 'm6', 'm15']],
  ['proc-expansao-crestal', 'implante', 'Expansão / split crest', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-cirurgia-guiada', 'implante', 'Cirurgia guiada (planejamento + guia)', 'cirurgico', 0, 0, ['m1', 'm4', 'm5']],
  ['proc-implante-imediato', 'implante', 'Implante imediato pós-exodontia', 'cirurgico', 0, 0, ['m1', 'm3', 'm4', 'm5']],
  ['proc-carga-imediata', 'implante', 'Carga imediata / provisório sobre implante', 'cirurgico', 0, 0, ['m2', 'm4']],
  ['proc-multi-unit', 'implante', 'Instalação de multi-unit / intermediário', 'cirurgico', 0, 0, ['m56', 'm4']],
  ['p5', 'implante', 'Protocolo por arcada (cirurgia)', 'cirurgico', 13000, 1900, ['m1', 'm4', 'm5', 'm6', 'm2']],
  ['proc-zigomatico', 'implante', 'Implante zigomático', 'cirurgico', 0, 0, ['m51', 'm4', 'm5', 'm6']],
  ['proc-regeneracao-guiada', 'implante', 'Regeneração óssea guiada (ROG)', 'cirurgico', 0, 0, ['m3', 'm15', 'm4', 'm5']],
  ['proc-enxerto-tecido-mole', 'implante', 'Enxerto de tecido mole / conjuntivo', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-implante-curto', 'implante', 'Implante curto / diameter reduzido', 'cirurgico', 0, 0, ['m1', 'm4', 'm5']],
  ['proc-remocao-implante', 'implante', 'Remoção / explante de implante', 'cirurgico', 0, 0, ['m4', 'm5', 'm6']],
  ['proc-mantenedor-espaco', 'implante', 'Mantenedor de espaço / healing', 'cirurgico', 0, 0, ['m4']],

  /* —— Prótese —— */
  ['p3', 'protese', 'Coroa sobre implante', 'clinico', 1500, 450, ['m7', 'm8']],
  ['p4', 'protese', 'Implante + coroa (pacote)', 'clinico', 2400, 450, ['m1', 'm4', 'm5', 'm6', 'm7', 'm8']],
  ['proc-coroa-unitaria', 'protese', 'Coroa unitária (dente natural)', 'clinico', 0, 450, []],
  ['proc-coroa-zirconia', 'protese', 'Coroa de zircônia', 'clinico', 0, 550, []],
  ['proc-coroa-metaloceramica', 'protese', 'Coroa metalocerâmica', 'clinico', 0, 420, []],
  ['proc-faceta-porcelana', 'protese', 'Faceta de porcelana / laminado', 'clinico', 0, 620, []],
  ['proc-faceta-resina', 'protese', 'Faceta em resina composta', 'clinico', 0, 0, []],
  ['proc-onlay-inlay', 'protese', 'Inlay / Onlay / Overlay', 'clinico', 0, 480, []],
  ['proc-protese-parcial', 'protese', 'Prótese parcial removível', 'clinico', 0, 800, []],
  ['proc-protese-total', 'protese', 'Prótese total (dentadura)', 'clinico', 0, 900, []],
  ['proc-protocolo-protetico', 'protese', 'Protocolo protético (arcada)', 'clinico', 0, 1900, []],
  ['proc-overdenture', 'protese', 'Overdenture sobre implantes', 'clinico', 0, 1200, []],
  ['proc-provisorio-implante', 'protese', 'Provisório sobre implante', 'clinico', 0, 180, ['m2']],
  ['proc-provisorio-dente', 'protese', 'Provisório em dente natural', 'clinico', 0, 120, []],
  ['proc-moldagem-implante', 'protese', 'Moldagem / transferência de implante', 'clinico', 0, 0, ['m7', 'm8']],
  ['proc-ajuste-oclusal', 'protese', 'Ajuste oclusal / reembasamento', 'clinico', 0, 0, []],
  ['proc-pilar-personalizado', 'protese', 'Pilar personalizado / Ti-Base', 'clinico', 0, 0, ['m62']],
  ['proc-cimentacao', 'protese', 'Cimentação / instalação protética', 'clinico', 0, 0, []],
  ['proc-nucleo-fundido', 'protese', 'Núcleo fundido', 'clinico', 0, 280, []],
  ['proc-ponte-fix', 'protese', 'Ponte fixa (elemento intermediário)', 'clinico', 0, 450, []],

  /* —— Endodontia —— */
  ['proc-endo-uni', 'endodontia', 'Tratamento endodôntico unirradicular', 'clinico', 0, 0, ['m4']],
  ['proc-endo-bi', 'endodontia', 'Tratamento endodôntico birradicular', 'clinico', 0, 0, ['m4']],
  ['proc-endo-multi', 'endodontia', 'Tratamento endodôntico multirradicular', 'clinico', 0, 0, ['m4']],
  ['proc-retrata-endo', 'endodontia', 'Retratamento endodôntico', 'clinico', 0, 0, ['m4']],
  ['proc-pulpectomia', 'endodontia', 'Pulpectomia / urgência endodôntica', 'clinico', 0, 0, ['m4']],
  ['proc-pulpotomia', 'endodontia', 'Pulpotomia', 'clinico', 0, 0, ['m4']],
  ['proc-clareamento-interno', 'endodontia', 'Clareamento interno', 'clinico', 0, 0, []],
  ['proc-pino-nucleo', 'endodontia', 'Pino / núcleo', 'clinico', 0, 0, []],
  ['proc-curativo-endo', 'endodontia', 'Curativo endodôntico / medicação intracanal', 'clinico', 0, 0, ['m4']],

  /* —— Periodontia —— */
  ['proc-raspagem-quadrante', 'periodontia', 'Raspagem / alisamento (por quadrante)', 'clinico', 0, 0, []],
  ['proc-raspagem-arcada', 'periodontia', 'Raspagem / alisamento (arcada)', 'clinico', 0, 0, []],
  ['proc-gengivectomia', 'periodontia', 'Gengivectomia / gengivoplastia', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-cirurgia-periodontal', 'periodontia', 'Cirurgia periodontal a retalho', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-aumento-coroa', 'periodontia', 'Aumento de coroa clínica', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-manutencao-perio', 'periodontia', 'Manutenção periodontal', 'clinico', 0, 0, []],
  ['proc-enxerto-gengival', 'periodontia', 'Enxerto gengival livre', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-regeneracao-perio', 'periodontia', 'Regeneração periodontal guiada', 'cirurgico', 0, 0, ['m3', 'm15', 'm4']],
  ['proc-splinting', 'periodontia', 'Contenção / splinting periodontal', 'clinico', 0, 0, []],

  /* —— Clínica geral / estética —— */
  ['p6', 'clinica', 'Restauração simples', 'clinico', 230, 32, []],
  ['proc-restauracao-composta', 'clinica', 'Restauração composta (2–3 faces)', 'clinico', 0, 0, []],
  ['proc-restauracao-complexa', 'clinica', 'Restauração complexa / reconstrução', 'clinico', 0, 0, []],
  ['proc-profilaxia', 'clinica', 'Profilaxia / limpeza', 'clinico', 0, 0, []],
  ['proc-aplicacao-fluor', 'clinica', 'Aplicação de flúor', 'clinico', 0, 0, []],
  ['proc-selante', 'clinica', 'Selante de fóssulas e fissuras', 'clinico', 0, 0, []],
  ['proc-clareamento-consultorio', 'clinica', 'Clareamento em consultório', 'clinico', 0, 0, []],
  ['proc-clareamento-caseiro', 'clinica', 'Clareamento caseiro (moldeira)', 'clinico', 0, 0, []],
  ['proc-consulta-avaliacao', 'clinica', 'Consulta / avaliação clínica', 'clinico', 0, 0, []],
  ['proc-planejamento-digital', 'clinica', 'Planejamento digital / mock-up', 'clinico', 0, 0, []],
  ['proc-urgencia', 'clinica', 'Atendimento de urgência', 'clinico', 0, 0, ['m4']],
  ['proc-placa-bruxismo', 'clinica', 'Placa de bruxismo / oclusal', 'clinico', 0, 180, []],
  ['proc-interconsulta', 'clinica', 'Interconsulta / segunda opinião', 'clinico', 0, 0, []],
  ['proc-dessensibilizacao', 'clinica', 'Dessensibilização dentinária', 'clinico', 0, 0, []],
  ['proc-remocao-carie', 'clinica', 'Remoção de cárie / proteção pulpar', 'clinico', 0, 0, []],
  ['proc-ajuste-protese', 'clinica', 'Ajuste de prótese / alívio', 'clinico', 0, 0, []],

  /* —— Ortodontia —— */
  ['proc-aparelho-fixo', 'ortodontia', 'Aparelho fixo (instalação por arcada)', 'clinico', 0, 0, []],
  ['proc-manutencao-orto', 'ortodontia', 'Manutenção ortodôntica mensal', 'clinico', 0, 0, []],
  ['proc-alinhador', 'ortodontia', 'Alinhadores / clear aligners (fase)', 'clinico', 0, 0, []],
  ['proc-contenção', 'ortodontia', 'Contenção ortodôntica', 'clinico', 0, 0, []],
  ['proc-expansor', 'ortodontia', 'Expansor / disjuntor', 'clinico', 0, 0, []],
  ['proc-remoção-aparelho', 'ortodontia', 'Remoção de aparelho fixo', 'clinico', 0, 0, []],

  /* —— Odontopediatria —— */
  ['proc-pedo-restauracao', 'pediatria', 'Restauração em dente decíduo', 'clinico', 0, 0, []],
  ['proc-pedo-exodontia', 'pediatria', 'Exodontia de dente decíduo', 'cirurgico', 0, 0, ['m4']],
  ['proc-pedo-pulpotomia', 'pediatria', 'Pulpotomia em decíduo', 'clinico', 0, 0, ['m4']],
  ['proc-pedo-aplicacao-fluor', 'pediatria', 'Aplicação de flúor (infantil)', 'clinico', 0, 0, []],
  ['proc-pedo-selante', 'pediatria', 'Selante infantil', 'clinico', 0, 0, []],
  ['proc-mantenedor-pedo', 'pediatria', 'Mantenedor de espaço', 'clinico', 0, 180, []],

  /* —— Diagnóstico / imagem —— */
  ['proc-radiografia', 'diagnostico', 'Radiografia periapical / interproximal', 'clinico', 0, 0, []],
  ['proc-panoramica', 'diagnostico', 'Radiografia panorâmica', 'clinico', 0, 0, []],
  ['proc-tomografia', 'diagnostico', 'Tomografia / CBCT (interpretação)', 'clinico', 0, 0, []],
  ['proc-fotos-clinicas', 'diagnostico', 'Documentação fotográfica clínica', 'clinico', 0, 0, []],
  ['proc-escaneamento', 'diagnostico', 'Escaneamento intraoral', 'clinico', 0, 0, []],

  /* —— HOF —— */
  ['proc-toxina', 'hof', 'Toxina botulínica (por área)', 'clinico', 0, 0, []],
  ['proc-preenchimento', 'hof', 'Preenchimento com ácido hialurônico', 'clinico', 0, 0, []],
  ['proc-bioestimulador', 'hof', 'Bioestimulador de colágeno', 'clinico', 0, 0, []],
  ['proc-bichectomia', 'hof', 'Bichectomia', 'cirurgico', 0, 0, ['m4', 'm5']],
  ['proc-lip-lift', 'hof', 'Lip lift / suporte labial', 'clinico', 0, 0, []],
  ['proc-fio-pdo', 'hof', 'Fios de sustentação (PDO)', 'clinico', 0, 0, []]
];
