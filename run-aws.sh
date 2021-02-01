#!/bin/bash
eval $(docker-machine env steam03)
docker-compose -f docker-compose.yml -f comp-ams2.yml up --build -d
