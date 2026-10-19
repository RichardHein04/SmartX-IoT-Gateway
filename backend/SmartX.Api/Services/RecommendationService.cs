using SmartX.Api;
using SmartX.Api.Models;

namespace SmartX.Api.Services;

public class RecommendationService
{
    private readonly CommandStore commandStore;

    public RecommendationService(CommandStore commandStore)
    {
        this.commandStore = commandStore;
    }

    public object GetRecommendations()
    {
        var allReadings = ProgramState.TemperatureBuffer
            .GetAll()
            .OrderBy(reading => reading.Timestamp)
            .ToList();

        var recommendations = new List<object>();
        var sensorSummaries = new List<object>();

        if (allReadings.Count == 0)
        {
            recommendations.Add(new
            {
                id = "no-telemetry",
                severity = "Info",
                title = "Waiting for sensor data",
                reason = "No temperature readings are available yet.",
                action = "Register a sensor and send temperature readings."
            });
        }

        foreach (var sensorGroup in allReadings.GroupBy(reading => reading.SensorId, StringComparer.OrdinalIgnoreCase))
        {
            var readings = sensorGroup.OrderBy(reading => reading.Timestamp).ToList();
            var latest = readings[^1];
            var sensorId = sensorGroup.Key;
            var increase = readings.Count >= 4
                ? readings.TakeLast(4).Last().Value - readings.TakeLast(4).First().Value
                : 0f;
            var average = readings.Average(reading => reading.Value);

            sensorSummaries.Add(new
            {
                sensorId,
                readingCount = readings.Count,
                latestValue = Math.Round(latest.Value, 2),
                averageValue = Math.Round(average, 2),
                changeAcrossLatestFourReadings = readings.Count >= 4 ? Math.Round(increase, 2) : (double?)null,
                latestTimestamp = latest.Timestamp
            });

            var recommendationCountBeforeSensor = recommendations.Count;

            if (latest.Value >= 40)
            {
                recommendations.Add(new
                {
                    id = $"high-temperature-critical-{sensorId}",
                    sensorId,
                    severity = "Critical",
                    title = "Critical temperature detected",
                    reason = $"Sensor {sensorId} reported {latest.Value:F1}°C, at or above the 40°C critical threshold.",
                    action = "Inspect the device immediately and check cooling, ventilation and nearby equipment."
                });
            }
            else if (latest.Value >= 35)
            {
                recommendations.Add(new
                {
                    id = $"high-temperature-warning-{sensorId}",
                    sensorId,
                    severity = "Warning",
                    title = "High temperature detected",
                    reason = $"Sensor {sensorId} reported {latest.Value:F1}°C, at or above the 35°C warning threshold.",
                    action = "Inspect the device and check cooling or ventilation."
                });
            }

            if (readings.Count >= 4 && increase >= 3)
            {
                recommendations.Add(new
                {
                    id = $"rising-temperature-{sensorId}",
                    sensorId,
                    severity = increase >= 6 ? "Critical" : "Warning",
                    title = "Temperature trend is rising",
                    reason = $"Sensor {sensorId} increased by {increase:F1}°C across its latest four readings.",
                    action = "Investigate the cause of the sustained rise and monitor the next readings closely."
                });
            }

            if (readings.Count >= 6)
            {
                var latestThree = readings.TakeLast(3).Average(reading => reading.Value);
                var previousThree = readings.Skip(readings.Count - 6).Take(3).Average(reading => reading.Value);
                var sustainedChange = latestThree - previousThree;

                if (sustainedChange >= 2 && increase < 3)
                {
                    recommendations.Add(new
                    {
                        id = $"sustained-temperature-rise-{sensorId}",
                        sensorId,
                        severity = "Warning",
                        title = "Sustained temperature increase",
                        reason = $"The average of the latest three readings is {sustainedChange:F1}°C higher than the preceding three-reading average.",
                        action = "Check the environment for a developing heat issue before the critical threshold is reached."
                    });
                }
            }

            if (recommendations.Count == recommendationCountBeforeSensor && readings.Count >= 4 && latest.Value < 35 && increase < 3)
            {
                recommendations.Add(new
                {
                    id = $"stable-temperature-{sensorId}",
                    sensorId,
                    severity = "Info",
                    title = "Temperature currently within expected range",
                    reason = $"The latest reading is {latest.Value:F1}°C and no rapid rise was detected in the latest four readings.",
                    action = "Continue monitoring and review the trend if readings begin to rise."
                });
            }
        }

        return new
        {
            generatedAt = DateTime.UtcNow,
            readingCount = allReadings.Count,
            sensorCount = sensorSummaries.Count,
            sensors = sensorSummaries,
            activeAlerts = commandStore.GetActiveAlerts(),
            recommendations
        };
    }
}
