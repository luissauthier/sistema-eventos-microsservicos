<div align="center">
    <img width="500" height="500" alt="logo-email" src="https://github.com/user-attachments/assets/ede47c5f-4205-473e-a571-b3985a06b496" />
    <br/>
    <br/>
    <h1>NexStage</h1>
    <p>
        <b>Sistema de Gestão de Eventos Baseado em Microsserviços</b>
    </p>
    <p>
        Uma solução arquitetural robusta para administração de eventos, controle de presença e emissão de certificados.
    </p>
</div>

<br/>

## Visão Geral

O **NexStage** é uma plataforma distribuída desenvolvida para oferecer alta disponibilidade e escalabilidade na gestão do ciclo de vida de eventos corporativos e acadêmicos. Construído sobre uma arquitetura de microsserviços, o sistema desacopla domínios de negócio críticos para garantir resiliência e facilidade de manutenção.

A solução integra interfaces web para gestão administrativa e pública, juntamente com aplicações desktop (Electron) com capacidades offline-first para controle de acesso e credenciamento em ambientes com conectividade restrita.

---
## Tecnologias utilizadas

### Frontend & Desktop
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

### Backend & API
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![Nginx](https://img.shields.io/badge/nginx-%23009639.svg?style=for-the-badge&logo=nginx&logoColor=white)

### Banco de Dados & ORM
![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
![SQLite](https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)

### DevOps & Infraestrutura
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![Docker Compose](https://img.shields.io/badge/docker%20compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

## Arquitetura técnica

O ecossistema é orquestrado via Docker e composto pelos seguintes módulos fundamentais:

| Serviço | Tecnologia | Responsabilidade |
| :--- | :--- | :--- |
| **API Gateway** | Nginx | Ponto único de entrada, roteamento reverso e balanceamento de carga. |
| **Serviço de Usuários** | Python (FastAPI) | Gestão de identidade, autenticação (JWT) e controle de acesso (RBAC). |
| **Serviço de Eventos** | Python (FastAPI) | Core do negócio: criação de eventos, inscrições e gestão de agenda. |
| **Serviço de Certificados** | Python | Geração assíncrona, validação e armazenamento de certificados digitais. |
| **Serviço de Notificações** | Node.js | Dispatcher de comunicações transacionais via e-mail. |
| **Portal Web** | React.js | Interface frontend para administradores e participantes. |
| **App Local** | Electron/React | Aplicação desktop para check-in com sincronização de dados e modo offline. |

---

## Recursos corporativos

### Segurança e conformidade
* Autenticação centralizada via tokens JWT.
* Isolamento de contextos de banco de dados por microsserviço.
* Sanitização de dados e validação estrita de esquemas (Pydantic/Joi).

### Resiliência e performance
* **Offline-First:** O aplicativo desktop (`app-local`) mantém a operação de check-in mesmo sem conexão à internet, sincronizando dados automaticamente quando a rede é restabelecida.
* **Comunicação Assíncrona:** Arquitetura preparada para processamento em segundo plano (geração de certificados e envios de e-mail).

### Escalabilidade
* Containerização completa via Docker.
* Configuração pronta para orquestração (Docker Compose incluído, adaptável para Kubernetes).

---

## Instalação e Implantação

Para provisionar o ambiente de desenvolvimento ou produção localmente, siga as diretrizes abaixo.

### Pré-requisitos

* Docker Engine 20.10+
* Docker Compose 1.29+
* Node.js 18+ (para desenvolvimento local dos frontends)
* Python 3.10+ (para desenvolvimento local dos backends)

### Inicialização do Ambiente

1.  **Clonagem do Repositório**
    ```bash
    git clone [https://github.com/luissauthier/sistema-eventos-microsservicos.git](https://github.com/luissauthier/sistema-eventos-microsservicos.git)
    cd sistema-eventos-microsservicos
    ```

2.  **Configuração de Variáveis de Ambiente**
    O sistema utiliza arquivos `.env` para configuração sensível. Utilize o modelo fornecido como base.
    ```bash
    cp .env.example .env
    ```
    *Nota: Certifique-se de configurar as credenciais de banco de dados e segredos JWT no arquivo recém-criado.*

3.  **Orquestração de Containers**
    Inicie todos os microsserviços e bancos de dados simultaneamente.
    ```bash
    docker-compose up -d --build
    ```

### Acesso aos Serviços

Após a inicialização, os serviços estarão disponíveis nos seguintes endpoints (via Gateway):

* **Portal Web:** `http://localhost:80`
* **API Gateway:** `http://localhost:80/api`
* **Documentação Swagger:** `http://localhost:80/docs` (se habilitado)

---

## Estrutura do Projeto

A organização do código fonte segue o padrão de segregação por domínio:

```text
/
├── gateway/                # Configurações do Nginx e proxy reverso
├── portal-web/             # Frontend Web (React)
├── app-local/              # Aplicação Desktop (Electron)
├── servico_usuarios/       # Microsserviço de Identidade
├── servico_eventos/        # Microsserviço de Gestão de Eventos
├── servico_certificados/   # Microsserviço de Emissão de Documentos
├── servico_notificacoes/   # Microsserviço de Mensageria
├── servico_comum/          # Bibliotecas compartilhadas (Loggers, Auth, Utils)
└── docs/                   # Documentação de API (OpenAPI/Swagger)
