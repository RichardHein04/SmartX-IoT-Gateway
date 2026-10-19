using System.Collections.Concurrent;

namespace SmartX.Api.Models;

public class CommandStore
{
    private readonly object syncLock = new();
    private readonly Dictionary<string, bool> deviceStates = new(StringComparer.OrdinalIgnoreCase);
    private readonly Stack<CommandRecord> undoStack = new();
    private readonly PriorityQueue<CommandRecord, int> priorityCommands = new();
    private readonly SortedDictionary<DateTime, List<CommandRecord>> commandHistory = new();
    private readonly HashSet<string> activeAlerts = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentQueue<CommandRecord> recentCommands = new();

    public IReadOnlyDictionary<string, bool> DeviceStates
    {
        get
        {
            lock (syncLock)
            {
                return new Dictionary<string, bool>(deviceStates, StringComparer.OrdinalIgnoreCase);
            }
        }
    }

    public int UndoCount
    {
        get
        {
            lock (syncLock)
            {
                return undoStack.Count;
            }
        }
    }

    public void EnqueueCommand(CommandRecord command)
    {
        lock (syncLock)
        {
            command.Status = "Pending";
            priorityCommands.Enqueue(command, command.IsCritical ? 0 : 1);
        }
    }

    public bool TryDequeueCommand(out CommandRecord? command)
    {
        lock (syncLock)
        {
            return priorityCommands.TryDequeue(out command, out _);
        }
    }

    public void RecordCommand(CommandRecord command)
    {
        lock (syncLock)
        {
            RecordCommandCore(command, true);
        }
    }

    public bool TryUndo(out CommandRecord? undoCommand)
    {
        lock (syncLock)
        {
            if (undoStack.Count == 0)
            {
                undoCommand = null;
                return false;
            }

            var previousCommand = undoStack.Pop();
            var key = CreateDeviceStateKey(previousCommand.DeviceIdentifier, previousCommand.CommandType);

            undoCommand = new CommandRecord
            {
                DeviceIdentifier = previousCommand.DeviceIdentifier,
                CommandType = previousCommand.CommandType,
                Value = previousCommand.PreviousValue,
                PreviousValue = previousCommand.Value,
                Status = "Completed",
                IsCritical = false,
                Timestamp = DateTime.UtcNow
            };

            deviceStates[key] = undoCommand.Value;
            AddToHistoryAndRecent(undoCommand);
            return true;
        }
    }

    public List<CommandRecord> GetRecentCommands()
    {
        lock (syncLock)
        {
            return recentCommands.ToArray()
                .OrderByDescending(command => command.Timestamp)
                .ToList();
        }
    }

    public List<CommandRecord> GetTimeline()
    {
        lock (syncLock)
        {
            return commandHistory
                .SelectMany(entry => entry.Value)
                .OrderBy(command => command.Timestamp)
                .ToList();
        }
    }

    public bool AddAlert(string alertId)
    {
        lock (syncLock)
        {
            return activeAlerts.Add(alertId);
        }
    }

    public bool RemoveAlert(string alertId)
    {
        lock (syncLock)
        {
            return activeAlerts.Remove(alertId);
        }
    }

    public string[] GetActiveAlerts()
    {
        lock (syncLock)
        {
            return activeAlerts.OrderBy(alert => alert).ToArray();
        }
    }

    private void RecordCommandCore(CommandRecord command, bool addToUndo)
    {
        var key = CreateDeviceStateKey(command.DeviceIdentifier, command.CommandType);
        deviceStates.TryGetValue(key, out bool currentValue);
        command.PreviousValue = currentValue;
        deviceStates[key] = command.Value;

        if (addToUndo)
        {
            undoStack.Push(command);
        }

        AddToHistoryAndRecent(command);
    }

    private void AddToHistoryAndRecent(CommandRecord command)
    {
        if (!commandHistory.TryGetValue(command.Timestamp, out var commands))
        {
            commands = new List<CommandRecord>();
            commandHistory[command.Timestamp] = commands;
        }

        commands.Add(command);
        recentCommands.Enqueue(command);

        while (recentCommands.Count > 500)
        {
            recentCommands.TryDequeue(out _);
        }
    }

    private static string CreateDeviceStateKey(string deviceIdentifier, string commandType)
    {
        return $"{deviceIdentifier}:{commandType}";
    }
}
