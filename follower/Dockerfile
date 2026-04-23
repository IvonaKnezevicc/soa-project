FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY FollowerService.csproj ./
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /out /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=build /out .

EXPOSE 8082

ENTRYPOINT ["dotnet", "FollowerService.dll"]
