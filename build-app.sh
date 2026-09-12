#!/bin/bash
# Run this once on your Mac to create the desktop launcher app
PROJ="$HOME/Documents/GitHub/kojo-financial-os"

cat > /tmp/kojo_launcher.applescript << 'AS'
set projPOSIX to (POSIX path of (path to home folder)) & "Documents/GitHub/kojo-financial-os"
set logFile to "/tmp/kojo-os.log"
do shell script "lsof -ti:3000 | xargs kill -9 2>/dev/null; true"
delay 0.5
do shell script "cd " & quoted form of projPOSIX & " && npm run dev > " & logFile & " 2>&1 &"
set serverReady to false
repeat 30 times
  try
    do shell script "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 | grep -q '200\\|302\\|307'"
    set serverReady to true
    exit repeat
  end try
  delay 1
end repeat
do shell script "open -a 'Google Chrome' --args --app=http://localhost:3000 --window-size=1440,900"
AS

osacompile -o "$PROJ/Kojo Financial OS.app" /tmp/kojo_launcher.applescript
echo "✅ Kojo Financial OS.app created at $PROJ"
echo "Drag it to your Dock or Applications folder."
