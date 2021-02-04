#!/bin/bash

# PC2
docker-compose -f docker-compose.yml -f comp-pc2-local.yml -f ./servers/default/default.yml up --build
