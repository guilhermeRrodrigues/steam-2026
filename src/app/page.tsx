import Link from "next/link";

const TELAS = [
  { href: "/ligar", icone: "📞", titulo: "Ligar", texto: "Simulador de um celular simples ligando para o número gratuito. Teclado, voz e legendas." },
  { href: "/totem", icone: "🗼", titulo: "Totem / orelhão", texto: "Ponto público em praças e no distrito de Jafa, para quem não tem telefone. Já sabe onde está." },
  { href: "/posto", icone: "🏥", titulo: "Painel do posto", texto: "O funcionário atualiza estoque de remédios, fila e vacinas. A URA responde na hora." },
  { href: "/prefeitura", icone: "📊", titulo: "Painel da prefeitura", texto: "Mapa da lotação, remédios em falta, demanda por bairro e chamadas ao vivo." },
  { href: "/sms", icone: "✉️", titulo: "Caixa de SMS", texto: "Os SMS que o cidadão recebe: endereço do posto e aviso de reposição de remédio." },
];

const FLUXO = [
  ["Cidadão", "Liga de qualquer telefone (até celular de botão) ou usa um totem. Grátis, sem internet."],
  ["URA", "Atendimento automático por teclas ou voz, com legendas e velocidade ajustável."],
  ["Dados dos postos", "Cada USF atualiza estoque, fila e vacinas num painel simples."],
  ["Prefeitura", "Vê onde falta remédio e onde a demanda cresce, para agir antes."],
];

export default function Inicio() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-center">
        <div className="space-y-4">
          <p className="text-sm font-bold text-marca uppercase tracking-wide">Garça-SP · cidade inteligente para todos</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight text-balance">
            Saúde Garça: informação de saúde por <span className="text-marca">telefone</span>, sem precisar de app
          </h1>
          <p className="text-lg text-tinta-2 text-pretty">
            Nem todo mundo tem smartphone ou internet. Por isso a cidade inteligente começa por um número gratuito e por
            totens públicos que dizem <strong>qual posto está mais indicado agora</strong>, <strong>se tem o remédio</strong>,
            quais <strong>vacinas</strong> estão disponíveis — e transferem para o <strong>SAMU</strong> em emergências.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/ligar" className="px-5 py-3 rounded-xl bg-marca text-white font-bold hover:bg-marca-forte">
              📞 Fazer uma ligação de teste
            </Link>
            <Link href="/totem" className="px-5 py-3 rounded-xl border border-borda bg-cartao font-bold hover:bg-marca-suave">
              Abrir o totem
            </Link>
          </div>
        </div>
        <div className="bg-cartao border border-borda rounded-2xl p-5">
          <p className="font-bold mb-2">Número de atendimento (simulado)</p>
          <p className="text-4xl font-bold tracking-wider text-marca">0800 156 1956</p>
          <ol className="mt-4 space-y-1 text-tinta-2">
            <li><strong>1</strong> · Posto mais indicado agora</li>
            <li><strong>2</strong> · Tem remédio?</li>
            <li><strong>3</strong> · Tempo de espera</li>
            <li><strong>4</strong> · Vacinas e horários</li>
            <li className="text-critico font-bold"><strong>0</strong> · Emergência → SAMU 192</li>
          </ol>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Telas da simulação</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {TELAS.map((t) => (
            <Link key={t.href} href={t.href} className="bg-cartao border border-borda rounded-2xl p-4 hover:border-marca transition-colors">
              <span aria-hidden className="text-3xl">{t.icone}</span>
              <h3 className="font-bold mt-2">{t.titulo}</h3>
              <p className="text-sm text-tinta-2 mt-1">{t.texto}</p>
            </Link>
          ))}
        </div>
        <p className="text-sm text-tinta-3 mt-3">
          Dica para a apresentação: abra o <strong>Painel do posto</strong> e o <strong>Ligar</strong> em abas lado a lado. Zere um
          remédio no posto e pergunte por ele na ligação — a resposta muda na hora.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {FLUXO.map(([titulo, texto], i) => (
          <div key={titulo} className="bg-cartao border border-borda rounded-2xl p-4">
            <span className="grid place-items-center size-8 rounded-full bg-marca-suave text-marca-forte font-bold">{i + 1}</span>
            <h3 className="font-bold mt-2">{titulo}</h3>
            <p className="text-sm text-tinta-2 mt-1">{texto}</p>
          </div>
        ))}
      </section>

      <section className="bg-cartao border border-borda rounded-2xl p-6 space-y-4">
        <h2 className="text-2xl font-bold">Como seria na vida real</h2>
        <div className="grid gap-6 md:grid-cols-2 text-tinta-2">
          <div>
            <h3 className="font-bold text-tinta">Telefonia</h3>
            <p>
              Um número 0800 ou o 156 da prefeitura ligado a uma plataforma de voz (ex.: Twilio, Zenvia). A mesma lógica desta
              simulação já gera as respostas no formato usado por essas plataformas: veja{" "}
              <a className="underline text-marca" href="/api/voz">/api/voz</a>.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-tinta">Dados de estoque</h3>
            <p>
              Integração com o sistema de assistência farmacêutica do SUS usado pelo município (ex.: Hórus) e com o e-SUS APS,
              em vez de digitação manual.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-tinta">Totens</h3>
            <p>
              Orelhões adaptados ou totens com botões grandes, alto-falante e fone, em praças, rodoviária e no distrito de
              Jafa. Funcionam também como ponto de wi-fi público.
            </p>
          </div>
          <div>
            <h3 className="font-bold text-tinta">Privacidade (LGPD)</h3>
            <p>
              O serviço não pede nome nem CPF. O telefone só é guardado para enviar o SMS pedido e é apagado depois. O painel da
              prefeitura vê apenas números agregados por bairro.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
