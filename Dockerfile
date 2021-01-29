FROM scottyhardy/docker-wine

ENV STEAM_APP=ams2ds

RUN mkdir /app

WORKDIR "/app"

COPY ams2ds.sh .
COPY pc2ds.sh .
COPY pc2ds.tar.gz .
COPY ams2ds.tar.gz .

RUN tar -zxf pc2ds.tar.gz && \
    rm pc2ds.tar.gz

RUN tar -zxf ams2ds.tar.gz && \
    rm ams2ds.tar.gz

COPY pc2ds-betorobson/ /app/pc2ds/
COPY pc2ds-betorobson/ /app/ams2ds/

RUN chmod +x pc2ds/DedicatedServerCmd.elf
RUN chmod +x pc2ds.sh ams2ds.sh

EXPOSE 9000 8766 8766/udp 27015 27015/udp 27016 27016/udp

CMD "./${STEAM_APP}.sh"
