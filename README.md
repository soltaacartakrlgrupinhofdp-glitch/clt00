# Site Ponto de Coleta (Vercel)

Sem Supabase. Os leads ficam no armazenamento da própria Vercel (Upstash Redis), criado dentro do painel da Vercel.

## Passo a passo
1. **Logo:** arquivo local `img/logo.jpg` (imagem enviada pelo usuário), exibido no site e no painel administrativo.
2. **GitHub:** suba esta pasta em um repositório.
3. **Vercel:** importe o repositório e faça o primeiro deploy.
4. **Armazenamento:** no projeto da Vercel, aba **Storage** → **Create Database** → escolha **Upstash (Redis)** → plano gratuito → conecte ao projeto. As variáveis de conexão são criadas sozinhas.
5. **Senha do painel:** já vem configurada como `593120`. Para trocar, crie `ADMIN_PASSWORD` em Settings → Environment Variables.
6. Faça **Redeploy**. O painel fica em `seusite.com/admin`.

## Consulta de CNPJ
O token já vem configurado em `api/_cnpj.js`. Mantenha o repositório do GitHub **privado**. Para trocar o token sem mexer no código, crie `CNPJ_API_TOKEN` em Settings → Environment Variables.

## WhatsApp
No `index.html`, troque `WA_NUMBER` (começo do script) pelo seu número: 55 + DDD + número, só dígitos.

## Imagem da página final (WhatsApp)
Coloque o arquivo em `img/banner.png`. Sem o arquivo, nenhuma imagem aparece.

## CPF
Configure `CPF_API_TOKEN` nas variáveis de ambiente da Vercel e faça Redeploy. Consulta no servidor, retorno exibido apenas no admin; inclui nome, nome da mãe, nascimento, idade calculada e aniversário. Se a API estiver indisponível, a ficha registra o status. Informe o tratamento de dados na política de privacidade e obtenha consentimento adequado. Troque a senha padrão do admin e o token exposto na conversa.


### CORREÇÃO: CPF não configurada
O status `não configurada` significa que a variável `CPF_API_TOKEN` não existe no ambiente da implantação.
Vercel > projeto > Settings > Environment Variables > Add New > CPF_API_TOKEN. Cole somente o token (sem URL e sem aspas), selecione Production e faça Redeploy.
O servidor monta `https://api.amnesiatecnologia.lat/?token=...&cpf=...`, interpreta `DADOS` e salva os campos no registro do lead. Não coloque o token no HTML, no GitHub ou em `NEXT_PUBLIC_`.
Cadastros antigos não são automaticamente atualizados: teste com um novo cadastro depois do Redeploy.
Como o token foi compartilhado, solicite sua rotação ao provedor.

## CPF pronto para uso
A chave fornecida está configurada como fallback no arquivo api/_cpf.js. Não é necessário cadastrar CPF_API_TOKEN na Vercel. A consulta ocorre somente no servidor ao enviar um NOVO cadastro. Para substituir a chave sem alterar o código, configure CPF_API_TOKEN. Atenção: a chave está visível no código-fonte do projeto e deve ser rotacionada se o repositório for público.
