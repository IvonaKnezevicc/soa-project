package observability

import (
	"context"
	"strings"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func InitTracing(ctx context.Context, serviceName, endpoint string) (func(context.Context) error, error) {
	normalizedEndpoint := normalizeEndpoint(endpoint)
	exporter, err := otlptracegrpc.New(
		ctx,
		otlptracegrpc.WithEndpoint(normalizedEndpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		return nil, err
	}

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			"",
			attribute.String("service.name", serviceName),
		),
	)
	if err != nil {
		return nil, err
	}

	tracerProvider := sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(tracerProvider)
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		),
	)

	return tracerProvider.Shutdown, nil
}

func normalizeEndpoint(endpoint string) string {
	candidate := strings.TrimSpace(endpoint)
	if candidate == "" {
		return "jaeger:4317"
	}

	candidate = strings.TrimPrefix(candidate, "http://")
	candidate = strings.TrimPrefix(candidate, "https://")
	candidate = strings.TrimSuffix(candidate, "/")
	return candidate
}
