@echo off

Set OutputDir=output_log
Set OutputFileTimestamp=%date:~-2,2%-%date:~-7,2%-%date:~-10,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%

IF NOT EXIST %OutputDir% mkdir %OutputDir%

@echo on
DedicatedServerCmd.exe > %OutputDir%/%OutputFileTimestamp%.log 2>&1