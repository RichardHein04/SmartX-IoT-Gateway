import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5143";

const pillars = [
    {
        id: "ingestion",
        title: "Sensor Data Ingestion & Telemetry",
        description:
            "Register sensors, ingest live telemetry, validate readings and monitor gateway health.",
        active: true,
    },
    {
        id: "commands",
        title: "Real-Time Command Stream & History",
        description:
            "Command streaming and historical command management will be implemented in Part 2.",
        active: false,
    },
    {
        id: "topology",
        title: "Network Topology & Mesh Routing",
        description:
            "Advanced mesh topology and routing capabilities are reserved for the final PoE.",
        active: false,
    },
];

function App() {
    const [page, setPage] = useState("startup");

    const [sensors, setSensors] = useState([]);
    const [telemetry, setTelemetry] = useState([]);
    const [apiStatus, setApiStatus] = useState("Checking...");
    const [lastUpdated, setLastUpdated] = useState(null);

    const [deviceIdentifier, setDeviceIdentifier] = useState("");
    const [location, setLocation] = useState("");
    const [category, setCategory] = useState("Environmental");
    const [registrationMessage, setRegistrationMessage] = useState("");

    const [selectedSensor, setSelectedSensor] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");

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

            if (!sensorsResponse.ok) {
                throw new Error("Could not load sensors");
            }

            const sensorsData = await sensorsResponse.json();

            const telemetryResponse = await fetch(`${API_URL}/api/telemetry/live`);

            let telemetryData = [];

            if (telemetryResponse.ok) {
                const responseData = await telemetryResponse.json();

                if (Array.isArray(responseData)) {
                    telemetryData = responseData;
                } else {
                    telemetryData = responseData.telemetry ?? [];
                }
            }

            setSensors(Array.isArray(sensorsData) ? sensorsData : []);
            setTelemetry(telemetryData);
            setApiStatus("Connected");
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Smart-X API error:", error);
            setApiStatus("Disconnected");
        }
    }

    function getHealthStatus(status) {
        if (typeof status === "number") {
            switch (status) {
                case 0:
                    return "Healthy";
                case 1:
                    return "Warning";
                case 2:
                    return "Critical";
                case 3:
                    return "Offline";
                default:
                    return "Offline";
            }
        }

        if (typeof status === "string") {
            const value = status.toLowerCase();

            if (value === "0") return "Healthy";
            if (value === "1") return "Warning";
            if (value === "2") return "Critical";
            if (value === "3") return "Offline";

            return (
                status.charAt(0).toUpperCase() +
                status.slice(1).toLowerCase()
            );
        }

        return "Offline";
    }

    async function registerSensor(event) {
        event.preventDefault();
        setRegistrationMessage("");

        try {
            const response = await fetch(`${API_URL}/api/sensors`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    deviceIdentifier,
                    location,
                    category,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setRegistrationMessage(
                    data.error ?? "Sensor registration failed."
                );
                return;
            }

            setRegistrationMessage(
                "Sensor registered successfully."
            );

            setDeviceIdentifier("");
            setLocation("");
            setCategory("Environmental");

            await loadData();
        } catch (error) {
            console.error("Registration error:", error);

            setRegistrationMessage(
                "Could not connect to the Smart-X API."
            );
        }
    }

    async function uploadAttachment(event) {
        event.preventDefault();
        setUploadMessage("");

        if (!selectedSensor) {
            setUploadMessage("Select a sensor first.");
            return;
        }

        if (!selectedFile) {
            setUploadMessage("Choose a file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await fetch(
                `${API_URL}/api/sensors/${encodeURIComponent(
                    selectedSensor
                )}/attachments`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setUploadMessage(
                    data.error ?? "Upload failed."
                );
                return;
            }

            setUploadMessage(
                `Upload successful: ${data.fileName ?? selectedFile.name
                }`
            );

            setSelectedFile(null);

            const fileInput =
                document.getElementById("attachment");

            if (fileInput) {
                fileInput.value = "";
            }
        } catch (error) {
            console.error("Upload error:", error);

            setUploadMessage(
                "Could not connect to the Smart-X API."
            );
        }
    }

    const criticalSensors = sensors.filter(
        (sensor) =>
            getHealthStatus(sensor.healthStatus) === "Critical"
    );

    const warningSensors = sensors.filter(
        (sensor) =>
            getHealthStatus(sensor.healthStatus) === "Warning"
    );

    const healthySensors = sensors.filter(
        (sensor) =>
            getHealthStatus(sensor.healthStatus) === "Healthy"
    );

    const offlineSensors = sensors.filter(
        (sensor) =>
            getHealthStatus(sensor.healthStatus) === "Offline"
    );

    const latestTelemetry = useMemo(() => {
        return [...telemetry]
            .sort(
                (a, b) =>
                    new Date(b.timestamp) -
                    new Date(a.timestamp)
            )
            .slice(0, 10);
    }, [telemetry]);

    function statusClass(status) {
        const value = getHealthStatus(status).toLowerCase();

        if (value === "critical") return "critical";
        if (value === "warning") return "warning";
        if (value === "healthy") return "healthy";

        return "offline";
    }

    function sensorName(sensorId) {
        const sensor = sensors.find(
            (item) =>
                item.deviceIdentifier?.toLowerCase() ===
                sensorId?.toLowerCase()
        );

        return sensor?.deviceIdentifier ?? sensorId;
    }

    function triageMessage(sensor) {
        const status = getHealthStatus(
            sensor.healthStatus
        ).toLowerCase();

        if (status === "critical") {
            return "Immediate inspection recommended. Check sensor placement, environmental conditions and connectivity.";
        }

        if (status === "warning") {
            return "Monitor this sensor closely and verify recent environmental readings.";
        }

        if (status === "offline") {
            return "No recent telemetry detected. Check device power and network connectivity.";
        }

        return "Operating within the expected temperature range.";
    }

    function Dashboard() {
        return (
            <>
                <section className="dashboard-heading">
                    <div>
                        <div className="eyebrow">
                            OPERATIONS CENTRE
                        </div>

                        <h1>Anomaly Triage Pulse</h1>

                        <p>
                            Live telemetry monitoring with
                            severity-aware anomaly detection and
                            operator guidance.
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

                <section className="panel">
                    <div className="section-heading">
                        <div>
                            <div className="eyebrow">
                                ENGAGEMENT STRATEGY
                            </div>

                            <h2>Operator Triage</h2>
                        </div>

                        <span className="telemetry-count">
                            {telemetry.length} recent readings
                        </span>
                    </div>

                    {criticalSensors.length === 0 &&
                        warningSensors.length === 0 &&
                        offlineSensors.length === 0 ? (
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
                            {[
                                ...criticalSensors,
                                ...warningSensors,
                                ...offlineSensors,
                            ].map((sensor) => {
                                const healthStatus =
                                    getHealthStatus(sensor.healthStatus);

                                return (
                                    <div
                                        className={`anomaly-card ${statusClass(
                                            sensor.healthStatus
                                        )}`}
                                        key={sensor.id}
                                    >
                                        <div className="anomaly-icon">
                                            !
                                        </div>

                                        <div className="anomaly-content">
                                            <div className="anomaly-top">
                                                <span className="severity">
                                                    {healthStatus}
                                                </span>

                                                <span>
                                                    {sensor.category}
                                                </span>
                                            </div>

                                            <h3>
                                                {sensor.deviceIdentifier}
                                            </h3>

                                            <p>
                                                <strong>Location:</strong>{" "}
                                                {sensor.location}
                                            </p>

                                            <div className="triage-action">
                                                <strong>
                                                    Recommended action
                                                </strong>

                                                <span>
                                                    {triageMessage(sensor)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="content-grid">
                    <div className="panel">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">
                                    DEVICE REGISTRY
                                </div>

                                <h2>Sensor Fleet</h2>
                            </div>

                            <button
                                className="small-button"
                                onClick={() => setPage("register")}
                            >
                                + Register
                            </button>
                        </div>

                        {sensors.length === 0 ? (
                            <div className="empty">
                                No sensors registered.
                            </div>
                        ) : (
                            <div className="sensor-list">
                                {sensors.map((sensor) => {
                                    const healthStatus =
                                        getHealthStatus(
                                            sensor.healthStatus
                                        );

                                    return (
                                        <div
                                            className="sensor-row"
                                            key={sensor.id}
                                        >
                                            <div className="sensor-main">
                                                <span
                                                    className={`status-indicator ${statusClass(
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
                                                className={`status-badge ${statusClass(
                                                    sensor.healthStatus
                                                )}`}
                                            >
                                                {healthStatus}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="panel">
                        <div className="section-heading">
                            <div>
                                <div className="eyebrow">
                                    INGESTION STREAM
                                </div>

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
                                                {sensorName(packet.sensorId)}
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
            </>
        );
    }

    function RegisterSensor() {
        return (
            <section className="form-page">
                <button
                    className="back-button"
                    onClick={() => setPage("dashboard")}
                >
                    ← Back to Dashboard
                </button>

                <div className="form-card">
                    <div className="eyebrow">
                        SENSOR PAYLOAD MANAGEMENT
                    </div>

                    <h1>Register Sensor</h1>

                    <p className="form-intro">
                        Add a Smart-X device to the gateway using
                        its unique identifier, deployment location
                        and sensor category.
                    </p>

                    <form onSubmit={registerSensor}>
                        <label htmlFor="deviceIdentifier">
                            Device MAC Address / Unique Identifier
                        </label>

                        <input
                            id="deviceIdentifier"
                            value={deviceIdentifier}
                            onChange={(event) =>
                                setDeviceIdentifier(
                                    event.target.value
                                )
                            }
                            placeholder="e.g. ESP32-ROOM-01"
                            required
                        />

                        <label htmlFor="location">
                            Sensor Deployment Location
                        </label>

                        <input
                            id="location"
                            value={location}
                            onChange={(event) =>
                                setLocation(event.target.value)
                            }
                            placeholder="e.g. Zone A / Room 1"
                            required
                        />

                        <label htmlFor="category">
                            Sensor Category
                        </label>

                        <select
                            id="category"
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                        >
                            <option value="Environmental">
                                Environmental
                            </option>

                            <option value="Energy">
                                Energy
                            </option>

                            <option value="Security">
                                Security
                            </option>

                            <option value="Industrial">
                                Industrial
                            </option>
                        </select>

                        <button
                            className="primary-button"
                            type="submit"
                        >
                            Register Sensor
                        </button>
                    </form>

                    {registrationMessage && (
                        <div className="form-message">
                            {registrationMessage}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    function Uploads() {
        return (
            <section className="form-page">
                <button
                    className="back-button"
                    onClick={() => setPage("dashboard")}
                >
                    ← Back to Dashboard
                </button>

                <div className="form-card">
                    <div className="eyebrow">
                        SENSOR PROFILE
                    </div>

                    <h1>Media & Log Attachment</h1>

                    <p className="form-intro">
                        Attach deployment photos, device
                        configuration files or hardware logs to a
                        registered sensor profile.
                    </p>

                    <form onSubmit={uploadAttachment}>
                        <label htmlFor="sensorSelect">
                            Sensor
                        </label>

                        <select
                            id="sensorSelect"
                            value={selectedSensor}
                            onChange={(event) =>
                                setSelectedSensor(
                                    event.target.value
                                )
                            }
                            required
                        >
                            <option value="">
                                Select a registered sensor
                            </option>

                            {sensors.map((sensor) => (
                                <option
                                    key={sensor.id}
                                    value={sensor.id}
                                >
                                    {sensor.deviceIdentifier} —{" "}
                                    {sensor.location}
                                </option>
                            ))}
                        </select>

                        <label htmlFor="attachment">
                            Configuration / Photo / Log File
                        </label>

                        <input
                            id="attachment"
                            type="file"
                            onChange={(event) =>
                                setSelectedFile(
                                    event.target.files?.[0] ?? null
                                )
                            }
                            required
                        />

                        <small className="upload-hint">
                            Maximum file size: 10 MB
                        </small>

                        <button
                            className="primary-button"
                            type="submit"
                        >
                            Upload Attachment
                        </button>
                    </form>

                    {uploadMessage && (
                        <div className="form-message">
                            {uploadMessage}
                        </div>
                    )}
                </div>
            </section>
        );
    }

    return (
        <div className="app">
            <header className="topbar">
                <div>
                    <button
                        className="brand-button"
                        onClick={() => setPage("startup")}
                    >
                        SMART-X
                    </button>

                    <div className="subtitle">
                        IoT Data Ingestion & Validation Gateway
                    </div>
                </div>

                <div className="connection">
                    <span
                        className={`connection-dot ${apiStatus === "Connected"
                                ? "online"
                                : ""
                            }`}
                    />

                    <span>API {apiStatus}</span>
                </div>
            </header>

            {page !== "startup" && (
                <nav className="navigation">
                    <button
                        className={
                            page === "dashboard" ? "active" : ""
                        }
                        onClick={() => setPage("dashboard")}
                    >
                        Dashboard
                    </button>

                    <button
                        className={
                            page === "register" ? "active" : ""
                        }
                        onClick={() => setPage("register")}
                    >
                        Register Sensor
                    </button>

                    <button
                        className={
                            page === "uploads" ? "active" : ""
                        }
                        onClick={() => setPage("uploads")}
                    >
                        Media / Logs
                    </button>
                </nav>
            )}

            <main className="dashboard">
                {page === "startup" && (
                    <section className="startup">
                        <div className="startup-copy">
                            <div className="eyebrow">
                                SMART-X GATEWAY
                            </div>

                            <h1>
                                Distributed IoT
                                <br />
                                Intelligence Gateway
                            </h1>

                            <p>
                                Configure and monitor the Smart-X
                                telemetry ingestion environment from a
                                single operational gateway.
                            </p>

                            <div className="startup-status">
                                <span
                                    className={`connection-dot ${apiStatus === "Connected"
                                            ? "online"
                                            : ""
                                        }`}
                                />

                                Gateway {apiStatus}
                            </div>
                        </div>

                        <div className="pillar-grid">
                            {pillars.map((pillar) => (
                                <div
                                    className={`pillar-card ${pillar.active
                                            ? "active"
                                            : "disabled"
                                        }`}
                                    key={pillar.id}
                                >
                                    <div className="pillar-number">
                                        {pillar.active ? "01" : "—"}
                                    </div>

                                    <span className="pillar-label">
                                        {pillar.active
                                            ? "AVAILABLE"
                                            : "FUTURE MODULE"}
                                    </span>

                                    <h2>{pillar.title}</h2>

                                    <p>{pillar.description}</p>

                                    {pillar.active ? (
                                        <button
                                            className="primary-button"
                                            onClick={() =>
                                                setPage("dashboard")
                                            }
                                        >
                                            Open Data Ingestion
                                        </button>
                                    ) : (
                                        <button
                                            className="disabled-button"
                                            disabled
                                        >
                                            Coming Later
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {page === "dashboard" && <Dashboard />}

                {page === "register" && <RegisterSensor />}

                {page === "uploads" && <Uploads />}

                {page !== "startup" && (
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
                )}
            </main>
        </div>
    );
}

export default App;