namespace SmartX.Api.Models
{
    public class CommandRecord
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string DeviceIdentifier { get; set; } = string.Empty;

        public string CommandType { get; set; } = string.Empty;

        public bool Value { get; set; }

        public bool PreviousValue { get; set; }

        public string Status { get; set; } = "Pending";

        public bool IsCritical { get; set; }

        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}
