import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5143";

function App() {
    const [sensors, setSensors] = useState([]);
    const [telemetry, setTelemetry] = useState([]);
    const [apiStatus, setApiStatus] = useState("Checking...");
    const [lastUpdated, setLastUpdated] = useState(null);

    useEffect(() => {
        loadData();

        const interval = setInterval(loadData, 3000);

        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        try {
            const healthResponse = await fetch(`${API_URL}/api/health`);

            if (!healthResponse.ok) {
                throw new Error("API unavailable");
            }

            const sensorsResponse = await fetch(`${API_URL}/api/sensors`);
            const sensorsData = await sensorsResponse.json();

            const telemetryResponse =
                await fetch(`${API_URL}/api/telemetry/live`);

            const telemetryData = await telemetryResponse.json();

            setSensors(sensorsData);
            setTelemetry(telemetryData.telemetry ?? []);
            setApiStatus("Connected");
            setLastUpdated(new Date());
        } catch {
            setApiStatus("Disconnected");
        }
    }

    const criticalSensors = sensors.filter(
        (sensor) => sensor.healthStatus?.toLowerCase() === "critical"
    );

    const warningSensors = sensors.filter(
        (sensor) => sensor.healthStatus?.toLowerCase() === "warning"
    );

    const healthySensors = sensors.filter(
        (sensor) => sensor.healthStatus?.toLowerCase() === "healthy"
    );

    const latestTelemetry = useMemo(() => {
        return [...telemetry]
            .sort(
                (a, b) =>
                    new Date(b.timestamp) -
                    new Date(a.timestamp)
            )
            .slice(0, 8);
    }, [telemetry]);

    function getStatusClass(status) {
        const value = status?.toLowerCase();

        if (value === "critical") return "critical";
        if (value === "warning") return "warning";
        if (value === "healthy") return "healthy";

        return "offline";
    }

    function getSensorName(sensorId) {
        const sensor = sensors.find(
            (item) =>
                item.deviceIdentifier?.toLowerCase() ===
                sensorId?.toLowerCase()
        );

        return sensor?.deviceIdentifier ?? sensorId;
    }

    function getTriageMessage(sensor) {
        const status = sensor.healthStatus?.toLowerCase();

        if (status === "critical") {
            return "Immediate inspection recommended. Check sensor placement, environment and connectivity.";
        }

        if (status === "warning") {
            return "Monitor this sensor closely. Verify environmental conditions and recent readings.";
        }

        if (status === "offline") {
            return "No recent telemetry detected. Check device power and network connectivity.";
        }

        return "Operating within the expected temperature range.";
    }

    return (
        <div className="app">
            <header className="topbar">
                <div>
                    <div className="brand">SMART-X</div>
                    <div className="subtitle">
                        IoT Data Ingestion & Validation Gateway
                    </div>
                </div>

                <div className="connection">
                    <span
                        className={`connection-dot ${apiStatus === "Connected" ? "online" : ""
                            }`}
                    />
                    <span>API {apiStatus}</span>
                </div>
            </header>

            <main className="dashboard">
                <section className="dashboard-heading">
                    <div>
                        <div className="eyebrow">OPERATIONS CENTRE</div>
                        <h1>Anomaly Triage Pulse</h1>
                        <p>
                            Live telemetry monitoring with severity-aware
                            anomaly detection and operator guidance.
                        </p>
                    </div>

                    <div className="live-indicator">
                        <span className="pulse" />
                        LIVE MONITORING
                    </div>
                </section>

                <section className="stats-grid">
                    <div className="stat-card">
                        <span>Total Sensors</span>
                        <strong>{sensors.length}</strong>
                        <small>Registered devices</small>
                    </div>

                    <div className="stat-card healthy-border">
                        <span>Healthy</span>
                        <strong>{healthySensors.length}</strong>
                        <small>Operating normally</small>
                    </div>

                    <div className="stat-card warning-border">
                        <span>Warnings</span>
                        <strong>{warningSensors.length}</strong>
                        <small>Requires monitoring</small>
                    </div>

                    <div className="stat-card critical-border">
                        <span>Critical</span>
                        <strong>{criticalSensors.length}</strong>
                        <small>Immediate attention</small>
                    </div>
                </section>

                <section className="pulse-panel">
                    <div className="section-heading">
                        <div>
                            <div className="eyebrow">ENGAGEMENT STRATEGY</div>
                            <h2>Operator Triage</h2>
                        </div>

                        <span className="telemetry-count">
                            {telemetry.length} recent readings
                        </span>
                    </div>

                    {criticalSensors.length === 0 &&
                        warningSensors.length === 0 ? (
                        <div className="all-clear">
                            <div className="all-clear-icon">✓</div>
                            <div>
                                <h3>System operating normally</h3>
                                <p>
                                    No active anomalies require operator
                                    intervention.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="anomaly-list">
                            {[...criticalSensors, ...warningSensors].map(
                                (sensor) => (
                                    <div
                                        className={`anomaly-card ${getStatusClass(
                                            sensor.healthStatus
                                        )}`}
                                        key={sensor.id}
                                    >
                                        <div className="anomaly-icon">
                                            {sensor.healthStatus?.toLowerCase() ===
                                                "critical"
                                                ? "!"
                                                : "!"}
                                        </div>

                                        <div className="anomaly-content">
                                            <div className="anomaly-top">
                                                <span className="severity">
                                                    {sensor.healthStatus}
                                                </span>
                                                <span>
                                                    {sensor.category}
                                                </span>
                                            </div>

                                            <h3>{sensor.deviceIdentifier}</h3>

                                            <p>
                                                <strong>Location:</strong>{" "}
                                                {sensor.location}
                                            </p>

                                            <div className="triage-action">
                                                <strong>Recommended action</strong>
                                                <span>
                                                    {getTriageMessage(sensor)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </section>

                <section className="content-grid">
                    <div className="panel">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">DEVICE REGISTRY</div>
                                <h2>Sensor Fleet</h2>
                            </div>
                        </div>

                        {sensors.length === 0 ? (
                            <div className="empty">
                                No sensors registered.
                            </div>
                        ) : (
                            <div className="sensor-list">
                                {sensors.map((sensor) => (
                                    <div
                                        className="sensor-row"
                                        key={sensor.id}
                                    >
                                        <div className="sensor-main">
                                            <span
                                                className={`status-indicator ${getStatusClass(
                                                    sensor.healthStatus
                                                )}`}
                                            />

                                            <div>
                                                <strong>
                                                    {sensor.deviceIdentifier}
                                                </strong>
                                                <small>
                                                    {sensor.location} ·{" "}
                                                    {sensor.category}
                                                </small>
                                            </div>
                                        </div>

                                        <span
                                            className={`status-badge ${getStatusClass(
                                                sensor.healthStatus
                                            )}`}
                                        >
                                            {sensor.healthStatus}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="panel">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">INGESTION STREAM</div>
                                <h2>Recent Telemetry</h2>
                            </div>
                        </div>

                        {latestTelemetry.length === 0 ? (
                            <div className="empty">
                                Waiting for telemetry...
                            </div>
                        ) : (
                            <div className="telemetry-list">
                                {latestTelemetry.map((packet) => (
                                    <div
                                        className="telemetry-row"
                                        key={packet.id}
                                    >
                                        <div>
                                            <strong>
                                                {getSensorName(packet.sensorId)}
                                            </strong>

                                            <small>
                                                {new Date(
                                                    packet.timestamp
                                                ).toLocaleTimeString()}
                                            </small>
                                        </div>

                                        <strong className="telemetry-value">
                                            {Number(packet.value).toFixed(1)}°C
                                        </strong>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <footer className="footer">
                    <span>
                        Smart-X Gateway · Part 1 Data Ingestion
                    </span>

                    <span>
                        Last update:{" "}
                        {lastUpdated
                            ? lastUpdated.toLocaleTimeString()
                            : "—"}
                    </span>
                </footer>
            </main>
        </div>
    );
}

export default App;