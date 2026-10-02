// Dados de Garça-SP usados na simulação.
// Nomes e endereços das USFs vêm de listas públicas da prefeitura; as coordenadas
// são APROXIMADAS e estoques, filas e campanhas são FICTÍCIOS (apenas para a demo).

export const CENTRO_GARCA = { lat: -22.2125, lng: -49.6563 };

export interface Bairro {
  id: string;
  nome: string;
  lat: number;
  lng: number;
}

export type TipoPosto = "USF" | "Hospital";

export interface Posto {
  id: string;
  nome: string;
  /** Nome curto, falado pela URA. */
  apelido: string;
  tipo: TipoPosto;
  bairroId: string;
  endereco: string;
  lat: number;
  lng: number;
  /** Hora de abertura e fechamento (dias úteis). Ignorado se 24h. */
  abre: number;
  fecha: number;
  h24: boolean;
  /** Possui farmácia que dispensa remédios. */
  farmacia: boolean;
}

export interface Totem {
  id: string;
  nome: string;
  bairroId: string;
  lat: number;
  lng: number;
}

export interface Categoria {
  id: string;
  nome: string;
}

export interface Remedio {
  id: string;
  nome: string;
  /** Como a URA fala (ex.: com a dosagem por extenso). */
  falado: string;
  categoriaId: string;
  /** Palavras que o reconhecimento de voz aceita. */
  sinonimos: string[];
}

export interface Vacina {
  id: string;
  nome: string;
  publico: string;
}

export const BAIRROS: Bairro[] = [
  { id: "centro", nome: "Centro", lat: -22.2125, lng: -49.6563 },
  { id: "labienopolis", nome: "Labienópolis", lat: -22.205, lng: -49.648 },
  { id: "rebelo", nome: "Vila Rebelo", lat: -22.219, lng: -49.665 },
  { id: "williams", nome: "Williams", lat: -22.208, lng: -49.666 },
  { id: "eucaliptos", nome: "Jardim dos Eucaliptos", lat: -22.223, lng: -49.645 },
  { id: "sol-nascente", nome: "Jardim Sol Nascente", lat: -22.215, lng: -49.676 },
  { id: "araceli", nome: "Vila Araceli", lat: -22.201, lng: -49.66 },
  { id: "mariana", nome: "Vila Mariana", lat: -22.221, lng: -49.653 },
  { id: "jafa", nome: "Distrito de Jafa", lat: -22.285, lng: -49.71 },
];

/**
 * Páginas do menu de bairros na URA (no máximo 4 opções por página).
 * A tecla 5 avança para a próxima página.
 */
export const PAGINAS_BAIRRO: string[][] = [
  ["centro", "labienopolis", "rebelo", "williams"],
  ["eucaliptos", "sol-nascente", "araceli", "mariana"],
  ["jafa"],
];

