FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /app/target/tours-service-0.0.1-SNAPSHOT.jar /app/tours-service.jar
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v2.9.0/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar

EXPOSE 8083

CMD ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-jar", "/app/tours-service.jar"]
