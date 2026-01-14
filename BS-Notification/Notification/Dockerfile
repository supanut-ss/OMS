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
COPY ["../BS-Notification/Notification", "BS-Platform/BS-Notification/Notification/"]
COPY ["../BS-API-Secure/TokenManagement", "BS-Platform/BS-API-Secure/TokenManagement/"]

RUN dotnet restore "BS-Platform/BS-Notification/Notification/Notification.csproj"
RUN dotnet restore "BS-Platform/BS-API-Secure/TokenManagement/TokenManagement.csproj"

WORKDIR "/src/BS-Platform/BS-API-Secure/TokenManagement"
RUN dotnet build "TokenManagement.csproj" -c "Release" -o /app/build/BS-Platform/BS-API-Secure/TokenManagement

WORKDIR "/src/BS-Platform/BS-Notification/Notification"
RUN dotnet build "Notification.csproj" -c "Release" -o /app/build/BS-Platform/BS-Notification/Notification

FROM build AS publish
WORKDIR "/src/BS-Platform/BS-Notification/Notification"
RUN dotnet publish "Notification.csproj" -c "Release" -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Notification.dll"]
