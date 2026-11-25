// Testes da lógica de sub-rede (src/subnet.js).
// Rodam com "npm test" (vitest run), uma única vez e sem modo watch.
import { describe, it, expect } from 'vitest';
import {
  ipToInt,
  intToIp,
  prefixToMask,
  maskToPrefix,
  isContiguousMask,
  getNetworkAddress,
  getUsableHosts,
  calculateSubnet,
  parseInput,
  calculateFromInput,
  validateIPv4,
  validateMask,
  validatePrefix,
} from '../src/subnet.js';

/** Atalho: calcula a partir da entrada e falha o teste se a entrada for rejeitada. */
function calcular(ip, mascara) {
  const resposta = calculateFromInput(ip, mascara);
  expect(resposta.ok, resposta.error).toBe(true);
  return resposta.result;
}

describe('conversões', () => {
  it('converte IP em inteiro e de volta', () => {
    expect(ipToInt('0.0.0.0')).toBe(0);
    expect(ipToInt('255.255.255.255')).toBe(4294967295);
    expect(ipToInt('192.168.1.10')).toBe(3232235786);
    expect(intToIp(3232235786)).toBe('192.168.1.10');
  });

  it('converte prefixo em máscara e máscara em prefixo', () => {
    expect(intToIp(prefixToMask(0))).toBe('0.0.0.0');
    expect(intToIp(prefixToMask(8))).toBe('255.0.0.0');
    expect(intToIp(prefixToMask(26))).toBe('255.255.255.192');
    expect(intToIp(prefixToMask(32))).toBe('255.255.255.255');
    for (let prefixo = 0; prefixo <= 32; prefixo++) {
      expect(maskToPrefix(prefixToMask(prefixo))).toBe(prefixo);
    }
  });

  it('identifica máscaras com bits contínuos', () => {
    expect(isContiguousMask(ipToInt('255.255.255.0'))).toBe(true);
    expect(isContiguousMask(ipToInt('0.0.0.0'))).toBe(true);
    expect(isContiguousMask(ipToInt('255.255.255.255'))).toBe(true);
    expect(isContiguousMask(ipToInt('255.0.255.0'))).toBe(false);
    expect(isContiguousMask(ipToInt('255.255.255.1'))).toBe(false);
  });

  it('calcula o endereço de rede com AND bit a bit', () => {
    const rede = getNetworkAddress(ipToInt('192.168.1.130'), prefixToMask(26));
    expect(intToIp(rede)).toBe('192.168.1.128');
  });
});

