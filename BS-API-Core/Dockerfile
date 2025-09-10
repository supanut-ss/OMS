FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
#FROM mcr.microsoft.com/dotnet/aspnet:8.0-windowsservercore-ltsc2019 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
#FROM mcr.microsoft.com/dotnet/sdk:8.0-windowsservercore-ltsc2019 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

# Copy โปรเจกต์ทั้งหมด
COPY ["./BS-API-Core", "BS-API-Core/"]
COPY ["./BS-API-Secure/TokenManagement", "BS-API-Secure/TokenManagement/"]

RUN dotnet restore "BS-API-Core/BS-API-Core.csproj"
RUN dotnet restore "BS-API-Secure/TokenManagement/TokenManagement.csproj"

WORKDIR "/src/BS-API-Secure/TokenManagement"
RUN dotnet build "TokenManagement.csproj" -c $BUILD_CONFIGURATION -o /app/build/TokenManagement

WORKDIR "/src/BS-API-Core/"
RUN dotnet build "BS-API-Core.csproj" -c $BUILD_CONFIGURATION -o /app/build/BS-API-Core

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
WORKDIR "/src/BS-API-Core/"
RUN dotnet publish "BS-API-Core.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BS-API-Core.dll"]
