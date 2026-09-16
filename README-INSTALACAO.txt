CHEVALIER GESTÃO — PUBLIC_HTML V1

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
   - index.php (entrada principal)
   - index.html (redireciona para index.php)
   - .htaccess
   - release.json
   - api/ (incluindo version.php)
   - assets/css/app.css e assets/css/update.css
   - assets/js/app.js e assets/js/update-manager.js
   - assets/img/favicon.svg
5. Abra o domínio e atualize o navegador com Ctrl+F5.
   A barra no topo avisa quando uma versão nova estiver no servidor.

Para gerar o zip localmente:
  bash scripts/pack-deploy.sh /tmp/chevalier.zip

BANCO MYSQL (Hostinger)
- Banco: u680963503_drgabriel
- Usuário: u680963503_drgabriel
- Depois do upload, abra /api/setup.php e informe a senha do phpMyAdmin.
- Isso cria a tabela app_state e passa a gravar os lançamentos no MySQL.
- Enquanto a senha não for informada, o sistema continua no localStorage do navegador.

IMPORTANTE
- Esta V1 é funcional. Com o setup do MySQL, os dados ficam no servidor.
- Ainda não há login multiusuário.
- Antes de uso clínico/financeiro definitivo, a próxima fase deve migrar persistência para backend/banco,
  implementar autenticação, auditoria e backup de servidor.
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
