#!/bin/sh
# Installed into the official nginx image at /docker-entrypoint.d/40-krateo-resolver.sh. The image's
# /docker-entrypoint.sh runs every /docker-entrypoint.d/*.sh (as root, before nginx starts) and then
# execs the default CMD (`nginx -g 'daemon off;'`), so this does NOT start nginx itself.
#
# It performs the boot-time substitutions in conf.d/default.conf that must be resolved from the
# runtime environment:
#   1. __NGINX_PORT__     <- FRONTEND_CONTAINER_PORT (default 8080). Makes the listen port
#      configurable so the installer's per-component exposePort (chart service.port) reaches nginx
#      itself — the container binds whatever the chart declares as containerPort/targetPort/probe,
#      instead of a hardcoded value. Without this the nginx image ignored the chart's port and
#      crashlooped on the probe (port mismatch).
#   2. __NGINX_RESOLVER__ <- the pod's cluster DNS resolver, injected into the /autopilot/ proxy so
#      kagent-ui resolves at REQUEST time (see conf.d/default.conf). A literal upstream forces
#      boot-time resolution and nginx crashes if kagent-ui is absent, taking down the whole portal
#      UI (D6). Deferring to request time makes /autopilot/ degrade to 502 instead.
set -e
CONF=/etc/nginx/conf.d/default.conf

# 1. Listen port from the environment (chart service.port -> FRONTEND_CONTAINER_PORT).
PORT="${FRONTEND_CONTAINER_PORT:-8080}"
sed -i "s/__NGINX_PORT__/${PORT}/g" "$CONF"

# 2. Cluster DNS resolver for the request-time /autopilot/ upstream.
RESOLVER="$(awk '/^nameserver/ {print $2; exit}' /etc/resolv.conf 2>/dev/null || true)"
: "${RESOLVER:=169.254.20.10}"   # NodeLocal DNSCache fallback if resolv.conf is unreadable
sed -i "s/__NGINX_RESOLVER__/${RESOLVER}/g" "$CONF"
