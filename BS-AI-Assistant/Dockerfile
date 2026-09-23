FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
ARG NUGET_CA_CERT_B64=""
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& if [ -n "$NUGET_CA_CERT_B64" ]; then \
		echo "$NUGET_CA_CERT_B64" | base64 -d > /usr/local/share/ca-certificates/corporate-root.crt; \
		update-ca-certificates; \
	fi \
	&& rm -rf /var/lib/apt/lists/*
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
ARG BUILD_CONFIGURATION=Release
ARG NUGET_CA_CERT_B64=""
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates \
	&& if [ -n "$NUGET_CA_CERT_B64" ]; then \
		echo "$NUGET_CA_CERT_B64" | base64 -d > /usr/local/share/ca-certificates/corporate-root.crt; \
		update-ca-certificates; \
	fi \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /src

# Copy project files
COPY ["BS-AI-Assistant/AiAssistant", "BS-AI-Assistant/AiAssistant/"]

RUN dotnet restore "BS-AI-Assistant/AiAssistant/AiAssistant.csproj"

WORKDIR "/src/BS-AI-Assistant/AiAssistant"
RUN dotnet build "AiAssistant.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
WORKDIR "/src/BS-AI-Assistant/AiAssistant"
RUN dotnet publish "AiAssistant.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AiAssistant.dll"]

