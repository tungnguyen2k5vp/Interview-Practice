FROM mcr.microsoft.com/dotnet/runtime:10.0
WORKDIR /opt/reader
COPY . .
USER 1654:1654
ENTRYPOINT ["dotnet", "/opt/reader/Reader.dll"]
