using SmartX.Api.Models;

namespace SmartX.Api.Services
{
    public class DeploymentValidator
    {
        public List<string> Validate(
            DeploymentNode node)
        {
            var errors = new List<string>();

            ValidateNode(node, errors);

            return errors;
        }

        private void ValidateNode(
            DeploymentNode node,
            List<string> errors)
        {
            if (string.IsNullOrWhiteSpace(node.Name))
            {
                errors.Add(
                    "A deployment node is missing a name.");
            }

            if (string.IsNullOrWhiteSpace(node.Type))
            {
                errors.Add(
                    $"Deployment node '{node.Name}' is missing a type.");
            }

            if (!node.IsValid)
            {
                errors.Add(
                    $"Deployment node '{node.Name}' is marked invalid.");
            }

            foreach (var child in node.Children)
            {
                ValidateNode(child, errors);
            }
        }
    }
}
