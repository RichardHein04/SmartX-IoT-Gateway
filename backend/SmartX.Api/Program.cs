using SmartX.Api;
using SmartX.Api.Models;
using SmartX.Api.Services;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<MockTelemetryWorker>();

builder.Services.AddHostedService<TelemetryProcessorWorker>();

builder.Services.AddSingleton<TelemetryValidationService>();

builder.Services.AddSingleton<DeploymentValidator>();

builder.Services.AddSingleton(new TelemetryIngestionQueue<TelemetryPacket<float>>(100));

builder.Services.AddSingleton<TelemetryValidationService>();

// Add Swagger services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors("Frontend");

// Enable Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var sensors = ProgramState.Sensors;

var temperatureTelemetry = ProgramState.TemperatureTelemetry;

var temperatureBuffer = ProgramState.TemperatureBuffer;

var powerTelemetry = new List<TelemetryPacket<int>>();

var valveTelemetry = new List<TelemetryPacket<bool>>();

// Home endpoint
app.MapGet("/", () => "Welcome to the Smart-X IoT Data Ingestion Gateway!");

// Health check endpoint
app.MapGet("/api/health", () =>
{
    return Results.Ok(new
    {
        status = "Healthy",
        message = "Smart-X API is running successfully"
    });
});

// GET: Get all registered sensors
app.MapGet("/api/sensors", () =>
{
    return Results.Ok(sensors);
});

app.MapPost("/api/sensors", (Sensor sensor) =>
{
    // Validate device identifier
    if (string.IsNullOrWhiteSpace(sensor.DeviceIdentifier))
    {
        return Results.BadRequest(new
        {
            error = "Device identifier is required."
        });
    }

    // Validate location
    if (string.IsNullOrWhiteSpace(sensor.Location))
    {
        return Results.BadRequest(new
        {
            error = "Sensor location is required."
        });
    }

    // Validate category
    if (string.IsNullOrWhiteSpace(sensor.Category))
    {
        return Results.BadRequest(new
        {
            error = "Sensor category is required."
        });
    }

    if (!Enum.TryParse<SensorCategory>(
        sensor.Category,
        true,
        out _))
    {
        return Results.BadRequest(new
        {
            error = "Invalid sensor category.",
            allowedCategories = Enum.GetNames<SensorCategory>()
        });
    }

    // Check for duplicate device identifier
    bool sensorExists = sensors.Any(s =>
        s.DeviceIdentifier.Equals(
            sensor.DeviceIdentifier,
            StringComparison.OrdinalIgnoreCase));

    if (sensorExists)
    {
        return Results.BadRequest(new
        {
            error = "A sensor with this device identifier already exists."
        });
    }

    // Add valid sensor
    sensors.Add(sensor);

    return Results.Created($"/api/sensors/{sensor.Id}", sensor);
});

app.MapPost(
    "/api/telemetry/temperature",
    (
        TelemetryPacket<float> packet,
        TelemetryIngestionQueue<
            TelemetryPacket<float>> queue) =>
    {
        var sensor =
            ProgramState.Sensors.FirstOrDefault(
                s => s.DeviceIdentifier.Equals(
                    packet.SensorId,
                    StringComparison.OrdinalIgnoreCase));

        if (sensor is null)
        {
            return Results.BadRequest(new
            {
                error = "Sensor not found."
            });
        }

        bool accepted =
            queue.TryEnqueue(packet);

        if (!accepted)
        {
            return Results.StatusCode(503);
        }

        return Results.Accepted(
            "/api/telemetry/temperature",
            new
            {
                message =
                    "Telemetry accepted for processing.",
                sensor = packet.SensorId,
                value = packet.Value
            });
    });

app.MapPost("/api/telemetry/power",
    (TelemetryPacket<int> packet) =>
    {
        powerTelemetry.Add(packet);

        return Results.Created(
            $"/api/telemetry/power/{packet.Id}",
            packet);
    });

app.MapPost("/api/telemetry/valve",
    (TelemetryPacket<bool> packet) =>
    {
        valveTelemetry.Add(packet);

        return Results.Created(
            $"/api/telemetry/valve/{packet.Id}",
            packet);
    });

