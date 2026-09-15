namespace SmartX.Api.Models
{
    using System.Threading.Channels;

    public class TelemetryIngestionQueue<T>
    {
        private readonly Channel<T> channel;

        public TelemetryIngestionQueue(int capacity)
        {
            channel = Channel.CreateBounded<T>(
                new BoundedChannelOptions(capacity)
                {
                    FullMode = BoundedChannelFullMode.DropOldest,
                    SingleReader = false,
                    SingleWriter = false
                });
        }

        public bool TryEnqueue(T item)
        {
            return channel.Writer.TryWrite(item);
        }

        public async ValueTask<T> DequeueAsync(
            CancellationToken cancellationToken = default)
        {
            return await channel.Reader.ReadAsync(
                cancellationToken);
        }

        public int Count =>
            channel.Reader.Count;
    }
}
