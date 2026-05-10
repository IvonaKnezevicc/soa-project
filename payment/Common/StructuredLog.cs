using System.Diagnostics;
using System.Text.Json;

namespace PaymentService.Common;

public static class StructuredLog
{
    private const string ServiceName = "payment-service";

    public static void Info(string message, IReadOnlyDictionary<string, object?>? fields = null)
    {
        Write("INFO", message, fields);
    }

    public static void Warn(string message, IReadOnlyDictionary<string, object?>? fields = null)
    {
        Write("WARN", message, fields);
    }

    public static void Error(string message, IReadOnlyDictionary<string, object?>? fields = null)
    {
        Write("ERROR", message, fields);
    }

    private static void Write(string level, string message, IReadOnlyDictionary<string, object?>? fields)
    {
        var payload = new Dictionary<string, object?>
        {
            ["service"] = ServiceName,
            ["level"] = level,
            ["traceId"] = Activity.Current?.TraceId.ToString() ?? string.Empty,
            ["message"] = message
        };

        if (fields is not null)
        {
            foreach (var entry in fields)
            {
                payload[entry.Key] = entry.Value;
            }
        }

        Console.WriteLine(JsonSerializer.Serialize(payload));
    }
}
