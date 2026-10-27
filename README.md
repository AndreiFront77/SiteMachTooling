# Mach Tooling

Site institucional da Mach Tooling, desenvolvido com HTML, CSS e JavaScript, com formulário de solicitação de orçamento integrado a uma função serverless da Vercel.

## Visão geral

- Página institucional responsiva.
- Página de Política de Privacidade.
- Formulário de orçamento com validação no navegador e no servidor.
- Upload opcional de arquivos técnicos.
- Envio das solicitações por e-mail usando a API do Resend.
- Proteções de segurança configuradas no `vercel.json`, incluindo cabeçalhos HTTP e cache de assets.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Node.js 18+
- Vercel Functions
- [Busboy](https://github.com/mscdex/busboy) para processamento do formulário multipart
- [Resend](https://resend.com/) para envio de e-mails

## Executar localmente

Instale as dependências:

```bash
npm install
```

Para visualizar apenas as páginas estáticas, abra o `index.html` no navegador.

Para testar também a função do formulário:

```bash
npx vercel dev
```

O site ficará disponível no endereço informado pelo Vercel CLI, normalmente `http://localhost:3000`.

## Configuração

### Dados públicos da empresa

Edite [`assets/js/config.js`](assets/js/config.js) e preencha somente informações validadas pela Mach Tooling:

- WhatsApp, telefone e e-mail;
- endereço, CNPJ e link do Google Maps;
- redes sociais;
- chave pública do Cloudflare Turnstile, se o antispam for utilizado.

### Variáveis do servidor

Copie `.env.example` para `.env.local` durante o desenvolvimento ou configure as variáveis em **Vercel > Settings > Environment Variables**:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `RESEND_API_KEY` | Sim | Chave da API do Resend. |
| `MAIL_TO` | Sim | Destinatário(s) das solicitações, separados por vírgula. |
| `MAIL_FROM` | Sim | Remetente usando um domínio verificado no Resend. |
| `ALLOWED_ORIGIN` | Não | Origem autorizada do site, por exemplo `https://www.exemplo.com.br`. |
| `TURNSTILE_SECRET_KEY` | Não | Chave secreta do Cloudflare Turnstile. |

Nunca publique chaves ou outros segredos no navegador ou no repositório.

## Deploy na Vercel

1. Importe este repositório em [vercel.com](https://vercel.com/).
2. Selecione **Other** como framework, sem comando de build.
3. Configure as variáveis de ambiente descritas acima.
4. Verifique o domínio usado em `ALLOWED_ORIGIN`.
5. Faça um teste completo do formulário, incluindo uma solicitação com e sem anexo.

O arquivo [`vercel.json`](vercel.json) já define as regras de segurança, o cache dos assets e o limite de execução da função [`api/contato.js`](api/contato.js).

## Estrutura do projeto

```text
.
├── api/contato.js             # Função serverless do formulário
├── assets/css/site.css        # Estilos do site
├── assets/img/                # Imagens e favicon
├── assets/js/config.js        # Dados públicos configuráveis
├── assets/js/site.js          # Interações da interface
├── index.html                 # Página principal
├── privacidade.html           # Política de Privacidade
├── robots.txt                 # Regras para robôs de busca
├── sitemap.xml                # Sitemap do site
└── vercel.json                # Configuração de deploy e cabeçalhos
```

## Antes da publicação oficial

- Preencher e validar os dados oficiais em `assets/js/config.js`.
- Configurar e testar o Resend e o destinatário do formulário.
- Substituir imagens ilustrativas por materiais aprovados, quando disponíveis.
- Revisar a Política de Privacidade com a assessoria jurídica.
- Atualizar `robots.txt`, `sitemap.xml` e a URL absoluta da imagem Open Graph para o domínio final.
- Remover eventuais marcações de homologação ou `noindex` antes de liberar o domínio público.
