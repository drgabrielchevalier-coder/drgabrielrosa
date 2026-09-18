DR GABRIEL ROSA — GESTÃO CLÍNICA

============================================================
DEPLOY AUTOMÁTICO (recomendado)
============================================================
Assim o Cursor (e você) só precisam dar push no GitHub; a
Hostinger publica sozinha.

1) No hPanel, abra o site do subdomínio:
   drgabrielrosa.implantstore.com.br
2) Vá em: Avançado → Git (ou Advanced → Git).
3) Clique em "Connect with GitHub" / "Continuar com GitHub".
4) Instale o app Hostinger no GitHub e libere o repositório:
   drgabrielchevalier-coder/drgabrielrosa
5) Configure:
   - Branch: main
   - Diretório: raiz (public_html) — não use uma subpasta
6) Clique em Deploy (primeira publicação).
7) Deixe Auto-deployment ligado (padrão).

A partir daí: todo push/merge em main atualiza o site.
A senha do MySQL fica só no servidor em api/config.local.php
(não vai para o Git).

A home pública é home.php (landing do Instagram).
O sistema de gestão continua em /login.php → /index.php.

LANDING (Instagram bio)
- Edite no topo de home.php:
  $LANDING_WHATSAPP = '5521XXXXXXXXX';  // só dígitos
  $LANDING_INSTAGRAM = 'https://instagram.com/seuusuario';
- Enquanto o WhatsApp estiver vazio, o CTA usa o e-mail do Lattes.

Depois do primeiro deploy Git, abra /api/setup.php se ainda
não conectou o banco.

OPCIONAL — token da API (para o agente publicar via MCP)
- hPanel → Perfil → API Tokens → criar token
- No Cursor Cloud Environment, salve o secret HOSTINGER_API_TOKEN
  (assim hosting_deployStaticWebsite / Git settings deixam de
  depender só do OAuth interativo)

OPCIONAL — backup via GitHub Actions (FTP)
- Secrets do repositório: FTP_SERVER, FTP_USERNAME, FTP_PASSWORD
- Workflow: .github/workflows/deploy-hostinger.yml
- Só use se o Git do hPanel não estiver disponível.

============================================================
INSTALAÇÃO MANUAL (upload zip)
============================================================
1. Abra o Gerenciador de Arquivos.
2. Entre na pasta public_html do domínio/subdomínio desejado.
3. Faça backup do conteúdo atual antes de substituir arquivos.
4. Envie o conteúdo desta pasta public_html preservando a estrutura:
   - home.php (landing pública — Instagram bio)
   - login.php (tela de entrada do sistema)
   - index.php (painel — protegido por sessão)
   - index.html (redireciona para home.php)
   - .htaccess
   - release.json
   - api/ (incluindo version.php e auth.php)
   - assets/css/app.css, update.css, login.css e landing.css
   - assets/js/app.js, update-manager.js e landing.js
   - assets/img/ (logo, favicon e retrato)
5. Abra o domínio e atualize o navegador com Ctrl+F5.
   A barra no topo avisa quando uma versão nova estiver no servidor.

LOGIN
- Usuário padrão: gabriel
- Senha padrão: chevalier  (troque imediatamente em produção)
- Para trocar, crie/edite api/config.local.php com:
  define('AUTH_USER', 'seu_usuario');
  define('AUTH_PASS_HASH', password_hash('sua-senha-forte', PASSWORD_DEFAULT));
  // ou, menos seguro: define('AUTH_PASS', 'sua-senha');
- Nunca envie config.local.php para o GitHub.

OPENAI (v2.5+)
- Em Configurações → OpenAI, cole a chave sk-… e teste a conexão
  (grava em api/config.local.php no servidor).
- Ou copie api/config.local.php.example → api/config.local.php e defina OPENAI_API_KEY.
- Custos de procedimento, cobrança e tomografia usam só a API OpenAI (sem resposta pronta).

SEGURANÇA (v2.1+)
- Sessão HttpOnly + Secure (HTTPS) + SameSite=Lax
- Token CSRF em POST/DELETE das APIs (state, price-sync, uploads, IA, setup)
- Rate-limit de login (8 tentativas / 15 min por IP+usuário)
- Headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS
- .htaccess bloqueia listagem de pastas, config.local.php e PHP em /uploads
- Tabela auth_audit registra logins (ok/falha) e logout quando o MySQL está ativo
- Setup do banco exige login e não sobrescreve config.local.php existente

Para gerar o zip localmente:
  bash scripts/pack-deploy.sh /tmp/chevalier.zip

BANCO MYSQL (Hostinger)
- Banco: u680963503_drgabriel
- Usuário: u680963503_drgabriel
- Depois do upload, abra /api/setup.php e informe a senha do phpMyAdmin.
- Isso cria as tabelas app_state e auth_audit e passa a gravar os lançamentos no MySQL.
- Enquanto a senha não for informada, o sistema continua no localStorage do navegador.

IMPORTANTE
- Com MySQL configurado, os dados ficam no servidor (app_state).
- Ainda não há login multiusuário.
- Troque a senha padrão e use AUTH_PASS_HASH antes de uso clínico definitivo.
- Nunca envie api/config.local.php para o GitHub.

BASE FUNCIONAL
- Dashboard
- Pacientes
- Clínicas
- Procedimentos
- Prestação de serviço
- Particular
- Prótese/Laboratório
- Recebíveis
- Custos
- Folha
- Relatórios
- Materiais
- Estoque
- Banco de dados (custos / procedimentos)
- Configurações
- Barra de atualização de versão
