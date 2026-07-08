#!/bin/sh
# Inject the pod's cluster DNS resolver into the nginx autopilot proxy so kagent-ui resolves at
# REQUEST time (see location.conf /autopilot/). A literal upstream forces boot-time resolution and
# nginx crashes if kagent-ui is absent, taking down the whole portal UI (D6). Deferring to request
# time makes /autopilot/ degrade to 502 instead.
set -e
CONF=/opt/bitnami/nginx/conf/bitnami/location.conf
RESOLVER="$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null || true)"
: "${RESOLVER:=169.254.20.10}"   # NodeLocal DNSCache fallback if resolv.conf is unreadable
sed -i "s/__NGINX_RESOLVER__/${RESOLVER}/g" "$CONF"
exec nginx -g 'daemon off;'
