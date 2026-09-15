using SmartX.Api.Models;

namespace SmartX.Api.Services
{
    public class TelemetryProcessorWorker : BackgroundService
    {
        private readonly TelemetryIngestionQueue<
            TelemetryPacket<float>> queue;

        private readonly TelemetryValidationService
            validationService;

        public TelemetryProcessorWorker(
            TelemetryIngestionQueue<
                TelemetryPacket<float>> queue,
            TelemetryValidationService validationService)
        {
            this.queue = queue;
            this.validationService = validationService;
        }

        protected override async Task ExecuteAsync(
            CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var packet =
                        await queue.DequeueAsync(
                            stoppingToken);

                    Process(packet);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        private void Process(
            TelemetryPacket<float> packet)
        {
            var sensor =
                ProgramState.Sensors.FirstOrDefault(
                    s => s.DeviceIdentifier.Equals(
                        packet.SensorId,
                        StringComparison.OrdinalIgnoreCase));

            if (sensor is null)
            {
                return;
            }

            var health =
                validationService
                    .EvaluateTemperature(packet.Value);

            ProgramState.TemperatureTelemetry.Add(packet);

            ProgramState.TemperatureBuffer.Add(packet);

            sensor.LastSeenAt = packet.Timestamp;

            sensor.HealthStatus = health;
        }
    }
}
