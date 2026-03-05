FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy project files
COPY ["../BS-OMS-API/OmsApi", "BS-Platform/BS-OMS-API/OmsApi/"]

RUN dotnet restore "BS-Platform/BS-OMS-API/OmsApi/OmsApi.csproj"

WORKDIR "/src/BS-Platform/BS-OMS-API/OmsApi"
RUN dotnet build "OmsApi.csproj" -c "Release" -o /app/build/BS-Platform/BS-OMS-API/OmsApi

FROM build AS publish
WORKDIR "/src/BS-Platform/BS-OMS-API/OmsApi"
RUN dotnet publish "OmsApi.csproj" -c "Release" -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "OmsApi.dll"]
