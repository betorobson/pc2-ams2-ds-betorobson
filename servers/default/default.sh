#!/bin/bash
eval $(docker-machine env ec2-name)
docker-compose -f docker-compose.yml -f ./servers/default/default.yml up --build -d
