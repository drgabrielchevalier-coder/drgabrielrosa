CHEVALIER GESTÃO — PUBLIC_HTML V1

COMO INSTALAR NA HOSTINGER
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
- Configurações
