namespace SmartX.Api.Services
{
    using SmartX.Api.Models;

    public class TelemetryValidationService
    {
        public SensorHealthStatus EvaluateTemperature(float temperature)
        {
            if (temperature < -10 || temperature > 50)
            {
                return SensorHealthStatus.Critical;
            }

            if (temperature < 0 || temperature > 35)
            {
                return SensorHealthStatus.Warning;
            }

            return SensorHealthStatus.Healthy;
        }
    }
}
