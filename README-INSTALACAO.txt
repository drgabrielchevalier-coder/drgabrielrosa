CHEVALIER GESTÃO — PUBLIC_HTML V1

COMO INSTALAR NA HOSTINGER
1. Abra o Gerenciador de Arquivos.
2. Entre na pasta public_html do domínio/subdomínio desejado.
3. Faça backup do conteúdo atual antes de substituir arquivos.
4. Envie o conteúdo desta pasta public_html preservando a estrutura:
   - index.html
   - .htaccess
   - assets/css/app.css
   - assets/js/app.js
   - assets/img/favicon.svg
5. Abra o domínio e atualize o navegador com Ctrl+F5.

IMPORTANTE
- Esta V1 é funcional e usa localStorage do navegador.
- Os dados ficam no dispositivo/navegador em que foram lançados.
- Ainda não há banco MySQL, login multiusuário ou sincronização entre dispositivos.
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