describe('cálculo por prefixo', () => {
  it('/8', () => {
    expect(calcular('10.20.30.40/8')).toEqual({
      ip: '10.20.30.40',
      network: '10.0.0.0',
      broadcast: '10.255.255.255',
      firstHost: '10.0.0.1',
      lastHost: '10.255.255.254',
      totalAddresses: 16777216,
      usableHosts: 16777214,
      mask: '255.0.0.0',
      prefix: 8,
      cidr: '10.0.0.0/8',
      wildcard: '0.255.255.255',
    });
  });

  it('/16', () => {
    expect(calcular('172.16.45.7/16')).toMatchObject({
      network: '172.16.0.0',
      broadcast: '172.16.255.255',
      firstHost: '172.16.0.1',
      lastHost: '172.16.255.254',
      usableHosts: 65534,
      mask: '255.255.0.0',
      prefix: 16,
      wildcard: '0.0.255.255',
    });
  });

  it('/24', () => {
    expect(calcular('192.168.0.77/24')).toMatchObject({
      network: '192.168.0.0',
      broadcast: '192.168.0.255',
      firstHost: '192.168.0.1',
      lastHost: '192.168.0.254',
      usableHosts: 254,
      mask: '255.255.255.0',
      prefix: 24,
      wildcard: '0.0.0.255',
    });
  });

  it('/26', () => {
    expect(calcular('192.168.1.130/26')).toMatchObject({
      network: '192.168.1.128',
      broadcast: '192.168.1.191',
      firstHost: '192.168.1.129',
      lastHost: '192.168.1.190',
      usableHosts: 62,
      mask: '255.255.255.192',
      prefix: 26,
      wildcard: '0.0.0.63',
    });
  });

  it('/30', () => {
    expect(calcular('200.10.5.14/30')).toMatchObject({
      network: '200.10.5.12',
      broadcast: '200.10.5.15',
      firstHost: '200.10.5.13',
      lastHost: '200.10.5.14',
      usableHosts: 2,
      mask: '255.255.255.252',
      prefix: 30,
      wildcard: '0.0.0.3',
    });
  });

  it('/31 tem 2 hosts e nenhum broadcast (RFC 3021)', () => {
    expect(calcular('10.0.0.1/31')).toMatchObject({
      network: '10.0.0.0',
      broadcast: null,
      firstHost: '10.0.0.0',
      lastHost: '10.0.0.1',
      totalAddresses: 2,
      usableHosts: 2,
      mask: '255.255.255.254',
      prefix: 31,
      wildcard: '0.0.0.1',
    });
  });

  it('/32 tem 1 host, que é o próprio IP', () => {
    expect(calcular('8.8.4.4/32')).toMatchObject({
      network: '8.8.4.4',
      broadcast: null,
      firstHost: '8.8.4.4',
      lastHost: '8.8.4.4',
      totalAddresses: 1,
      usableHosts: 1,
      mask: '255.255.255.255',
      prefix: 32,
      wildcard: '0.0.0.0',
    });
  });

  it('/0 cobre todo o espaço IPv4', () => {
    expect(calcular('1.2.3.4/0')).toMatchObject({
      network: '0.0.0.0',
      broadcast: '255.255.255.255',
      usableHosts: 4294967294,
      mask: '0.0.0.0',
      wildcard: '255.255.255.255',
    });
  });

  it('getUsableHosts segue as regras especiais de /31 e /32', () => {
    expect(getUsableHosts(24)).toBe(254);
    expect(getUsableHosts(30)).toBe(2);
    expect(getUsableHosts(31)).toBe(2);
    expect(getUsableHosts(32)).toBe(1);
  });

  it('calculateSubnet aceita IP inteiro e prefixo diretamente', () => {
    expect(calculateSubnet(ipToInt('192.168.1.10'), 26).network).toBe('192.168.1.0');
  });
});

describe('formatos de entrada', () => {
  it('aceita notação CIDR', () => {
    expect(parseInput('192.168.1.10/26')).toEqual({
      ok: true,
      ipInt: ipToInt('192.168.1.10'),
      prefix: 26,
    });
  });

  it('aceita IP + máscara decimal com o mesmo resultado do CIDR', () => {
    expect(calcular('192.168.1.10', '255.255.255.192')).toEqual(calcular('192.168.1.10/26'));
  });

  it('aceita o prefixo no campo de máscara, com ou sem barra', () => {
    expect(calcular('192.168.1.10', '/26')).toEqual(calcular('192.168.1.10/26'));
    expect(calcular('192.168.1.10', '26')).toEqual(calcular('192.168.1.10/26'));
  });

  it('ignora espaços nas bordas', () => {
    expect(calcular('  192.168.1.10/24  ').network).toBe('192.168.1.0');
    expect(calcular(' 192.168.1.10 ', ' 255.255.255.0 ').network).toBe('192.168.1.0');
  });
});

describe('validação de IP', () => {
  it('aceita IPs válidos', () => {
    expect(validateIPv4('0.0.0.0')).toBeNull();
    expect(validateIPv4('192.168.1.10')).toBeNull();
    expect(validateIPv4('255.255.255.255')).toBeNull();
  });

  it.each([
    ['', 'Informe um endereço IPv4.'],
    ['   ', 'Informe um endereço IPv4.'],
    [undefined, 'Informe um endereço IPv4.'],
    ['192.168.1', 'IP inválido: o endereço deve ter 4 octetos separados por ponto'],
    ['192.168.1.10.5', 'IP inválido: o endereço deve ter 4 octetos separados por ponto'],
    ['192.168..10', 'IP inválido: há um octeto vazio'],
    ['192.168.1.', 'IP inválido: há um octeto vazio'],
    ['192.168.abc.10', 'IP inválido: o octeto "abc" não é um número inteiro'],
    ['192.168.-1.10', 'IP inválido: o octeto "-1" não é um número inteiro'],
    ['192.168.1.1e1', 'IP inválido: o octeto "1e1" não é um número inteiro'],
    ['192.168.01.10', 'IP inválido: o octeto "01" tem zero à esquerda'],
    ['256.0.0.1', 'IP inválido: o octeto 256 está acima de 255'],
    ['192.168.1.300', 'IP inválido: o octeto 300 está acima de 255'],
  ])('rejeita %j', (entrada, mensagem) => {
    expect(validateIPv4(entrada)).toContain(mensagem);
  });
});

