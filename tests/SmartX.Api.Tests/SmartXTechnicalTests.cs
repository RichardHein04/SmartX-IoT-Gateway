using SmartX.Api.Models;
using SmartX.Api.Services;
using Xunit;

namespace SmartX.Api.Tests;

public class SmartXTechnicalTests
{
    [Fact]
    public void TelemetryPacket_IsGeneric()
    {
        var packet = new TelemetryPacket<float>
        {
            SensorId = "TEST-SENSOR",
            Value = 23.5f
        };

        Assert.Equal(23.5f, packet.Value);
    }

    [Fact]
    public void TelemetryPacket_SupportsInteger()
    {
        var packet = new TelemetryPacket<int>
        {
            SensorId = "POWER-01",
            Value = 1500
        };

        Assert.Equal(1500, packet.Value);
    }

    [Fact]
    public void TelemetryPacket_SupportsBoolean()
    {
        var packet = new TelemetryPacket<bool>
        {
            SensorId = "VALVE-01",
            Value = true
        };

        Assert.True(packet.Value);
    }

    [Fact]
    public void SensorMetric_AdditionWorks()
    {
        var first = new SensorMetric
        {
            Value = 20
        };

        var second = new SensorMetric
        {
            Value = 5
        };

        var result = first + second;

        Assert.Equal(25, result.Value);
    }

    [Fact]
    public void SensorMetric_SubtractionWorks()
    {
        var first = new SensorMetric
        {
            Value = 20
        };

        var second = new SensorMetric
        {
            Value = 5
        };

        var result = first - second;

        Assert.Equal(15, result.Value);
    }

    [Fact]
    public void RingBuffer_MaintainsMaximumCapacity()
    {
        var buffer = new TelemetryRingBuffer<int>(3);

        buffer.Add(1);
        buffer.Add(2);
        buffer.Add(3);
        buffer.Add(4);

        var values = buffer.GetAll().ToList();

        Assert.Equal(3, values.Count);
        Assert.Equal(new[] { 2, 3, 4 }, values);
    }

    [Theory]
    [InlineData(-20, SensorHealthStatus.Critical)]
    [InlineData(60, SensorHealthStatus.Critical)]
    [InlineData(-5, SensorHealthStatus.Warning)]
    [InlineData(40, SensorHealthStatus.Warning)]
    [InlineData(25, SensorHealthStatus.Healthy)]
    public void TemperatureValidation_AssignsCorrectHealth(
        float temperature,
        SensorHealthStatus expected)
    {
        var service = new TelemetryValidationService();

        var result = service.EvaluateTemperature(temperature);

        Assert.Equal(expected, result);
    }

    [Fact]
    public void DeploymentValidator_RejectsInvalidNestedNode()
    {
        var validator = new DeploymentValidator();

        var root = new DeploymentNode
        {
            Name = "Main Site",
            Type = "Root",
            IsValid = true
        };

        root.Children.Add(new DeploymentNode
        {
            Name = "",
            Type = "Sensor",
            IsValid = true
        });

        var errors = validator.Validate(root);

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void DeploymentValidator_AcceptsValidTree()
    {
        var validator = new DeploymentValidator();

        var root = new DeploymentNode
        {
            Name = "Main Site",
            Type = "Root",
            IsValid = true
        };

        root.Children.Add(new DeploymentNode
        {
            Name = "Server Room",
            Type = "Sensor",
            IsValid = true
        });

        var errors = validator.Validate(root);

        Assert.Empty(errors);
    }
}