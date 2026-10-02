# Saúde Garça — informação de saúde por telefone, sem precisar de app

Projeto STEAM 2026 · Garça-SP, cidade inteligente **para todos**.

Um app de celular deixaria de fora quem não tem smartphone ou internet. Por isso a proposta é um **número gratuito** (0800/156) e **totens/orelhões públicos** com atendimento automático (URA) por **teclado ou voz**, que responde:

| Tecla | Função |
|---|---|
| 1 | Posto de saúde **mais indicado agora**: considera distância **e** fila (um posto um pouco mais longe com fila curta ganha de um vizinho lotado). À noite indica o pronto atendimento 24h. |
| 2 | **Tem remédio?** Diz em qual posto aberto tem. Se estiver em falta em toda a cidade, oferece **SMS quando chegar**. |
| 3 | **Tempo de espera** nos postos próximos. |
| 4 | **Vacinas** em campanha e horários. |
| 0 | **Emergência** → transfere para o SAMU 192. |
| 9 / * | Repetir / voltar ao menu. |

Recursos de acessibilidade: legendas de tudo o que é falado, voz mais lenta, botões grandes de alto contraste no totem, fonte Atkinson Hyperlegible (feita para baixa visão) e reconhecimento de voz ("tem dipirona?", "moro na Vila Araceli", "emergência").

## Telas

| Rota | O que é |
|---|---|
| `/` | Apresentação do projeto e "como seria na vida real" |
| `/ligar` | Celular simples ligando para o serviço (tons DTMF reais, voz, legendas) |
| `/totem` | Totem/orelhão público (`/totem?id=totem-jafa`, `totem-praca`, `totem-rodoviaria`) com botão de emergência |
| `/posto` | Painel do funcionário: estoque, fila, vacinas, posto aberto/fechado |
| `/prefeitura` | Mapa da lotação, remédios em falta, demanda por bairro, ligações ao vivo, hora simulada |
| `/sms` | Caixa de SMS simulada |
| `/api/voz` | A mesma URA respondendo em **TwiML** (formato de plataformas de telefonia como Twilio) |

## Roteiro para a apresentação (5 minutos)

1. Abra **/posto** e **/ligar** lado a lado (duas abas ou duas janelas).
2. Em /ligar, clique em 📞, tecle **1** (Centro) → **2** (remédios) → **4** → **2**: "Salbutamol está em falta". Tecle **1** para pedir aviso por SMS.
3. Em /posto, some **+10** em Salbutamol. Abra **/sms**: a mensagem "chegou Salbutamol" já está lá.
4. Volte em /ligar e digite (ou fale) "tem bombinha de asma?" → agora "tem sim!".
5. Em **/totem?id=totem-jafa**, mostre que o orelhão do distrito já sabe onde está e indica o posto de Jafa. Aperte **EMERGÊNCIA**.
6. Em **/prefeitura**, clique em "Simular dia movimentado" e mostre o mapa, as faltas e a emergência no log. Troque a hora simulada para **23h** e ligue de novo: a URA indica a Santa Casa (24h).

Dica: use Chrome ou Edge (têm voz em português e reconhecimento de voz). Se o navegador não tiver voz, as legendas continuam funcionando.

## Stack (custo zero)

- **Next.js 16 + TypeScript + Tailwind CSS 4** — deploy direto na Vercel.
- **Zustand + localStorage** — os dados ficam no navegador e as abas se sincronizam sozinhas (evento `storage`). Sem banco de dados, sem chaves.
- **Web Speech API** — voz (pt-BR) e reconhecimento de fala nativos do navegador.
- **Web Audio API** — tons de teclado DTMF e toque de chamada.
- **Leaflet + OpenStreetMap** — mapa gratuito, sem chave de API.
- **Vitest** — testes da URA.

A lógica da URA (`src/lib/ivr/machine.ts`) é uma **função pura**: recebe a sessão, a tecla e os dados e devolve o que falar e os efeitos (SMS, aviso, SAMU). Por isso o mesmo código serve o simulador, o totem e a rota de telefonia real.

```
src/
  app/            páginas (ligar, totem, posto, prefeitura, sms) e api/voz
  components/     teclado, mapa, gráficos, legendas
  data/garca.ts   bairros, USFs, totens, remédios, vacinas
  lib/ivr/        máquina de estados da URA + testes
  lib/geo.ts      distância (haversine) e ranking por tempo total
  lib/store.ts    estado da cidade (estoque, fila, ligações, SMS)
```

## Rodar e publicar

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # testes da URA
npm run build    # mesmo build da Vercel
```

```bash
npm run test:e2e # testes de estabilidade no navegador (precisa de "npm run build" antes)
```

Os testes de ponta a ponta (`e2e/`) simulam o que já derrubou a página em computadores reais: tradução automática do Chrome/Edge, microfone sem permissão, reconhecimento de voz com erro, dados salvos corrompidos, troca de tela no meio do zoom do mapa e da ligação. O GitHub Actions (`.github/workflows/ci.yml`) roda tudo a cada push.

Se algo der errado mesmo assim, só o bloco afetado (mapa, legendas, voz) mostra "indisponível" e a ligação continua; erros maiores mostram uma tela em português que tenta se recuperar sozinha.

**Vercel:** em vercel.com → *Add New → Project* → importe este repositório do GitHub. O preset Next.js é detectado sozinho; não há variáveis de ambiente. Cada push gera um novo deploy.

## Sobre os dados

Nomes e endereços das USFs vêm de listas públicas da Prefeitura de Garça. As **coordenadas são aproximadas** e **estoques, filas, campanhas e ligações são fictícios**, apenas para a demonstração. Em emergência real, ligue **192**.

## Como seria na vida real

- **Telefonia:** número 0800/156 numa plataforma de voz (Twilio, Zenvia…) apontando para `/api/voz`.
- **Dados:** integração com o sistema de assistência farmacêutica do SUS usado pelo município (ex.: Hórus) e com o e-SUS APS, em vez de digitação.
- **Totens:** orelhões adaptados com botões grandes e alto-falante em praças, rodoviária e no distrito de Jafa.
- **LGPD:** sem nome nem CPF; o telefone só é usado para o SMS pedido; a prefeitura vê apenas números agregados.
