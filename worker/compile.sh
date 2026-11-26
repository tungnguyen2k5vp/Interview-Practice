set -eu
cd /tmp
IFS= read -r source
printf '%s' "$source" | base64 -d > Program.cs
IFS= read -r arguments
sdk=$(ls -d /usr/share/dotnet/sdk/10.*/Roslyn/bincore/csc.dll | tail -1)
refs=$(ls -d /usr/share/dotnet/packs/Microsoft.NETCore.App.Ref/10.*/ref/net10.0 | tail -1)
for dll in "$refs"/*.dll; do printf '%s\n' "-r:$dll"; done > refs.rsp
dotnet "$sdk" -nologo -noconfig -nostdlib+ -warn:0 -langversion:14 -main:Entry -target:exe -out:Task.dll @refs.rsp Program.cs || { result=$?; [ "$result" -eq 1 ] && exit 65; exit "$result"; }
printf '%s' '{"runtimeOptions":{"tfm":"net10.0","framework":{"name":"Microsoft.NETCore.App","version":"10.0.0"}}}' > Task.runtimeconfig.json
printf '%s' "$arguments" | base64 -d | dotnet Task.dll
