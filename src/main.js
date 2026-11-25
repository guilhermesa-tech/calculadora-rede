// Camada de interface: lê os campos, chama as funções de src/subnet.js
// e mostra o resultado ou a mensagem de erro. Nenhum cálculo é feito aqui.
import { calculateFromInput } from './subnet.js';
import './style.css';

const formulario = document.querySelector('#form-calculo');
const campoIp = document.querySelector('#campo-ip');
const campoMascara = document.querySelector('#campo-mascara');
const mensagemErro = document.querySelector('#mensagem-erro');
const secaoResultado = document.querySelector('#resultado');
const etiquetaCidr = document.querySelector('#resultado-cidr');
const listaResultado = document.querySelector('#lista-resultado');
const notaResultado = document.querySelector('#nota-resultado');

const formatoNumero = new Intl.NumberFormat('pt-BR');

// Ordem e rótulos dos cartões de resultado
const CAMPOS_RESULTADO = [
  { chave: 'network', rotulo: 'Endereço de rede', destaque: true },
  { chave: 'broadcast', rotulo: 'Broadcast', destaque: true },
  { chave: 'firstHost', rotulo: 'Primeiro host' },
  { chave: 'lastHost', rotulo: 'Último host' },
  { chave: 'usableHosts', rotulo: 'Hosts utilizáveis' },
  { chave: 'mask', rotulo: 'Máscara decimal' },
  { chave: 'prefix', rotulo: 'Prefixo CIDR' },
  { chave: 'wildcard', rotulo: 'Wildcard' },
];

/** Converte um valor do resultado no texto exibido no cartão. */
function formatarValor(chave, resultado) {
  const valor = resultado[chave];
  if (chave === 'usableHosts') return formatoNumero.format(valor);
  if (chave === 'prefix') return `/${valor}`;
  if (chave === 'broadcast' && valor === null) {
    return resultado.prefix === 31 ? 'Não se aplica (RFC 3021)' : 'Não se aplica';
  }
  return valor;
}

/** Explicação extra para os casos especiais /31 e /32. */
function obterNota(prefixo) {
  if (prefixo === 31) {
    return 'Enlace ponto a ponto (RFC 3021): os 2 endereços são utilizáveis e não há endereço de broadcast.';
  }
  if (prefixo === 32) {
    return 'Rota de host: a sub-rede contém apenas este endereço.';
  }
  return '';
}

/** Cria um cartão (rótulo + valor) usando textContent, sem injetar HTML. */
function criarCartao({ chave, rotulo, destaque }, resultado) {
  const cartao = document.createElement('div');
  cartao.className = destaque ? 'dado dado-destaque' : 'dado';

  const termo = document.createElement('dt');
  termo.textContent = rotulo;

  const valor = document.createElement('dd');
  valor.textContent = formatarValor(chave, resultado);
  if (resultado[chave] === null) valor.classList.add('indisponivel');

  cartao.append(termo, valor);
  return cartao;
}

function mostrarResultado(resultado) {
  etiquetaCidr.textContent = resultado.cidr;
  listaResultado.replaceChildren(
    ...CAMPOS_RESULTADO.map((campo) => criarCartao(campo, resultado)),
  );

  const nota = obterNota(resultado.prefix);
  notaResultado.textContent = nota;
  notaResultado.hidden = nota === '';

  secaoResultado.hidden = false;
}

function mostrarErro(mensagem) {
  mensagemErro.textContent = mensagem;
  mensagemErro.hidden = false;
  secaoResultado.hidden = true;
  campoIp.setAttribute('aria-invalid', 'true');
}

function limparErro() {
  mensagemErro.textContent = '';
  mensagemErro.hidden = true;
  campoIp.removeAttribute('aria-invalid');
}

function calcular() {
  const resposta = calculateFromInput(campoIp.value, campoMascara.value);
  if (!resposta.ok) {
    mostrarErro(resposta.error);
    return;
  }
  limparErro();
  mostrarResultado(resposta.result);
}

// O evento "submit" cobre tanto o clique no botão quanto o Enter nos campos
formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular();
});

// Ao editar qualquer campo, a mensagem de erro antiga deixa de valer
formulario.addEventListener('input', limparErro);