describe('validação de máscara', () => {
  it('aceita todas as 33 máscaras válidas', () => {
    for (let prefixo = 0; prefixo <= 32; prefixo++) {
      expect(validateMask(intToIp(prefixToMask(prefixo)))).toBeNull();
    }
  });

  it.each([
    ['', 'Informe a máscara de sub-rede.'],
    ['255.255.255', 'Máscara inválida: o endereço deve ter 4 octetos'],
    ['255.255.256.0', 'Máscara inválida: o octeto 256 está acima de 255'],
    ['255.255.x.0', 'Máscara inválida: o octeto "x" não é um número inteiro'],
    ['255.0.255.0', 'Máscara inválida: os bits 1 devem ser contínuos'],
    ['255.255.255.1', 'Máscara inválida: os bits 1 devem ser contínuos'],
    ['0.255.255.255', 'Máscara inválida: os bits 1 devem ser contínuos'],
    ['255.255.255.193', 'Máscara inválida: os bits 1 devem ser contínuos'],
  ])('rejeita %j', (entrada, mensagem) => {
    expect(validateMask(entrada)).toContain(mensagem);
  });
});

describe('validação de prefixo', () => {
  it('aceita prefixos de 0 a 32, com ou sem barra', () => {
    expect(validatePrefix('0')).toBeNull();
    expect(validatePrefix('/24')).toBeNull();
    expect(validatePrefix('32')).toBeNull();
  });

  it.each([
    ['', 'Prefixo inválido: informe um número de 0 a 32'],
    ['/', 'Prefixo inválido: informe um número de 0 a 32'],
    ['33', 'Prefixo fora do intervalo: /33 deve estar entre 0 e 32'],
    ['/99', 'Prefixo fora do intervalo: /99 deve estar entre 0 e 32'],
    ['-1', 'Prefixo inválido: "-1" não é um número inteiro'],
    ['24.5', 'Prefixo inválido: "24.5" não é um número inteiro'],
    ['abc', 'Prefixo inválido: "abc" não é um número inteiro'],
  ])('rejeita %j', (entrada, mensagem) => {
    expect(validatePrefix(entrada)).toContain(mensagem);
  });
});

describe('entradas inválidas na calculadora', () => {
  it.each([
    [['', ''], 'Informe um endereço IPv4.'],
    [['300.1.1.1/24'], 'IP inválido: o octeto 300 está acima de 255'],
    [['192.168.1.10/33'], 'Prefixo fora do intervalo: /33 deve estar entre 0 e 32'],
    [['192.168.1.10/-1'], 'Prefixo inválido: "-1" não é um número inteiro'],
    [['192.168.1.10/'], 'Prefixo inválido: informe um número de 0 a 32'],
    [['192.168.1.10/24/8'], 'Entrada inválida: use apenas uma barra'],
    [['192.168.1.10'], 'Informe a máscara'],
    [['192.168.1.10', '   '], 'Informe a máscara'],
    [['192.168.1.10/24', '255.255.255.0'], 'Use apenas um formato'],
    [['192.168.1.10', '255.255.0.255'], 'Máscara inválida: os bits 1 devem ser contínuos'],
    [['192.168.1.10', '255.255.255.256'], 'Máscara inválida: o octeto 256 está acima de 255'],
    [['192.168.1.10', '40'], 'Prefixo fora do intervalo: /40 deve estar entre 0 e 32'],
  ])('rejeita %j', (argumentos, mensagem) => {
    const resposta = calculateFromInput(...argumentos);
    expect(resposta.ok).toBe(false);
    expect(resposta.error).toContain(mensagem);
    expect(resposta).not.toHaveProperty('result');
  });
});
