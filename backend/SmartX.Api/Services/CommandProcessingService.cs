
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SmartX.Api.Models;

namespace SmartX.Api.Services
{
    public class CommandProcessingService : Microsoft.Extensions.Hosting.BackgroundService
    {
        private readonly CommandStore _store;
        private readonly ILogger<CommandProcessingService> _logger;

        public CommandProcessingService(
            CommandStore store,
            ILogger<CommandProcessingService> logger)
        {
            _store = store;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(
            CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(100, stoppingToken);

                    if (!_store.TryDequeueCommand(out var command)
                        || command == null)
                    {
                        continue;
                    }

                    command.Status = "Completed";

                    _store.RecordCommand(command);

                    _logger.LogInformation(
                        "Processed command {CommandType} for device {DeviceIdentifier}. Critical: {IsCritical}",
                        command.CommandType,
                        command.DeviceIdentifier,
                        command.IsCritical);
                }
                catch (OperationCanceledException)
                    when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "An error occurred while processing a command.");
                }
            }
        }
    }
}
