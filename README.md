# Project Cars 2 and Automobilista 2 Dedicated Server Docker

This is a Docker image for Project Cars 2 and Automobilista 2 dedicated serve with some extra features on admin web panel

## If you want only the custom panel

Copy folder `pc2ds-betorobson` into `<StemLibraryFolder>/stemapps/common/Automobilista 2 - Dedicated Server`

Overwrite server.cfg

Run DedicatedServerCmd.exe

For local browser open: `http://localhost:9000`

For remote browser open: `http://<public-ip>:9000`

user: admin
pass: admin
 * I suggest you change it in server.cfg

## To run in a Docker container

### Create your server configuration in AWS EC2

Install AWS CLI

Configure your AWS credentials

Create a EC2 instance named for example, `myserver`

Make a copy of /server/default/ folder to your server. Ex.: /server/myserver/

Change files names from default to myserver.cfg, myserver.yml, myserver.sh

Inside eache file, change references from default to myserver

Run it
```
$ ./servers/myserver/myserver.sh
```

### Set env STEAM_APP
```
# Project Cars 2
STEAM_APP=pc2ds

# Automobilista 2
STEAM_APP=ams2ds
```

### Running local
```
$ ./run-local.sh
```

### Build Production Version
```
$ ./servers/your-custom-server-name/your-custom-server-name.sh
```

### Admin panel
http://localhost:10000

user: admin
pass: default123

### Create AWS EC2 Instance
```
// create
$ docker-machine create --driver amazonec2 --amazonec2-region sa-east-1 --amazonec2-instance-type t2.micro instance-name

// reconnect
 eval $(docker-machine env instance-name)
```
