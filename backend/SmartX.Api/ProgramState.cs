using SmartX.Api.Models;

namespace SmartX.Api
{
    public static class ProgramState
    {
        public static List<Sensor> Sensors { get; } = new();

        public static List<TelemetryPacket<float>>
            TemperatureTelemetry
        { get; } = new();

        public static TelemetryRingBuffer<
            TelemetryPacket<float>>
            TemperatureBuffer
        { get; } =
                new(20);
    }
}
