# Stage 1: Build the application with Maven and Java 17
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .
COPY src ./src

# Build the jar skipping all test compilation and execution
RUN mvn clean package -Dmaven.test.skip=true

# Stage 2: Create the runtime image
FROM eclipse-temurin:17-jre
WORKDIR /app

# Copy the built jar from the build stage
COPY --from=build /app/target/*.jar app.jar

# Render assigns a port dynamically via the PORT environment variable (default: 8080)
EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
