# syntax=docker/dockerfile:1.7
#
# JVM image tuned for startup, using two ahead-of-time steps:
#   1. Spring AOT (processAot) generates the bean-definition code at build time; run with -Dspring.aot.enabled=true.
#   2. A JDK AOT cache (JEP 483/514) recorded from a training run, so classes start out loaded and linked.
#
#   docker build -t equifreight-api BE

# ---------- build ----------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /workspace
COPY gradlew settings.gradle build.gradle ./
COPY gradle gradle
COPY src src
# bootJar depends on processAot, so the jar already carries the generated __BeanDefinitions classes.
# The AOT cache only covers classes loaded from plain jars, so unpack the fat jar into app.jar + lib/.
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --no-daemon bootJar -x test \
    && find build/libs -name '*.jar' ! -name '*-plain.jar' -exec cp {} app.jar \; \
    && java -Djarmode=tools -jar app.jar extract --destination extracted

# ---------- train ----------
# Starts the app once against a throwaway Postgres (Flyway and Hibernate's schema validation need a real one)
# and records the AOT cache. Same base image as the runtime stage: the cache only works on the JVM that wrote it.
FROM eclipse-temurin:25-jre AS train
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/extracted ./
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
# spring.context.exit=onRefresh stops once the context is up, so the cache covers the whole startup path.
# -Xlog:aot=error hides the expected "Skipping ..." warnings for runtime-generated proxies and lambdas.
RUN PG=$(ls /usr/lib/postgresql) \
    && pg_ctlcluster "$PG" main start \
    && su postgres -c "psql -qc \"ALTER USER postgres PASSWORD 'train'\" && createdb cbrtsdb" \
    && DB_URL=jdbc:postgresql://localhost:5432/cbrtsdb DB_USERNAME=postgres DB_PASSWORD=train \
       java -Xlog:aot=error -XX:AOTCacheOutput=app.aot -Dspring.aot.enabled=true -Dspring.context.exit=onRefresh -jar app.jar \
    && pg_ctlcluster "$PG" main stop

# ---------- runtime ----------
FROM eclipse-temurin:25-jre
RUN groupadd --system app && useradd --system --gid app app
WORKDIR /app
# app.jar, lib/ and app.aot together: the cache is tied to this exact classpath (paths, sizes and mtimes).
COPY --from=train /app ./
USER app
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
# On startup the JVM may log a couple of "Failed to link AdapterHandlerEntry" warnings. They're harmless: it
# regenerates those adapters and still uses the rest of the cache. "AOT cache ... mismatch" would mean it's ignored.
ENTRYPOINT ["java", "-XX:AOTCache=app.aot", "-Dspring.aot.enabled=true", "-jar", "app.jar"]
