# Project Cars 2 and Automobilista 2 Dedicated Server Docker

This is a Docker image for Project Cars 2 and Automobilista 2 dedicated serve with some extra features on admin web panel

## Set env STEAM_APP
```
# Project Cars 2
STEAM_APP=pc2ds

# Automobilista 2
STEAM_APP=ams2ds
```

## Running local
```
docker-compose -f docker-compose.yml -f comp-ams2-local.yml up --build
```

## Build Production Version
```
docker-compose -f docker-compose.yml -f comp-ams2.yml up --build
```

## Admin panel
http://localhost:10000

user: admin
pass: admin
