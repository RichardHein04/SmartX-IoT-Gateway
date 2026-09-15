namespace SmartX.Api.Models
{
    public class TelemetryRingBuffer<T>
    {
        private readonly T[] buffer;

        private int nextIndex;

        private int count;

        public int Capacity => buffer.Length;

        public int Count => count;

        public TelemetryRingBuffer(int capacity)
        {
            if (capacity <= 0)
            {
                throw new ArgumentException(
                    "Capacity must be greater than zero.");
            }

            buffer = new T[capacity];
        }

        public void Add(T item)
        {
            buffer[nextIndex] = item;

            nextIndex = (nextIndex + 1) % buffer.Length;

            if (count < buffer.Length)
            {
                count++;
            }
        }

        public List<T> GetAll()
        {
            var result = new List<T>();

            int startIndex =
                count == buffer.Length
                    ? nextIndex
                    : 0;

            for (int i = 0; i < count; i++)
            {
                int index =
                    (startIndex + i) % buffer.Length;

                result.Add(buffer[index]);
            }

            return result;
        }
    }
}
