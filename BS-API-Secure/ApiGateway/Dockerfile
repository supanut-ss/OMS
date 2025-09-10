FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
#FROM mcr.microsoft.com/dotnet/aspnet:8.0-windowsservercore-ltsc2019 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
#FROM mcr.microsoft.com/dotnet/sdk:8.0-windowsservercore-ltsc2019 AS build
WORKDIR /src

# Copy โปรเจกต์ทั้งหมด
COPY ["./BS-API-Secure/ApiGateway", "ApiGateway/"]
COPY ["./BS-API-Secure/TokenManagement", "TokenManagement/"]

RUN dotnet restore "ApiGateway/ApiGateway.csproj"
RUN dotnet restore "TokenManagement/TokenManagement.csproj"

WORKDIR "/src/TokenManagement"
RUN dotnet build "TokenManagement.csproj" -c "Release" -o /app/build/TokenManagement

WORKDIR "/src/ApiGateway"
RUN dotnet build "ApiGateway.csproj" -c "Release" -o /app/build/ApiGateway

FROM build AS publish
WORKDIR "/src/ApiGateway"
RUN dotnet publish "ApiGateway.csproj" -c "Release" -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ApiGateway.dll"]
