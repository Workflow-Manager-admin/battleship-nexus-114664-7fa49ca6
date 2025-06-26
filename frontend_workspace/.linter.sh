#!/bin/bash
cd /home/kavia/workspace/code-generation/battleship-nexus-114664-7fa49ca6/frontend_workspace/frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

