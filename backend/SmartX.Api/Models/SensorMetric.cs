namespace SmartX.Api.Models
{
    public class SensorMetric
    {
        public string Name { get; set; } = string.Empty;

        public double Value { get; set; }

        public SensorMetric()
        {
        }

        public SensorMetric(string name, double value)
        {
            Name = name;
            Value = value;
        }

        public static SensorMetric operator +(
            SensorMetric left,
            SensorMetric right)
        {
            return new SensorMetric(
                $"{left.Name} + {right.Name}",
                left.Value + right.Value);
        }

        public static SensorMetric operator -(
            SensorMetric left,
            SensorMetric right)
        {
            return new SensorMetric(
                $"{left.Name} - {right.Name}",
                left.Value - right.Value);
        }
    }
}
