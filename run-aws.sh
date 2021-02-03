#!/bin/bash
eval $(docker-machine env steamams2ds1)
docker-compose -f docker-compose.yml -f comp-ams2.yml up --build -d