export const POSTOS: Posto[] = [
  {
    id: "usf-rebelo",
    nome: "USF Dr. José Martinho Palermo",
    apelido: "Posto da Vila Rebelo",
    tipo: "USF",
    bairroId: "rebelo",
    endereco: "Rua Minas Gerais, 850 - Vila Rebelo",
    lat: -22.2196,
    lng: -49.6641,
    abre: 7,
    fecha: 17,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-eucaliptos",
    nome: "USF Maria Lucia Ferreira Cavallini",
    apelido: "Posto dos Eucaliptos",
    tipo: "USF",
    bairroId: "eucaliptos",
    endereco: "Rua Guarantã, 105 - Jardim dos Eucaliptos",
    lat: -22.2238,
    lng: -49.6462,
    abre: 7,
    fecha: 17,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-williams",
    nome: "USF Dr. Asdrubal Borges de Barros",
    apelido: "Posto do Williams",
    tipo: "USF",
    bairroId: "williams",
    endereco: "Rua Brigadeiro Machado, 224 - Williams",
    lat: -22.2074,
    lng: -49.6672,
    abre: 7,
    fecha: 17,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-helena",
    nome: "USF Helena Garcia Müller",
    apelido: "Posto Helena Müller",
    tipo: "USF",
    bairroId: "labienopolis",
    endereco: "Rua Gabriela, 138 - Labienópolis",
    lat: -22.2031,
    lng: -49.6455,
    abre: 7,
    fecha: 17,
    h24: false,
    farmacia: false,
  },
  {
    id: "usf-oeste",
    nome: "USF Dr. José Barbosa - Região Oeste",
    apelido: "Posto da Região Oeste",
    tipo: "USF",
    bairroId: "sol-nascente",
    endereco: "Rua Antônio Leal de Oliveira, 125 - Jardim Sol Nascente",
    lat: -22.2158,
    lng: -49.6772,
    abre: 7,
    fecha: 19,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-jafa",
    nome: "USF Dr. Ernesto Gaion",
    apelido: "Posto de Jafa",
    tipo: "USF",
    bairroId: "jafa",
    endereco: "Rua São Paulo, 16 - Distrito de Jafa",
    lat: -22.2846,
    lng: -49.7093,
    abre: 7,
    fecha: 16,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-araceli",
    nome: "USF Dr. Décio Nobre Moreira",
    apelido: "Posto da Vila Araceli",
    tipo: "USF",
    bairroId: "araceli",
    endereco: "Rua São Francisco de Assis, 120 - Vila Araceli",
    lat: -22.2003,
    lng: -49.6611,
    abre: 7,
    fecha: 17,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-labienopolis",
    nome: "USF Dr. Jurandir Ubirajara Guimarães",
    apelido: "Posto do Labienópolis",
    tipo: "USF",
    bairroId: "labienopolis",
    endereco: "Rua da Estação, 1117 - Labienópolis",
    lat: -22.2072,
    lng: -49.6505,
    abre: 7,
    fecha: 19,
    h24: false,
    farmacia: true,
  },
  {
    id: "usf-mariana",
    nome: "USF Vila Mariana",
    apelido: "Posto da Vila Mariana",
    tipo: "USF",
    bairroId: "mariana",
    endereco: "Vila Mariana (endereço ilustrativo)",
    lat: -22.2212,
    lng: -49.6527,
    abre: 7,
    fecha: 17,
    h24: false,
    farmacia: true,
  },
  {
    id: "santa-casa",
    nome: "Santa Casa de Garça - Pronto Atendimento",
    apelido: "Pronto atendimento da Santa Casa",
    tipo: "Hospital",
    bairroId: "centro",
    endereco: "Região central (endereço ilustrativo)",
    lat: -22.2118,
    lng: -49.6546,
    abre: 0,
    fecha: 24,
    h24: true,
    farmacia: false,
  },
];

export const TOTENS: Totem[] = [
  { id: "totem-praca", nome: "Totem da Praça Central", bairroId: "centro", lat: -22.2129, lng: -49.6571 },
  { id: "totem-rodoviaria", nome: "Totem da Rodoviária", bairroId: "williams", lat: -22.2095, lng: -49.6635 },
  { id: "totem-jafa", nome: "Orelhão Inteligente de Jafa", bairroId: "jafa", lat: -22.2853, lng: -49.7081 },
];

export const CATEGORIAS: Categoria[] = [
  { id: "coracao", nome: "Pressão e coração" },
  { id: "diabetes", nome: "Diabetes" },
  { id: "dor", nome: "Dor, febre e desidratação" },
  { id: "outros", nome: "Antibióticos, asma e estômago" },
];