app.MapGet("/api/telemetry/temperature", () =>
{
    return Results.Ok(temperatureTelemetry);
});

app.MapGet("/api/telemetry/power", () =>
{
    return Results.Ok(powerTelemetry);
});

app.MapGet("/api/telemetry/valve", () =>
{
    return Results.Ok(valveTelemetry);
});

app.MapGet("/api/operator-demo", () =>
{
    var temperature =
        new SensorMetric("Temperature", 25.5);

    var humidity =
        new SensorMetric("Humidity", 60);

    var combined = temperature + humidity;

    var difference = humidity - temperature;

    return Results.Ok(new
    {
        temperature,
        humidity,
        combined,
        difference
    });
});

app.MapGet("/api/telemetry/batch-demo", () =>
{
    int[][] jaggedTelemetry =
    {
        new[] { 21, 22, 23 },
        new[] { 24, 25 },
        new[] { 26, 27, 28, 29 }
    };

    var telemetryList = new List<int>();

    foreach (var row in jaggedTelemetry)
    {
        foreach (var value in row)
        {
            telemetryList.Add(value);
        }
    }

    return Results.Ok(new
    {
        original = jaggedTelemetry,
        convertedList = telemetryList
    });
});

app.MapPost(
    "/api/deployment/validate",
    (
        DeploymentNode deployment,
        DeploymentValidator validator) =>
    {
        var errors =
            validator.Validate(deployment);

        return Results.Ok(new
        {
            valid = errors.Count == 0,
            errors
        });
    });

app.MapGet("/api/telemetry/ring-buffer", () =>
{
    return Results.Ok(new
    {
        capacity = temperatureBuffer.Capacity,
        count = temperatureBuffer.Count,
        telemetry = temperatureBuffer.GetAll()
    });
});

app.MapPost(
    "/api/telemetry/queue",
    (
        TelemetryPacket<float> packet,
        TelemetryIngestionQueue<TelemetryPacket<float>> queue) =>
    {
        bool accepted = queue.TryEnqueue(packet);

        if (!accepted)
        {
            return Results.StatusCode(503);
        }

        return Results.Accepted(
            "/api/telemetry/queue",
            new
            {
                message = "Telemetry accepted into ingestion queue.",
                queueSize = queue.Count
            });
    });

app.MapGet("/api/telemetry/live", () =>
{
    var telemetry =
        ProgramState.TemperatureBuffer.GetAll();

    return Results.Ok(new
    {
        count = telemetry.Count,
        telemetry
    });
});

app.MapPost(
    "/api/sensors/{sensorId}/attachments",
    async (
        Guid sensorId,
        IFormFile file,
        IWebHostEnvironment environment) =>
    {
        const long maxFileSize = 10 * 1024 * 1024;

        var sensor = ProgramState.Sensors
            .FirstOrDefault(s => s.Id == sensorId);

        if (sensor is null)
        {
            return Results.NotFound(new
            {
                error = "Sensor not found."
            });
        }

        if (file is null || file.Length == 0)
        {
            return Results.BadRequest(new
            {
                error = "A file is required."
            });
        }

        if (file.Length > maxFileSize)
        {
            return Results.BadRequest(new
            {
                error = "File exceeds the 10 MB limit."
            });
        }

        var uploadDirectory = Path.Combine(
            environment.ContentRootPath,
            "uploads");

        Directory.CreateDirectory(uploadDirectory);

        var extension =
            Path.GetExtension(file.FileName);

        var generatedFileName =
            $"{Guid.NewGuid()}{extension}";

        var filePath =
            Path.Combine(
                uploadDirectory,
                generatedFileName);

        await using var stream =
            File.Create(filePath);

        await file.CopyToAsync(stream);

        return Results.Ok(new
        {
            message = "File uploaded successfully.",
            sensorId = sensor.Id,
            originalFileName = file.FileName,
            storedFileName = generatedFileName,
            size = file.Length
        });
    })
.DisableAntiforgery();

app.Run();