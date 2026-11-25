# Calculadora de Sub-rede IPv4

Ferramenta web para calcular os dados de uma sub-rede IPv4 a partir de um endereço e de uma máscara.
O projeto também serve de laboratório para praticar **CI/CD**: tem lint, testes automatizados e build
estático pronto para publicar no GitHub Pages.

## Funcionalidades

- Entrada em **notação CIDR** (`192.168.1.10/26`) ou **IP + máscara decimal** (`192.168.1.10` e `255.255.255.192`).
  O campo de máscara também aceita o prefixo (`/26` ou `26`).
- Mostra:
  - endereço de rede
  - broadcast
  - primeiro e último host
  - quantidade de hosts utilizáveis
  - máscara decimal
  - prefixo CIDR
  - wildcard
- Validação com mensagens de erro claras:
  - IP inválido
  - octeto acima de 255
  - máscara inválida (bits não contínuos)
  - prefixo fora de 0 a 32
- Casos especiais tratados corretamente:
  - **/31**: 2 hosts utilizáveis e sem broadcast (enlaces ponto a ponto, RFC 3021)
  - **/32**: 1 host (rota de host)
- Cálculo ao clicar em **Calcular** ou ao apertar **Enter**.
- Interface responsiva com tema escuro inspirado em painel de NOC.

## Tecnologias

- [Vite](https://vite.dev/): servidor de desenvolvimento e build (template *vanilla*: JavaScript puro, sem frameworks)
- [Vitest](https://vitest.dev/): testes unitários
- [ESLint](https://eslint.org/): análise estática com *flat config* (`eslint.config.js`)
- HTML e CSS puros

## Pré-requisitos

- Node.js na versão definida em [`.nvmrc`](.nvmrc) (LTS atual). Com o [nvm](https://github.com/nvm-sh/nvm):

  ```bash
  nvm install
  nvm use
  ```

## Como rodar localmente

```bash
# Instala as dependências exatamente como estão no package-lock.json
npm ci

# Servidor de desenvolvimento com recarga automática (http://localhost:5173)
npm run dev

# Roda os testes uma única vez (sem modo watch, ideal para pipelines)
npm test

# Verifica o código com o ESLint
npm run lint

# Gera o build de produção na pasta dist/
npm run build

# Serve o build gerado para conferência local
npm run preview
```

O `vite.config.js` usa `base: './'`, então o conteúdo de `dist/` funciona no GitHub Pages
em qualquer nome de repositório (os caminhos dos arquivos são relativos).

## Estrutura de pastas

```text
calculadora-rede/
├── index.html           # Página única com o formulário e a área de resultado
├── src/
│   ├── subnet.js        # Funções puras de cálculo e validação (sem acesso ao DOM)
│   ├── main.js          # Interface: lê os campos, chama subnet.js e mostra o resultado
│   └── style.css        # Tema escuro responsivo
├── tests/
│   └── subnet.test.js   # Testes do Vitest para cálculos e validações
├── eslint.config.js     # Configuração do ESLint (flat config)
├── vite.config.js       # Configuração do Vite (base relativa para o GitHub Pages)
├── package.json         # Dependências e scripts npm
├── package-lock.json    # Versões travadas das dependências (usado pelo npm ci)
├── .nvmrc               # Versão do Node.js usada no projeto
└── .gitignore           # Arquivos ignorados pelo Git
```

## Como o cálculo funciona

Cada endereço IPv4 é tratado como um número inteiro de 32 bits:

| Dado              | Operação                                  |
| ----------------- | ----------------------------------------- |
| Endereço de rede  | `IP AND máscara`                          |
| Wildcard          | `NOT máscara`                             |
| Broadcast         | `rede OR wildcard`                        |
| Hosts utilizáveis | `2^(32 − prefixo) − 2` (exceto /31 e /32) |

Os detalhes estão comentados em [`src/subnet.js`](src/subnet.js).