export const REMEDIOS: Remedio[] = [
  { id: "losartana", nome: "Losartana 50mg", falado: "Losartana 50 miligramas", categoriaId: "coracao", sinonimos: ["losartana", "losartan"] },
  { id: "hidroclorotiazida", nome: "Hidroclorotiazida 25mg", falado: "Hidroclorotiazida", categoriaId: "coracao", sinonimos: ["hidroclorotiazida", "diurético"] },
  { id: "anlodipino", nome: "Anlodipino 5mg", falado: "Anlodipino", categoriaId: "coracao", sinonimos: ["anlodipino", "amlodipina"] },
  { id: "aas", nome: "AAS 100mg", falado: "A A S 100", categoriaId: "coracao", sinonimos: ["aas", "aspirina", "ácido acetilsalicílico"] },
  { id: "metformina", nome: "Metformina 850mg", falado: "Metformina 850", categoriaId: "diabetes", sinonimos: ["metformina", "glifage"] },
  { id: "glibenclamida", nome: "Glibenclamida 5mg", falado: "Glibenclamida", categoriaId: "diabetes", sinonimos: ["glibenclamida"] },
  { id: "insulina-nph", nome: "Insulina NPH", falado: "Insulina N P H", categoriaId: "diabetes", sinonimos: ["insulina nph", "nph", "insulina"] },
  { id: "insulina-regular", nome: "Insulina Regular", falado: "Insulina regular", categoriaId: "diabetes", sinonimos: ["insulina regular"] },
  { id: "dipirona", nome: "Dipirona 500mg", falado: "Dipirona", categoriaId: "dor", sinonimos: ["dipirona", "novalgina"] },
  { id: "paracetamol", nome: "Paracetamol 500mg", falado: "Paracetamol", categoriaId: "dor", sinonimos: ["paracetamol", "tylenol"] },
  { id: "ibuprofeno", nome: "Ibuprofeno 300mg", falado: "Ibuprofeno", categoriaId: "dor", sinonimos: ["ibuprofeno"] },
  { id: "soro", nome: "Sais de reidratação oral", falado: "Soro de reidratação oral", categoriaId: "dor", sinonimos: ["soro", "reidratação", "sais"] },
  { id: "amoxicilina", nome: "Amoxicilina 500mg", falado: "Amoxicilina", categoriaId: "outros", sinonimos: ["amoxicilina", "antibiótico"] },
  { id: "salbutamol", nome: "Salbutamol spray", falado: "Salbutamol, a bombinha de asma", categoriaId: "outros", sinonimos: ["salbutamol", "bombinha", "asma", "aerolin"] },
  { id: "omeprazol", nome: "Omeprazol 20mg", falado: "Omeprazol", categoriaId: "outros", sinonimos: ["omeprazol", "estômago"] },
  { id: "sulfato-ferroso", nome: "Sulfato ferroso", falado: "Sulfato ferroso", categoriaId: "outros", sinonimos: ["sulfato ferroso", "ferro", "anemia"] },
];

export const VACINAS: Vacina[] = [
  { id: "gripe", nome: "Gripe (Influenza)", publico: "idosos, gestantes e crianças de 6 meses a 5 anos" },
  { id: "covid", nome: "Covid-19 (atualização)", publico: "maiores de 60 anos e grupos prioritários" },
  { id: "dengue", nome: "Dengue", publico: "crianças e adolescentes de 10 a 14 anos" },
  { id: "hpv", nome: "HPV", publico: "meninas e meninos de 9 a 14 anos" },
];

export const remedioPorId = (id: string) => REMEDIOS.find((r) => r.id === id);
export const postoPorId = (id: string) => POSTOS.find((p) => p.id === id);
export const bairroPorId = (id: string) => BAIRROS.find((b) => b.id === id);
export const totemPorId = (id: string) => TOTENS.find((t) => t.id === id);
export const remediosDaCategoria = (categoriaId: string) =>
  REMEDIOS.filter((r) => r.categoriaId === categoriaId);

/** Estado inicial dos dados que mudam (estoque, fila, campanhas). */
export interface DadosVivos {
  estoque: Record<string, Record<string, number>>;
  espera: Record<string, number>;
  /** Interruptor manual do funcionário (ex.: falta de médico, reforma). */
  funcionando: Record<string, boolean>;
  vacinas: Record<string, string[]>;
}

export function dadosIniciais(): DadosVivos {
  const estoque: DadosVivos["estoque"] = {};
  const espera: DadosVivos["espera"] = {};
  const funcionando: DadosVivos["funcionando"] = {};
  const vacinas: DadosVivos["vacinas"] = {};

  POSTOS.forEach((posto, i) => {
    funcionando[posto.id] = true;
    espera[posto.id] = posto.tipo === "Hospital" ? 90 : [15, 40, 10, 25, 55, 5, 30, 20, 35][i % 9];
    vacinas[posto.id] = posto.farmacia ? (i % 2 === 0 ? ["gripe", "covid", "hpv"] : ["gripe", "dengue"]) : [];
    estoque[posto.id] = {};
    REMEDIOS.forEach((r, j) => {
      // Valores determinísticos com algumas faltas propositais para a demonstração.
      let qtd = posto.farmacia ? ((i * 7 + j * 13) % 9) * 15 : 0;
      if (r.id === "salbutamol") qtd = 0; // em falta na cidade toda
      if (r.id === "insulina-nph") qtd = posto.id === "usf-oeste" ? 12 : 0; // só em um posto
      estoque[posto.id][r.id] = qtd;
    });
  });

  return { estoque, espera, funcionando, vacinas };
}
