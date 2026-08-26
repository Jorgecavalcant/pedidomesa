# LGPD — Consentimento QR (PedidoMesa)

**Versão do texto:** `pm-qr-consent-v1`  
**Controlador:** estabelecimento · **Operador:** Tech42

## Texto na tela (checkbox desmarcado)

> Ao continuar, você autoriza o **[Nome do Estabelecimento]** a tratar seu **nome** e **celular** para identificar você nesta mesa, reunir seu pedido e permitir que você volte à mesa aberta pelo celular, até o garçom confirmar o fechamento.  
> Tratamento pela plataforma **PedidoMesa** (Tech42), como operadora. Não usamos seus dados para marketing.  
> Você pode pedir exclusão ou correção pelo canal do estabelecimento.  
> ☐ Li e concordo.

## Bases (art. 7º LGPD)

- **II** — execução do serviço (pedido na mesa)
- **I** — consentimento explícito (reforço + prova)
- Marketing: **proibido** sem consentimento separado

## Dados

Coletar: nome, celular E.164, evidência de consentimento, mesa/posições, pedido.  
Não coletar: CPF, e-mail, GPS, foto, cartão, biometria.

## Evidência

`sessao_id`, celular hash+últimos 4, versão do texto, timestamp UTC, estabelecimento_id, canal=`qr_mesa`.

## Reentrada

Celular + `device_token` + mesa ainda aberta + rate-limit. Corte PII na baixa/liberar.

## Checklist MUST pré-prod

- [ ] Aviso + checkbox + versão
- [ ] Persistência evidência
- [ ] Coleta mínima
- [ ] Política acessível
- [ ] Token sessão + cutoff
- [ ] Rate-limit
- [ ] Zero PII em logs
- [ ] Sem marketing com esses dados

*Tech 42 · advogado-digital-lgpd · 2026-08-25*
