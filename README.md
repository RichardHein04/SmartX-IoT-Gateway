# Smart-X IoT Gateway

## 1. Project Overview

Smart-X is an IoT gateway and technical management dashboard designed to provide sensor registration, telemetry ingestion, real-time health monitoring, anomaly identification and sensor attachment management.

The application consists of:

- ASP.NET Core Web API backend
- React/Vite frontend
- Generic telemetry data structures
- Real-time telemetry processing
- Sensor health monitoring
- Anomaly detection
- Multipart media/log uploads
- Recursive deployment validation
- Optimised collections
- Interactive dashboard engagement features

---

# 2. System Architecture

The application follows a three-pillar IoT gateway architecture.

### Pillar 1 – Sensor Data Ingestion and Telemetry

Implemented in the current project.

Responsibilities include:

- Sensor registration
- Device identification
- Sensor category
- Deployment location
- Telemetry ingestion
- Telemetry validation
- Health status
- Recent telemetry storage

### Pillar 2 – Real-Time Command Stream and History

Reserved for Part 2.

### Pillar 3 – Network Topology and Mesh Routing

Reserved for the final PoE stage.

---

# 3. Technologies

## Backend

- .NET 10
- ASP.NET Core Web API
- C#
- Swagger/OpenAPI
- Generic collections
- System.Threading.Channels

## Frontend

- React
- Vite
- JavaScript
- Responsive CSS

## Development

- Git
- Docker
- Docker Compose

---

# 4. Requirements

Install:

- .NET SDK 10
- Node.js 22 or newer
- npm
- Git
- Docker Desktop (optional)

---

# 5. Running the Backend

Open PowerShell:

```powershell
cd C:\Users\Richard\Desktop\SmartX-IoT-Gateway\backend\SmartX.Api