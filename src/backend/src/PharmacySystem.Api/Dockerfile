FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/backend/Directory.Build.props .
COPY src/backend/src/PharmacySystem.Domain/PharmacySystem.Domain.csproj src/PharmacySystem.Domain/
COPY src/backend/src/PharmacySystem.Application/PharmacySystem.Application.csproj src/PharmacySystem.Application/
COPY src/backend/src/PharmacySystem.Infrastructure/PharmacySystem.Infrastructure.csproj src/PharmacySystem.Infrastructure/
COPY src/backend/src/PharmacySystem.Api/PharmacySystem.Api.csproj src/PharmacySystem.Api/
RUN dotnet restore src/PharmacySystem.Api/PharmacySystem.Api.csproj

COPY src/backend/ .
RUN dotnet publish src/PharmacySystem.Api/PharmacySystem.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "PharmacySystem.Api.dll"]
