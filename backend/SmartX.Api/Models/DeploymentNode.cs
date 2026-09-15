namespace SmartX.Api.Models
{
    public class DeploymentNode
    {
        public string Name { get; set; } = string.Empty;

        public string Type { get; set; } = string.Empty;

        public bool IsValid { get; set; } = true;

        public List<DeploymentNode> Children { get; set; } = new();
    }
}
