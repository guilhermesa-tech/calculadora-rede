// Funções puras de validação e cálculo de sub-redes IPv4.
// Este módulo NÃO acessa o DOM: recebe textos/números e devolve dados,
// o que facilita testar tudo com o Vitest.

// ---------------------------------------------------------------------------
// Conversões entre texto e inteiro de 32 bits
// ---------------------------------------------------------------------------

/**
 * Converte um IPv4 em texto ("192.168.1.10") para um inteiro de 32 bits sem sinal.
 * Cada octeto ocupa 8 bits: o primeiro vai para os bits 31–24, o segundo
 * para 23–16 e assim por diante. Supõe que o texto já foi validado.
 */
export function ipToInt(ip) {
  return (
    ip
      .split('.')
      .reduce((acumulado, octeto) => (acumulado << 8) | Number(octeto), 0) >>> 0
  );
}

/**
 * Converte um inteiro de 32 bits de volta para a notação decimal com pontos.
 * Desloca o número para a direita e usa "AND 255" para isolar cada octeto.
 */
export function intToIp(numero) {
  return [24, 16, 8, 0].map((deslocamento) => (numero >>> deslocamento) & 255).join('.');
}

// ---------------------------------------------------------------------------
// Validação
// Cada função devolve uma mensagem de erro (string) ou null quando está tudo certo.
// ---------------------------------------------------------------------------

/** Valida um único octeto (número inteiro de 0 a 255, sem zeros à esquerda). */
function validateOctet(octeto) {
  if (octeto === '') {
    return 'há um octeto vazio (verifique se não sobrou ponto a mais ou a menos)';
  }
  if (!/^\d+$/.test(octeto)) {
    return `o octeto "${octeto}" não é um número inteiro`;
  }
  if (octeto.length > 1 && octeto.startsWith('0')) {
    return `o octeto "${octeto}" tem zero à esquerda`;
  }
  if (Number(octeto) > 255) {
    return `o octeto ${octeto} está acima de 255`;
  }
  return null;
}

/** Valida a estrutura de um IPv4: quatro octetos válidos separados por ponto. */
function validateDottedDecimal(texto) {
  const octetos = texto.split('.');
  if (octetos.length !== 4) {
    return 'o endereço deve ter 4 octetos separados por ponto (ex: 192.168.1.10)';
  }
  for (const octeto of octetos) {
    const erro = validateOctet(octeto);
    if (erro) return erro;
  }
  return null;
}

/** Valida um endereço IPv4. Retorna a mensagem de erro ou null. */
export function validateIPv4(texto) {
  const ip = String(texto ?? '').trim();
  if (ip === '') return 'Informe um endereço IPv4.';
  const erro = validateDottedDecimal(ip);
  return erro ? `IP inválido: ${erro}.` : null;
}

