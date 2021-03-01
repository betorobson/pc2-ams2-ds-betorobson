
FROM ubuntu:20.10

ARG servername

# Install prerequisites
RUN apt-get update \
    && DEBIAN_FRONTEND="noninteractive" apt-get install -y --no-install-recommends \
        apt-transport-https \
        ca-certificates \
        cabextract \
        git \
        gosu \
        gpg-agent \
        p7zip \
        pulseaudio \
        pulseaudio-utils \
        software-properties-common \
        tzdata \
        unzip \
        wget \
        zenity \
    && rm -rf /var/lib/apt/lists/*

# Install wine
ARG WINE_BRANCH="stable"
RUN wget -nv -O- https://dl.winehq.org/wine-builds/winehq.key | APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=1 apt-key add - \
    && apt-add-repository "deb https://dl.winehq.org/wine-builds/ubuntu/ $(grep VERSION_CODENAME= /etc/os-release | cut -d= -f2) main" \
    && dpkg --add-architecture i386 \
    && apt-get update \
    && DEBIAN_FRONTEND="noninteractive" apt-get install -y --install-recommends winehq-${WINE_BRANCH} \
    && rm -rf /var/lib/apt/lists/*

# Install winetricks
RUN wget -nv -O /usr/bin/winetricks https://raw.githubusercontent.com/Winetricks/winetricks/master/src/winetricks \
    && chmod +x /usr/bin/winetricks

ENV STEAM_APP=ams2ds

RUN mkdir /app

WORKDIR "/app"

COPY ams2ds.sh .
COPY pc2ds.sh .
COPY pc2ds.tar.gz .
COPY ams2ds.20210301.tar.gz .

RUN tar -zxf pc2ds.tar.gz && \
    rm pc2ds.tar.gz

RUN tar -zxf ams2ds.20210301.tar.gz && \
    rm ams2ds.20210301.tar.gz

COPY ams2ds-pc2ds-betorobson/ /app/pc2ds/
COPY ams2ds-pc2ds-betorobson/ /app/ams2ds/

COPY ./servers/${servername}/${servername}.cfg/ /app/pc2ds/
COPY ./servers/${servername}/${servername}.cfg/ /app/ams2ds/

RUN cat /app/pc2ds/${servername}.cfg >> /app/pc2ds/server.cfg \
    && cat /app/ams2ds/${servername}.cfg >> /app/ams2ds/server.cfg

RUN cat /app/${STEAM_APP}/server.cfg

RUN chmod +x pc2ds/DedicatedServerCmd.elf
RUN chmod +x pc2ds.sh ams2ds.sh

EXPOSE 9000 8766 8766/udp 27015 27015/udp 27016 27016/udp

CMD "./${STEAM_APP}.sh"

# # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #

# FROM cm2network/steamcmd:root

# RUN ls -la

# CMD ["bash"]
