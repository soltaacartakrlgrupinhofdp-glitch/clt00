# Configuração do TikTok Pixel
1. Abra index.html e procure DBP58N3C77U8NDES2GU0.
2. Substitua pelo ID do Pixel do TikTok Events Manager (não pelo token da Events API).
3. Publique no GitHub e Vercel.
4. Teste um cadastro válido no TikTok Events Manager > Test Events.
O evento Lead é disparado apenas após o endpoint /api/lead confirmar o cadastro; sem enviar CPF, CNPJ, WhatsApp ou e-mail nos parâmetros do evento.
Em produção, implemente consentimento de rastreamento conforme a LGPD antes de carregar o Pixel.