/** Valida um prefixo CIDR (inteiro de 0 a 32). Aceita "26" ou "/26". */
export function validatePrefix(texto) {
  const prefixo = String(texto ?? '').trim().replace(/^\//, '');
  if (prefixo === '') return 'Prefixo inválido: informe um número de 0 a 32 após a barra.';
  if (!/^\d+$/.test(prefixo)) {
    return `Prefixo inválido: "${prefixo}" não é um número inteiro (use de 0 a 32).`;
  }
  if (Number(prefixo) > 32) {
    return `Prefixo fora do intervalo: /${Number(prefixo)} deve estar entre 0 e 32.`;
  }
  return null;
}

/**
 * Uma máscara válida tem todos os bits 1 à esquerda e todos os bits 0 à direita.
 * Truque: invertendo a máscara obtemos a wildcard (ex: 0.0.0.63 = 0b111111).
 * A wildcard de uma máscara válida é sempre da forma 2^n − 1, e para esses
 * números "wildcard AND (wildcard + 1)" é sempre zero.
 */
export function isContiguousMask(mascaraInt) {
  const wildcard = ~mascaraInt >>> 0;
  return (wildcard & (wildcard + 1)) === 0;
}

/** Valida uma máscara em notação decimal (ex: 255.255.255.192). */
export function validateMask(texto) {
  const mascara = String(texto ?? '').trim();
  if (mascara === '') return 'Informe a máscara de sub-rede.';
  const erro = validateDottedDecimal(mascara);
  if (erro) return `Máscara inválida: ${erro}.`;
  if (!isContiguousMask(ipToInt(mascara))) {
    return 'Máscara inválida: os bits 1 devem ser contínuos a partir da esquerda (ex: 255.255.255.192).';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Conversões entre prefixo e máscara
// ---------------------------------------------------------------------------

/**
 * Gera a máscara a partir do prefixo: "prefixo" bits 1 seguidos de zeros.
 * Ex: /26 → 11111111.11111111.11111111.11000000 = 255.255.255.192.
 * O caso /0 é tratado à parte porque, em JavaScript, deslocar 32 bits
 * equivale a deslocar 0 (o deslocamento é feito módulo 32).
 */
export function prefixToMask(prefixo) {
  if (prefixo === 0) return 0;
  return (0xffffffff << (32 - prefixo)) >>> 0;
}

/** Conta quantos bits 1 a máscara tem, ou seja, o tamanho do prefixo. */
export function maskToPrefix(mascaraInt) {
  let prefixo = 0;
  for (let bit = 31; bit >= 0; bit--) {
    if ((mascaraInt >>> bit) & 1) prefixo++;
  }
  return prefixo;
}

// ---------------------------------------------------------------------------
// Cálculos da sub-rede
// ---------------------------------------------------------------------------

/**
 * Endereço de rede = IP AND máscara.
 * O AND bit a bit mantém os bits da parte de rede (onde a máscara tem 1)
 * e zera os bits da parte de host (onde a máscara tem 0).
 */
export function getNetworkAddress(ipInt, mascaraInt) {
  return (ipInt & mascaraInt) >>> 0;
}

/** Wildcard = NOT máscara: bits 1 exatamente na parte de host. */
export function getWildcard(mascaraInt) {
  return ~mascaraInt >>> 0;
}

/**
 * Broadcast = rede OR wildcard.
 * O OR liga todos os bits da parte de host, gerando o último endereço da faixa.
 */
export function getBroadcastAddress(redeInt, mascaraInt) {
  return (redeInt | getWildcard(mascaraInt)) >>> 0;
}

/**
 * Quantidade de hosts utilizáveis.
 * - /32: um único endereço (rota de host).
 * - /31: 2 hosts, pois em enlaces ponto a ponto não há rede nem broadcast (RFC 3021).
 * - demais: 2^(bits de host) − 2 (descontando rede e broadcast).
 */
export function getUsableHosts(prefixo) {
  if (prefixo === 32) return 1;
  if (prefixo === 31) return 2;
  return 2 ** (32 - prefixo) - 2;
}

/**
 * Calcula todos os dados da sub-rede a partir de um IP e de um prefixo.
 * Endereços são devolvidos como texto; quantidades, como número.
 * Em /31 e /32 o campo "broadcast" é null, pois não existe broadcast nesses casos.
 */
export function calculateSubnet(ipInt, prefixo) {
  const mascara = prefixToMask(prefixo);
  const rede = getNetworkAddress(ipInt, mascara);
  const ultimoEndereco = getBroadcastAddress(rede, mascara);

  // Em /31 e /32 todos os endereços da faixa são utilizáveis;
  // nos demais, o primeiro (rede) e o último (broadcast) ficam de fora.
  const semBroadcast = prefixo >= 31;
  const primeiroHost = semBroadcast ? rede : rede + 1;
  const ultimoHost = semBroadcast ? ultimoEndereco : ultimoEndereco - 1;

  return {
    ip: intToIp(ipInt),
    network: intToIp(rede),
    broadcast: semBroadcast ? null : intToIp(ultimoEndereco),
    firstHost: intToIp(primeiroHost),
    lastHost: intToIp(ultimoHost),
    totalAddresses: 2 ** (32 - prefixo),
    usableHosts: getUsableHosts(prefixo),
    mask: intToIp(mascara),
    prefix: prefixo,
    cidr: `${intToIp(rede)}/${prefixo}`,
    wildcard: intToIp(getWildcard(mascara)),
  };
}

// ---------------------------------------------------------------------------
// Leitura da entrada do usuário
// ---------------------------------------------------------------------------

/**
 * Interpreta o campo de máscara, que aceita:
 * - máscara decimal: "255.255.255.192"
 * - prefixo: "/26" ou "26"
 * Retorna { prefix } ou { error }.
 */
function parseMaskField(texto) {
  if (texto.includes('.')) {
    const erro = validateMask(texto);
    return erro ? { error: erro } : { prefix: maskToPrefix(ipToInt(texto)) };
  }
  const erro = validatePrefix(texto);
  return erro ? { error: erro } : { prefix: Number(texto.replace(/^\//, '')) };
}

/**
 * Lê a entrada do usuário e devolve o IP e o prefixo já validados.
 * Formatos aceitos:
 * - CIDR no campo de IP: parseInput("192.168.1.10/26")
 * - IP + máscara decimal: parseInput("192.168.1.10", "255.255.255.192")
 * Retorna { ok: true, ipInt, prefix } ou { ok: false, error }.
 */
export function parseInput(ipTexto, mascaraTexto = '') {
  const entrada = String(ipTexto ?? '').trim();
  const mascara = String(mascaraTexto ?? '').trim();

  if (entrada === '') return { ok: false, error: 'Informe um endereço IPv4.' };

  const [ip, prefixoCidr, ...resto] = entrada.split('/');
  if (resto.length > 0) {
    return { ok: false, error: 'Entrada inválida: use apenas uma barra (ex: 192.168.1.10/26).' };
  }

  const erroIp = validateIPv4(ip);
  if (erroIp) return { ok: false, error: erroIp };

  const temCidr = prefixoCidr !== undefined;
  if (temCidr && mascara !== '') {
    return {
      ok: false,
      error: 'Use apenas um formato: CIDR (192.168.1.10/26) ou IP + máscara, não os dois.',
    };
  }
  if (!temCidr && mascara === '') {
    return {
      ok: false,
      error: 'Informe a máscara: use CIDR (ex: 192.168.1.10/26) ou preencha o campo de máscara.',
    };
  }

  const { prefix, error } = parseMaskField(temCidr ? `/${prefixoCidr}` : mascara);
  if (error) return { ok: false, error };

  return { ok: true, ipInt: ipToInt(ip), prefix };
}

/**
 * Função de alto nível usada pela interface: valida a entrada e calcula a sub-rede.
 * Retorna { ok: true, result } ou { ok: false, error }.
 */
export function calculateFromInput(ipTexto, mascaraTexto = '') {
  const entrada = parseInput(ipTexto, mascaraTexto);
  if (!entrada.ok) return entrada;
  return { ok: true, result: calculateSubnet(entrada.ipInt, entrada.prefix) };
}
