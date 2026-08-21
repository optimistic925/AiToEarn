FROM alpine:3.22

RUN apk add --no-cache aws-cli

COPY probe.sh /usr/local/bin/rustfs-probe

RUN chmod +x /usr/local/bin/rustfs-probe

ENTRYPOINT ["/usr/local/bin/rustfs-probe"]
