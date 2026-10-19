# Smart-X IoT Gateway — YouTube Walkthrough Plan

Suggested duration: 7–10 minutes. Record the screen with the browser and terminal visible when needed. Use a clean browser window and avoid showing credentials or personal files.

## Before recording

1. Open the project in Visual Studio or VS Code.
2. Start the API from `backend/SmartX.Api` with `dotnet run --urls http://localhost:5143`.
3. Start the frontend from `frontend` with `npm run dev`.
4. Run the tests using `dotnet test .\tests\SmartX.Api.Tests\SmartX.Api.Tests.csproj` and keep the successful result available to show.
5. Open the dashboard at `http://localhost:5173` and Swagger at `http://localhost:5143/swagger`.
6. Prepare at least one registered sensor and several temperature readings for that same sensor. Use readings that demonstrate both a normal range and a rising or high-temperature condition.

## Recording sequence and narration

### 1. Introduction (0:00–0:30)

"This is my Smart-X IoT Gateway. It combines an ASP.NET Core API with a React dashboard. I will demonstrate the sensor ingestion features from Part 1 and the command processing, advanced collections, alert tracking and recommendation features for Part 2."

### 2. Main menu and navigation (0:30–1:15)

Show the main menu, API connection indicator, Sensor Data Ingestion module and Command Stream module. Open each available view and return to the dashboard. Explain that the UI polls the API to refresh sensor and command information.

### 3. Sensor registry and telemetry (1:15–2:30)

Show the sensor list, health statuses and latest telemetry. Register a sensor if needed, then use Swagger to submit a temperature packet to `POST /api/telemetry/temperature` with a `SensorId` matching the registered sensor's `DeviceIdentifier`. Example request:

```json
{
  "sensorId": "ESP32-001",
  "value": 36.5,
  "timestamp": "2026-10-19T10:00:00Z"
}
```

Explain that the bounded `Channel<T>` queue passes accepted readings to a hosted background worker, which validates the reading and updates the sensor's health state and telemetry history. Repeat with different values if you want to show a warning or critical condition.

### 4. Advanced collections (2:30–4:30)

Show the Command Stream page. Select a registered device, choose a command type and send an ordinary command. Send another command marked critical. Show command history and explain that `PriorityQueue<CommandRecord, int>` gives critical commands a higher processing priority.

Issue two commands to the same device and command type, then use Undo twice. Explain that `Stack<CommandRecord>` restores the previous state and that undo records are included in history without being pushed back onto the undo stack.

Open these endpoints in Swagger or the browser:

- `GET /api/commands/states` — dictionary of current device command states.
- `GET /api/commands/timeline` — chronological command history.
- `GET /api/commands/undo/status` — whether another undo is available.

### 5. Unique active alerts (4:30–5:15)

On the dashboard, enter `TEMP-001` and register it. Register `temp-001` as well. Explain that the case-insensitive `HashSet<string>` prevents the same alert from being stored twice. Resolve the alert and show it disappearing from the active list.

### 6. Predictive recommendations (5:15–6:30)

Show the Predictive Recommendations panel. Explain the 35°C warning threshold, 40°C critical threshold, four-reading rise detection and sustained trend comparison. Emphasise that readings are analysed separately per sensor, so readings from unrelated devices do not create a false combined trend. Show the recommendation's reason and suggested action.

### 7. API documentation and tests (6:30–7:30)

Show Swagger endpoints for health, sensors, telemetry, commands, alerts and recommendations. Switch to the terminal and show the successful `dotnet test` output. Briefly point out the tests for ring-buffer capacity, command undo, timeline order and case-insensitive alert uniqueness.

### 8. Wrap-up (7:30–8:00)

"The project demonstrates sensor ingestion, asynchronous queue processing, priority command handling, undo history, dictionary lookups, sorted command history, set-based alert deduplication and rule-based recommendations. The data is currently held in memory, and the network topology pillar is planned for a later stage."

## Suggested live demo data

Use one sensor identifier that already exists in the sensor registry. Send readings in chronological order, for example `28`, `30`, `33`, `36.5` to show a rising trend, then `41` to demonstrate the critical threshold. The readings must use the same `sensorId` and should be submitted one at a time so the background worker can process them.

Example PowerShell command (change `ESP32-001` if your registered sensor uses a different identifier):

```powershell
$base = "http://localhost:5143"
$values = @(28, 30, 33, 36.5, 41)
foreach ($value in $values) {
    $body = @{
        sensorId = "ESP32-001"
        value = $value
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
    } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "$base/api/telemetry/temperature" -ContentType "application/json" -Body $body
    Start-Sleep -Milliseconds 700
}
```

Do not claim that the recommendation engine is machine learning. Describe it as a rule-based engine using recent per-sensor history.
