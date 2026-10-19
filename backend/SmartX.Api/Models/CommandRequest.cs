namespace SmartX.Api.Models
{
    public class CommandRequest
    {
        public string DeviceIdentifier { get; set; } = string.Empty;

        public string CommandType { get; set; } = string.Empty;

        public bool Value { get; set; }

        public bool IsCritical { get; set; }
    }
}
