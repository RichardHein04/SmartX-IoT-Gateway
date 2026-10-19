Smart-X IoT Gateway

Smart-X is an IoT gateway and operations dashboard built with an ASP.NET Core Web API backend and a React/Vite frontend. It demonstrates sensor registration, telemetry ingestion and validation, health monitoring, anomaly recommendations, command processing, historical lookup, active alert tracking, and deployment validation.

Features

Part 1: Sensor ingestion and telemetry

- Register sensors with a unique device identifier, location, and category.
- Submit temperature telemetry through a bounded asynchronous ingestion queue.
- Validate readings and update sensor health and last-seen timestamps.
- Keep recent telemetry in a generic ring buffer.
- Upload sensor attachments with a 10 MB size limit.
- Validate nested deployment structures.
- Provide live sensor, telemetry, and API health endpoints.

Part 2: Command stream and advanced collections

- Submit commands for registered devices.
- Process commands asynchronously through a priority queue; critical commands are dequeued ahead of ordinary commands.
- Maintain a stack for undoing completed commands. Undo reverses the latest command and records the reversal in history without making the reversal itself another undo entry.
- Store current device command states in a case-insensitive dictionary.
- Keep command history in a sorted dictionary and expose a chronological timeline endpoint.
- Retain the most recent 500 command records for the command stream.
- Track unique active alert identifiers with a case-insensitive HashSet.
- Generate sensor-specific recommendations from recent temperature history, including threshold alerts, rapid rises, and sustained increases.
- Display active alert registration and resolution in the dashboard.

Additional technical demonstrations

- Generic telemetry packets for temperature, power, and valve readings.
- Operator metric arithmetic and batch telemetry examples.
- Docker Compose configuration for the API.
- Automated tests for telemetry models, ring-buffer behaviour, validation, deployment trees, command undo, timeline ordering, and unique alerts.

Technology stack

- .NET 10 / ASP.NET Core Minimal API
- C# collections, `System.Threading.Channels`, hosted background services
- Swagger / OpenAPI
- React 19, Vite, JavaScript, CSS
- xUnit
- Docker and Docker Compose

Requirements

Install the .NET 10 SDK, Node.js with npm, and Git. Docker Desktop is optional unless you want to run the API in a container.

Run locally

1. Start the backend

Open PowerShell in the project root and run:

powershell
cd .\backend\SmartX.Api
dotnet restore
dotnet run --urls http://localhost:5143


The API should be available at `http://localhost:5143`. In Development, Swagger is available at `http://localhost:5143/swagger`.

2. Start the frontend

Open a second PowerShell window in the project root:

powershell
cd .\frontend
npm install
npm run dev


Open the Vite address shown in the terminal, normally `http://localhost:5173`. The frontend's API URL is configured near the top of `frontend/src/App.jsx` as `http://localhost:5143`.

3. Run the automated tests

Open another PowerShell window in the project root:

powershell
dotnet test .\tests\SmartX.Api.Tests\SmartX.Api.Tests.csproj


4. Run with Docker (optional)

From the project root:

powershell
docker compose up --build


The API service is mapped to port `5143` on the host.

Important API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | API health status |
| GET / POST | `/api/sensors` | List or register sensors |
| POST | `/api/telemetry/temperature` | Queue a temperature reading for validation and processing |
| GET | `/api/telemetry/live` | Read the recent telemetry buffer |
| GET | `/api/telemetry/ring-buffer` | Inspect ring-buffer capacity and contents |
| GET | `/api/recommendations` | Get sensor-specific recommendations and active-alert data |
| POST | `/api/commands` | Queue a device command |
| GET | `/api/commands/history` | Get recent commands, newest first |
| GET | `/api/commands/timeline` | Get chronological command history |
| GET | `/api/commands/states` | Get current command states by device and command type |
| GET | `/api/commands/undo/status` | Check whether undo is available |
| POST | `/api/commands/undo` | Reverse the most recently recorded command |
| GET | `/api/alerts` | List active unique alert identifiers |
| POST | `/api/alerts/{alertId}` | Register an active alert; duplicate identifiers are ignored case-insensitively |
| DELETE | `/api/alerts/{alertId}` | Resolve an active alert |
| POST | `/api/deployment/validate` | Validate a deployment tree |

Demonstrating the collections

- **Queue:** Submit telemetry to `/api/telemetry/temperature`; the bounded channel hands it to the background telemetry processor.
- **Priority queue:** Submit a critical and an ordinary command and observe that the critical command is dequeued first.
- **Stack:** Issue two commands, use Undo twice, and confirm that each reversal restores the previous state without causing an undo loop.
- **Dictionary:** Open `/api/commands/states` to see current device states indexed by device and command type.
- **Sorted dictionary:** Open `/api/commands/timeline` to see command records in chronological order.
- **HashSet:** Register `TEMP-001`, then try `temp-001`; only one active alert should remain. Resolve it from the dashboard or with the DELETE endpoint.
- **Prediction engine:** Submit at least four temperature readings for the same sensor, then inspect `/api/recommendations` and the dashboard. The engine evaluates thresholds and changes in that sensor's own recent readings; it is a rule-based predictive aid, not a trained machine-learning model.

Notes and limitations

The current implementation stores sensor, command, alert, and telemetry state in memory. Restarting the API clears this runtime data. Temperature recommendations use the recent ring buffer and rule-based thresholds/trend comparisons. The network topology and mesh-routing pillar remains reserved for a later project stage.

Repository layout

text
backend/SmartX.Api/       ASP.NET Core API, models, queues and background services
frontend/                 React/Vite dashboard
tests/SmartX.Api.Tests/   xUnit automated tests
docker-compose.yml        Optional API container orchestration
README.md                 Project documentation

