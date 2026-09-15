using SmartX.Api.Models;

namespace SmartX.Api.Services
{
    public class MockTelemetryWorker : BackgroundService
    {
        private readonly IServiceProvider serviceProvider;

        private readonly Random random = new();

        public MockTelemetryWorker(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(
            CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope =
                        serviceProvider.CreateScope();

                    var queue =
                        scope.ServiceProvider
                            .GetRequiredService<
                                TelemetryIngestionQueue<
                                    TelemetryPacket<float>>>();

                    var sensors =
                        ProgramState.Sensors;

                    foreach (var sensor in sensors)
                    {
                        float temperature =
                            GenerateTemperature();

                        var packet =
                            new TelemetryPacket<float>
                            {
                                SensorId =
                                    sensor.DeviceIdentifier,

                                Value = temperature,

                                Timestamp =
                                    DateTime.UtcNow
                            };

                        queue.TryEnqueue(packet);
                    }
                }
                catch
                {
                    // Keep the background simulator alive.
                }

                await Task.Delay(
                    TimeSpan.FromSeconds(3),
                    stoppingToken);
            }
        }

        private float GenerateTemperature()
        {
            int chance = random.Next(0, 100);

            if (chance < 5)
            {
                // Critical anomaly
                return random.Next(60, 80);
            }

            if (chance < 15)
            {
                // Warning anomaly
                return random.Next(36, 50);
            }

            // Normal operating range
            return 20 + (float)random.NextDouble() * 10;
        }
    }
}
