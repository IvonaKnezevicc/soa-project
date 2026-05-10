package com.soa.tours.observability;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.SpanContext;

public final class ObservabilityLog {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String SERVICE_NAME = "tours-service";

    private ObservabilityLog() {
    }

    public static void info(Logger logger, String message, Map<String, Object> fields) {
        logger.info(toJson("INFO", message, fields));
    }

    public static void warn(Logger logger, String message, Map<String, Object> fields) {
        logger.warn(toJson("WARN", message, fields));
    }

    public static void error(Logger logger, String message, Map<String, Object> fields) {
        logger.error(toJson("ERROR", message, fields));
    }

    private static String toJson(String level, String message, Map<String, Object> fields) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("service", SERVICE_NAME);
        payload.put("level", level);
        payload.put("traceId", currentTraceId());
        payload.put("message", message);

        if (fields != null) {
            payload.putAll(fields);
        }

        try {
            return OBJECT_MAPPER.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{\"service\":\"" + SERVICE_NAME + "\",\"level\":\"" + level + "\",\"traceId\":\""
                + currentTraceId() + "\",\"message\":\"" + message.replace("\"", "\\\"") + "\"}";
        }
    }

    private static String currentTraceId() {
        SpanContext spanContext = Span.current().getSpanContext();
        if (!spanContext.isValid()) {
            return "";
        }

        return spanContext.getTraceId();
    }
}
