#!/bin/bash

# AMS 2
docker-compose -f docker-compose.yml -f comp-ams2-local.yml -f ./servers/default/default.yml up --build
