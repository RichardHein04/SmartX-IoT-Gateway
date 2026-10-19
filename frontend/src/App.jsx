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
            "Issue device commands, monitor processing status, filter command history and undo the latest command.",
        active: true,
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
    const [recommendations, setRecommendations] = useState([]);
    const [activeAlerts, setActiveAlerts] = useState([]);
    const [alertInput, setAlertInput] = useState("");
    const [alertMessage, setAlertMessage] = useState("");
    const [apiStatus, setApiStatus] = useState("Checking...");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [deviceIdentifier, setDeviceIdentifier] = useState("");
    const [location, setLocation] = useState("");
    const [category, setCategory] = useState("Environmental");
    const [registrationMessage, setRegistrationMessage] = useState("");
    const [selectedSensor, setSelectedSensor] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadMessage, setUploadMessage] = useState("");
    const [commands, setCommands] = useState([]);
    const [commandDevice, setCommandDevice] = useState("");
    const [commandType, setCommandType] = useState("Pump");
    const [commandValue, setCommandValue] = useState("true");
    const [commandCritical, setCommandCritical] = useState(false);
    const [commandMessage, setCommandMessage] = useState("");
    const [commandError, setCommandError] = useState("");
    const [deviceCategoryFilter, setDeviceCategoryFilter] = useState("All");
    const [deviceStatusFilter, setDeviceStatusFilter] = useState("All");
    const [commandHistoryFilter, setCommandHistoryFilter] = useState("All");


    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, []);

    // Keep command history refreshed while the Command Stream page is open.
    useEffect(() => {
        if (page !== "commands") return;

        loadCommandHistory();
        const interval = setInterval(loadCommandHistory, 2000);
        return () => clearInterval(interval);
    }, [page]);

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

            const recommendationsResponse = await fetch(`${API_URL}/api/recommendations`);
            if (recommendationsResponse.ok) {
                const recommendationsData = await recommendationsResponse.json();
                setRecommendations(
                    Array.isArray(recommendationsData.recommendations)
                        ? recommendationsData.recommendations
                        : []
                );
            }

            const alertsResponse = await fetch(`${API_URL}/api/alerts`);
            if (alertsResponse.ok) {
                const alertsData = await alertsResponse.json();
                setActiveAlerts(Array.isArray(alertsData) ? alertsData : []);
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


    async function registerAlert(event) {
        event.preventDefault();
        const alertId = alertInput.trim();

        if (!alertId) {
            setAlertMessage("Enter an alert identifier first.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/alerts/${encodeURIComponent(alertId)}`, {
                method: "POST",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "Could not register alert.");
            }

            setAlertMessage(result.message ?? "Alert registered.");
            setAlertInput("");
            const alertsResponse = await fetch(`${API_URL}/api/alerts`);
            if (alertsResponse.ok) {
                const alertsData = await alertsResponse.json();
                setActiveAlerts(Array.isArray(alertsData) ? alertsData : []);
            }
        } catch (error) {
            setAlertMessage(error.message);
        }
    }

    async function resolveAlert(alertId) {
        try {
            const response = await fetch(`${API_URL}/api/alerts/${encodeURIComponent(alertId)}`, {
                method: "DELETE",
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error ?? "Could not resolve alert.");
            }

            setActiveAlerts((current) => current.filter((item) => item !== alertId));
            setAlertMessage(result.message ?? "Alert resolved.");
        } catch (error) {
            setAlertMessage(error.message);
        }
    }

    async function loadCommandHistory() {
        try {
            const response = await fetch(
                `${API_URL}/api/commands/history`
            );

            if (!response.ok) {
                throw new Error("Could not load command history.");
            }

            const data = await response.json();

            setCommands(Array.isArray(data) ? data : []);
            setCommandError("");
        } catch (error) {
            setCommandError(error.message);
        }
    }

    async function issueCommand(event) {
        event.preventDefault();

        setCommandMessage("");
        setCommandError("");

        if (!commandDevice) {
            setCommandError("Please select a registered device.");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/commands`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    deviceIdentifier: commandDevice,
                    commandType,
                    value: commandValue === "true",
                    isCritical: commandCritical,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ?? "Could not submit the command."
                );
            }

            setCommandMessage(
                data.message ?? "Command accepted for processing."
            );

            await loadCommandHistory();
        } catch (error) {
            setCommandError(error.message);
        }
    }

    async function undoLastCommand() {
        setCommandMessage("");
        setCommandError("");

        try {
            const response = await fetch(
                `${API_URL}/api/commands/undo`,
                { method: "POST" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ?? "Could not undo the last command."
                );
            }

            setCommandMessage(data.message);
            await loadCommandHistory();
        } catch (error) {
            setCommandError(error.message);
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

                <section className="panel">
                    <div className="section-heading">
                        <div>
                            <div className="eyebrow">PREDICTIVE ANALYSIS</div>
                            <h2>Predictive Recommendations</h2>
                        </div>
                        <span className="telemetry-count">
                            {recommendations.length} recommendations
                        </span>
                    </div>

                    {recommendations.length === 0 ? (
                        <div className="empty">
                            No recommendations available yet. Waiting for sensor data...
                        </div>
                    ) : (
                        <div className="anomaly-list">
                            {recommendations.map((recommendation, index) => {
                                const severity = String(recommendation.severity ?? "Info");
                                const severityClass = severity.toLowerCase() === "critical"
                                    ? "critical"
                                    : severity.toLowerCase() === "warning"
                                        ? "warning"
                                        : "healthy";

                                return (
                                    <div
                                        className={`anomaly-card ${severityClass}`}
                                        key={recommendation.id ?? `${recommendation.title}-${index}`}
                                    >
                                        <div className="anomaly-icon">
                                            {severityClass === "critical" ? "!" : "i"}
                                        </div>
                                        <div className="anomaly-content">
                                            <div className="anomaly-top">
                                                <span className="severity">{severity}</span>
                                                <span>Recommendation</span>
                                            </div>
                                            <h3>{recommendation.title ?? "Suggested action"}</h3>
                                            <p>
                                                <strong>Reason:</strong>{" "}
                                                {recommendation.reason ?? "No reason provided."}
                                            </p>
                                            <div className="triage-action">
                                                <strong>Suggested action</strong>
                                                <span>{recommendation.action ?? "Continue monitoring."}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                <section className="panel">
                    <div className="section-heading">
                        <div>
                            <div className="eyebrow">UNIQUE ALERT TRACKING</div>
                            <h2>Active Alerts</h2>
                        </div>
                        <span className="telemetry-count">{activeAlerts.length} active</span>
                    </div>
                    <p>Alert identifiers are stored in a case-insensitive HashSet, preventing duplicate active alerts.</p>
                    <form onSubmit={registerAlert} className="alert-entry-form">
                        <label htmlFor="alertIdentifier">Alert identifier</label>
                        <input
                            id="alertIdentifier"
                            value={alertInput}
                            onChange={(event) => setAlertInput(event.target.value)}
                            placeholder="e.g. TEMP-SERVER-01"
                            maxLength={120}
                        />
                        <button className="primary-button" type="submit">Register Alert</button>
                    </form>
                    {alertMessage && <div className="form-message" role="status">{alertMessage}</div>}
                    {activeAlerts.length === 0 ? (
                        <div className="empty">No active alerts. Register an alert to demonstrate unique tracking.</div>
                    ) : (
                        <div className="sensor-list">
                            {activeAlerts.map((alertId) => (
                                <div className="sensor-row" key={alertId}>
                                    <div className="sensor-main"><strong>{alertId}</strong></div>
                                    <button className="small-button" type="button" onClick={() => resolveAlert(alertId)}>Resolve</button>
                                </div>
                            ))}
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


    function CommandStream() {
        const filteredSensors = sensors.filter((sensor) => {
            const categoryMatches =
                deviceCategoryFilter === "All" ||
                sensor.category === deviceCategoryFilter;

            const statusMatches =
                deviceStatusFilter === "All" ||
                getHealthStatus(sensor.healthStatus) ===
                deviceStatusFilter;

            return categoryMatches && statusMatches;
        });

        const filteredCommands = commands.filter((command) =>
            commandHistoryFilter === "All" ||
            command.status === commandHistoryFilter
        );

        return (
            <section className="form-page">
                <div className="form-card">
                    <div className="eyebrow">
                        OPERATOR CONTROLS
                    </div>

                    <h1>Real-Time Command Stream</h1>

                    <p className="form-intro">
                        Send simulated commands to registered devices
                        and inspect their processing history.
                    </p>

                    <form onSubmit={issueCommand}>
                        <label htmlFor="commandDevice">
                            Registered Device
                        </label>

                        <select
                            id="commandDevice"
                            value={commandDevice}
                            onChange={(event) =>
                                setCommandDevice(event.target.value)
                            }
                            required
                        >
                            <option value="">Select a device</option>

                            {sensors.map((sensor) => (
                                <option
                                    key={sensor.id}
                                    value={sensor.deviceIdentifier}
                                >
                                    {sensor.deviceIdentifier} —{" "}
                                    {sensor.category}
                                </option>
                            ))}
                        </select>

                        <label htmlFor="commandType">
                            Command Type
                        </label>

                        <select
                            id="commandType"
                            value={commandType}
                            onChange={(event) =>
                                setCommandType(event.target.value)
                            }
                        >
                            <option value="Pump">Pump</option>
                            <option value="Relay">Relay</option>
                            <option value="Valve">Valve</option>
                            <option value="SmartPlug">Smart Plug</option>
                        </select>

                        <label htmlFor="commandValue">
                            Requested State
                        </label>

                        <select
                            id="commandValue"
                            value={commandValue}
                            onChange={(event) =>
                                setCommandValue(event.target.value)
                            }
                        >
                            <option value="true">On</option>
                            <option value="false">Off</option>
                        </select>

                        <label>
                            <input
                                type="checkbox"
                                checked={commandCritical}
                                onChange={(event) =>
                                    setCommandCritical(
                                        event.target.checked
                                    )
                                }
                            />
                            Mark as critical
                        </label>

                        <button
                            className="primary-button"
                            type="submit"
                        >
                            Send Command
                        </button>
                    </form>

                    {commandMessage && (
                        <div className="form-message">
                            {commandMessage}
                        </div>
                    )}

                    {commandError && (
                        <div className="form-message">
                            {commandError}
                        </div>
                    )}
                </div>

                <div className="panel">
                    <div className="section-heading">
                        <div>
                            <div className="eyebrow">
                                DEVICE FILTERS
                            </div>

                            <h2>Registered Devices</h2>
                        </div>
                    </div>

                    <label htmlFor="categoryFilter">
                        Category
                    </label>

                    <select
                        id="categoryFilter"
                        value={deviceCategoryFilter}
                        onChange={(event) =>
                            setDeviceCategoryFilter(event.target.value)
                        }
                    >
                        <option value="All">All categories</option>
                        <option value="Environmental">Environmental</option>
                        <option value="Energy">Energy</option>
                        <option value="Security">Security</option>
                        <option value="Industrial">Industrial</option>
                    </select>

                    <label htmlFor="statusFilter">
                        Device Health
                    </label>

                    <select
                        id="statusFilter"
                        value={deviceStatusFilter}
                        onChange={(event) =>
                            setDeviceStatusFilter(event.target.value)
                        }
                    >
                        <option value="All">All statuses</option>
                        <option value="Healthy">Healthy</option>
                        <option value="Warning">Warning</option>
                        <option value="Critical">Critical</option>
                        <option value="Offline">Offline</option>
                    </select>

                    {filteredSensors.length === 0 ? (
                        <div className="empty">
                            No devices match these filters.
                        </div>
                    ) : (
                        <div className="sensor-list">
                            {filteredSensors.map((sensor) => (
                                <div
                                    className="sensor-row"
                                    key={sensor.id}
                                >
                                    <div className="sensor-main">
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
                                        {getHealthStatus(
                                            sensor.healthStatus
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="panel">
                    <div className="section-heading">
                        <div>
                            <div className="eyebrow">
                                COMMAND HISTORY
                            </div>

                            <h2>Recent Commands</h2>
                        </div>

                        <button
                            className="small-button"
                            onClick={loadCommandHistory}
                        >
                            Refresh
                        </button>
                    </div>

                    <label htmlFor="historyFilter">
                        Processing Status
                    </label>

                    <select
                        id="historyFilter"
                        value={commandHistoryFilter}
                        onChange={(event) =>
                            setCommandHistoryFilter(event.target.value)
                        }
                    >
                        <option value="All">All commands</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Failed">Failed</option>
                    </select>

                    {filteredCommands.length === 0 ? (
                        <div className="empty">
                            No commands match this filter.
                        </div>
                    ) : (
                        <div className="sensor-list">
                            {filteredCommands.map((command) => (
                                <div
                                    className="sensor-row"
                                    key={command.id}
                                >
                                    <div className="sensor-main">
                                        <div>
                                            <strong>
                                                {command.deviceIdentifier}
                                            </strong>

                                            <small>
                                                {command.commandType} ·{" "}
                                                {command.value ? "On" : "Off"}
                                                {command.isCritical
                                                    ? " · Critical"
                                                    : ""}
                                            </small>

                                            <small>
                                                {command.timestamp
                                                    ? new Date(
                                                        command.timestamp
                                                    ).toLocaleString()
                                                    : "Time unavailable"}
                                            </small>
                                        </div>
                                    </div>

                                    <span className="status-badge">
                                        {command.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button
                        className="small-button"
                        onClick={undoLastCommand}
                        disabled={commands.length === 0}
                    >
                        Undo Last Command
                    </button>
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

                    <button
                        className={page === "commands" ? "active" : ""}
                        onClick={() => {
                            setPage("commands");
                            loadCommandHistory();
                        }}
                    >
                        Command Stream
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
                                        {pillar.id === "ingestion"
                                            ? "01"
                                            : pillar.id === "commands"
                                                ? "02"
                                                : "—"}
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
                                                setPage(
                                                    pillar.id === "commands"
                                                        ? "commands"
                                                        : "dashboard"
                                                )
                                            }
                                        >
                                            {pillar.id === "commands"
                                                ? "Open Command Stream"
                                                : "Open Data Ingestion"}
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

                {page === "dashboard" && Dashboard()}

                {page === "register" && RegisterSensor()}

                {page === "uploads" && Uploads()}

                {page === "commands" && CommandStream()}

                {page !== "startup" && (
                    <footer className="footer">
                        <span>
                            Smart-X Gateway · Part 1 Ingestion & Part 2 Commands
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