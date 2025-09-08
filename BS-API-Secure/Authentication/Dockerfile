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
COPY ["./BS-API-Secure/Authentication", "Authentication/"]
COPY ["./BS-API-Secure/TokenManagement", "TokenManagement/"]

RUN dotnet restore "Authentication/Authentication.csproj"
RUN dotnet restore "TokenManagement/TokenManagement.csproj"

WORKDIR "/src/TokenManagement"
RUN dotnet build "TokenManagement.csproj" -c $BUILD_CONFIGURATION -o /app/build/TokenManagement

WORKDIR "/src/Authentication"
RUN dotnet build "Authentication.csproj" -c $BUILD_CONFIGURATION -o /app/build/Authentication

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
WORKDIR "/src/Authentication"
RUN dotnet publish "Authentication.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Authentication.dll"]
