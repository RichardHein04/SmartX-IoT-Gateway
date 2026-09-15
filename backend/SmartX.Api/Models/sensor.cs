namespace SmartX.Api.Models;

public class Sensor
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string DeviceIdentifier { get; set; } = string.Empty;

    public string Location { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastSeenAt { get; set; }

    public SensorHealthStatus HealthStatus { get; set; } = SensorHealthStatus.Offline;
}