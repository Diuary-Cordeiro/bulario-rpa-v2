# 💊 Bulário RPA V2

> Automação para consulta, identificação e download de bulas de medicamentos no Bulário Eletrônico da ANVISA.

![Node.js](https://img.shields.io/badge/Node.js-RPA-339933?logo=node.js&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-Automação-2EAD33?logo=playwright&logoColor=white)
![ANVISA](https://img.shields.io/badge/Fonte-ANVISA-005CA9)
![Status](https://img.shields.io/badge/Status-Em%20produção-success)
![Repository](https://img.shields.io/badge/Repositório-Privado-blueviolet)

---

## 📌 Sobre o projeto

O **Bulário RPA V2** é uma aplicação desenvolvida para automatizar consultas ao **Bulário Eletrônico da ANVISA**, reduzindo a necessidade de pesquisas e downloads manuais.

O sistema utiliza uma base de medicamentos contendo seus respectivos registros ANVISA e realiza automaticamente:

- consulta pelo **número de registro ANVISA**;
- identificação do medicamento encontrado;
- localização da bula disponível;
- preferência pela **bula profissional**;
- utilização da **bula do paciente** quando necessário;
- download automático do PDF;
- prevenção de downloads duplicados;
- registro do resultado de cada consulta;
- novas tentativas em falhas temporárias;
- retomada da execução a partir do progresso salvo.

---

## ⚙️ Fluxo de funcionamento

```text
Base de medicamentos
        │
        ▼
Número de registro ANVISA
        │
        ▼
Bulário Eletrônico
        │
        ▼
Consulta automática
        │
        ├── Não encontrado → registra ocorrência
        │
        └── Encontrado
                │
                ▼
         Localiza as bulas
                │
                ├── Profissional → prioridade
                │
                └── Paciente → fallback
                │
                ▼
          Download do PDF
                │
                ▼
        Registro do resultado
                │
                ▼
         Próximo medicamento
```

---

## 🔎 Estratégia de busca

A consulta oficial do RPA é realizada utilizando o:

**Número de registro ANVISA**

O nome comercial do medicamento **não é utilizado como fallback de pesquisa**, evitando associações incorretas entre produtos com nomes semelhantes.

---

## 🛡️ Tolerância a falhas

O RPA foi desenvolvido para continuar funcionando mesmo diante de falhas temporárias.

Entre os mecanismos implementados estão:

- múltiplas tentativas de processamento;
- tratamento de falhas temporárias;
- recuperação da sessão do navegador;
- reconstrução do navegador quando necessário;
- preservação do progresso;
- continuidade para o próximo medicamento;
- registro dos erros para auditoria.

Uma falha individual não deve interromper todo o lote.

---

## 🔄 Retomada automática

O progresso da execução é armazenado localmente.

Caso o RPA seja:

- interrompido manualmente;
- reiniciado;
- fechado inesperadamente;
- ou encontre uma falha durante a execução;

o próximo processamento pode continuar a partir do índice preservado, evitando reiniciar toda a base.

---

## ⏱️ Processamento em lote

O sistema foi projetado para executar consultas em lotes controlados.

Configuração operacional:

```text
Consultas por lote: 150
```

O limite representa **consultas realizadas**, e não necessariamente PDFs baixados.

Um medicamento pode resultar em:

- download realizado;
- bula já existente;
- medicamento não encontrado;
- erro após as tentativas disponíveis.

---

## 🖥️ Painel de controle

O projeto possui um painel local para acompanhamento e operação do RPA.

O painel permite visualizar:

- estado da execução;
- próximo índice;
- medicamento atual;
- registro ANVISA;
- progresso do lote;
- quantidade processada;
- sucessos;
- problemas;
- histórico de consultas;
- erros registrados;
- situação do agendamento.

Também permite:

- executar o RPA manualmente;
- interromper a execução;
- iniciar o agendamento;
- parar o agendamento;
- configurar o horário diário.

---

## 📂 Estrutura do projeto

```text
bulario-rpa-v2/
│
├── data/
│   └── medicamentos.csv
│
├── painel/
│   ├── public/
│   │   └── index.html
│   └── server.js
│
├── scripts/
│   ├── executar-agora.sh
│   ├── iniciar-agendamento.sh
│   ├── parar-agendamento.sh
│   ├── parar-execucao.sh
│   └── status-agendamento.sh
│
├── src/
│   ├── browser.js
│   ├── config.js
│   ├── index.js
│   ├── medicamentos.js
│   ├── processarMedicamento.js
│   ├── progress.js
│   ├── results.js
│   ├── schedule.js
│   ├── scheduleConfig.js
│   ├── status.js
│   ├── testBrowser.js
│   └── timing.js
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 🚫 Arquivos não versionados

Por segurança e organização, determinados arquivos gerados durante a operação não são enviados ao Git.

Entre eles:

```text
node_modules/
out/bulas/
out/screenshots/
logs/

out/progress.json
out/status.json
out/schedule.json
out/results.csv
```

Dessa forma, o repositório mantém principalmente o **código, configurações e arquivos necessários para reconstrução do projeto**.

---

## 🚀 Instalação

Após clonar o projeto:

```bash
npm install
```

Isso instala as dependências definidas no `package.json`.

---

## ▶️ Execução

A execução manual pode ser iniciada pelo painel ou pelos scripts disponibilizados no projeto.

Exemplo:

```bash
./scripts/executar-agora.sh
```

Para iniciar o agendamento:

```bash
./scripts/iniciar-agendamento.sh
```

Para verificar seu estado:

```bash
./scripts/status-agendamento.sh
```

---

## 💾 Versionamento

O projeto utiliza Git para controle de versões.

Fluxo básico após alterações importantes:

```bash
git status
git add .
git commit -m "Descricao da alteracao"
git push
```

Isso permite manter um histórico das versões estáveis e recuperar versões anteriores quando necessário.

---

## ⚠️ Observação

Este projeto realiza automação sobre um serviço externo.

Alterações futuras na interface, estrutura ou comportamento do **Bulário Eletrônico da ANVISA** podem exigir adaptações no processo de automação.

---

## 🏥 Fonte dos dados

As consultas e bulas utilizadas pelo sistema são provenientes do **Bulário Eletrônico da Agência Nacional de Vigilância Sanitária — ANVISA**.

---

<div align="center">

### Bulário RPA V2

**Automação • Controle • Auditoria • Segurança**

Desenvolvido para automatizar e organizar o processo de obtenção de bulas oficiais.

</div>
