FROM maven:3.9-eclipse-temurin-17 AS jasperrunner
WORKDIR /src/JasperRunner
COPY JasperRunner/pom.xml .
COPY JasperRunner/src/ src/
COPY ReportViewer/Fonts/ ../ReportViewer/Fonts/
RUN mvn -q package -DskipTests

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-dejavu \
        fonts-liberation \
        fonts-thai-tlwg \
        openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*
COPY ReportViewer/Fonts/ /usr/share/fonts/truetype/bs-report/
RUN fc-cache -f -v

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY ReportViewer/ReportViewer.csproj ReportViewer/
RUN dotnet restore ReportViewer/ReportViewer.csproj
COPY ReportViewer/ ReportViewer/
WORKDIR /src/ReportViewer
RUN dotnet publish ReportViewer.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
COPY --from=jasperrunner /src/JasperRunner/target/jasper-runner-1.0.0-jar-with-dependencies.jar /app/jasper-runner/jasper-runner.jar
ENTRYPOINT ["dotnet", "ReportViewer.dll"]
