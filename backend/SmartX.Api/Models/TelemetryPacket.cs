public class TelemetryPacket<T>
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public string SensorId { get; set; } = string.Empty;

    public T Value { get; set; } = default!;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}