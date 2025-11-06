# 🚀 Sistema de Eventos (Microsserviços)

[cite_start]Este é o projeto final da disciplina de **Arquiteturas de Software**[cite: 1], implementando um sistema de gerenciamento de eventos. A solução é construída com uma arquitetura de microsserviços, orquestrada com Docker Compose e focada em escalabilidade e separação de responsabilidades.

## 🎯 Objetivo

[cite_start]O sistema permite que usuários pesquisem eventos, realizem inscrições, façam check-in (com suporte offline), cancelem inscrições e emitam certificados de participação[cite: 8, 9, 10, 16].

## 🏛️ Arquitetura

A solução é dividida nos seguintes microsserviços, cada um rodando em seu próprio contêiner Docker:

* **`gateway` (Nginx):** Ponto de entrada único (API Gateway). Responsável por rotear as requisições para o microsserviço correto.
* **`db` (PostgreSQL):** Banco de dados relacional centralizado (embora em uma arquitetura de microsserviços pura, cada serviço poderia ter seu próprio banco).
* [cite_start]**`api-usuarios` (Python/FastAPI):** Gerencia o cadastro (`POST /usuarios`) e autenticação (`POST /auth`)[cite: 21, 22].
* [cite_start]**`api-eventos` (Python/FastAPI):** Gerencia eventos, inscrições (`GET /eventos`, `POST /inscricoes`) e presenças (`POST /presencas`)[cite: 23, 25, 26].
* [cite_start]**`api-certificados` (Python/FastAPI):** Responsável pela emissão (`POST /certificados`) e validação (`GET /certificados/{id}`) de certificados[cite: 28, 29].
* [cite_start]**`api-notificacoes` (Node.js/Express):** Serviço para envio de e-mails assíncronos (inscrição, cancelamento, etc.)[cite: 19, 30]. [cite_start]Cumpre o requisito de mais de uma linguagem[cite: 90].

## 🛠️ Tecnologias Utilizadas

* **Backend:** Python 3.11 (FastAPI), Node.js (Express)
* **Banco de Dados:** PostgreSQL
* **Orquestração:** Docker & Docker Compose
* **API Gateway:** Nginx
* **Segurança:** JWT (JSON Web Tokens) para autenticação de rotas.
* **Requisitos:** `passlib[bcrypt]` (hashing de senha), `python-jose[cryptography]` (JWT).

## 🏃 Como Executar o Projeto

Este projeto é 100% containerizado. A única dependência na sua máquina local é o **Docker Desktop**.

### 1. Pré-requisitos

* [Git](https://git-scm.com/)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (com o Docker Engine e Docker Compose)

### 2. Configuração do Ambiente

1.  Clone este repositório:
    ```bash
    git clone <url-do-seu-repositorio>
    cd <nome-do-projeto>
    ```

2.  Crie o arquivo de variáveis de ambiente:
    * Este projeto usa um arquivo `.env` para carregar segredos (senhas de banco, chaves de JWT).
    * Copie o arquivo de exemplo `.env.example` para um novo arquivo chamado `.env`.
    ```bash
    # No Windows (PowerShell)
    Copy-Item .env.example .env
    
    # No Linux/macOS
    cp .env.example .env
    ```
    > **Importante:** O arquivo `.env` **nunKEINE** deve ser enviado ao GitHub. Ele já está incluído no `.gitignore`.

### 3. Subindo os Contêineres

1.  **Buildar as imagens** (só é necessário na primeira vez ou quando um `Dockerfile` muda):
    ```bash
    docker compose build
    ```

2.  **Iniciar todos os serviços** (em modo detached `-d`):
    ```bash
    docker compose up -d
    ```

### 4. Acessando a Aplicação

Após os contêineres iniciarem, a aplicação estará disponível:

* **API Gateway:** `http://localhost:80`
* **Serviços (via Gateway):**
    * `http://localhost/usuarios`
    * `http://localhost/eventos`
    * `http://localhost/certificados`
    * `http://localhost/emails`
* **Banco de Dados (para debug):** `localhost:5432`

### 5. Parando os Contêineres

Para parar todos os serviços em execução:
```bash
docker compose down