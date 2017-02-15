#!/bin/bash

forever stop tsge-discord-bot
sleep 1
rm *.log
rm tsge-discord.sqlite3.db
node create-database.js
./start-prod && tail -Fn100 out.log

