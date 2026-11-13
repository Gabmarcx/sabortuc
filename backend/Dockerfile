FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY SaborTuc.Api/ SaborTuc.Api/
RUN dotnet publish SaborTuc.Api/SaborTuc.Api.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

ENV Database__Provider=Sqlite
ENV Database__Sqlite="Data Source=/app/data/sabortuc.db"
RUN mkdir -p /app/data

ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-10000} exec dotnet SaborTuc.Api.dll"]
