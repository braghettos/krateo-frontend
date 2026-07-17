#!/bin/sh
# Installed into the official nginx image at /docker-entrypoint.d/40-krateo-resolver.sh. The image's
# /docker-entrypoint.sh runs every /docker-entrypoint.d/*.sh (as root, before nginx starts) and then
# execs the default CMD (`nginx -g 'daemon off;'`), so this does NOT start nginx itself.
#
# It injects the pod's cluster DNS resolver into the /autopilot/ proxy so kagent-ui resolves at
# REQUEST time (see conf.d/default.conf). A literal upstream forces boot-time resolution and nginx
# crashes if kagent-ui is absent, taking down the whole portal UI (D6). Deferring to request time
# makes /autopilot/ degrade to 502 instead.
set -e
CONF=/etc/nginx/conf.d/default.conf
RESOLVER="$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null || true)"
: "${RESOLVER:=169.254.20.10}"   # NodeLocal DNSCache fallback if resolv.conf is unreadable
sed -i "s/__NGINX_RESOLVER__/${RESOLVER}/g" "$CONF"
