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
