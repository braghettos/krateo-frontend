FROM node:24.2.0-alpine3.22 as react-build
LABEL maintainer "Krateo <contact@krateo.io>"

ARG VERSION
# release commit sha for the footer's build stamp — the image has no .git for vite's fallback
ARG APP_BUILD
ENV APP_BUILD=$APP_BUILD

WORKDIR /app
COPY . ./
RUN npm install
RUN npm version $VERSION
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build

# remove config folder that is used for local development
#in production a volume is mounted in the container
RUN rm -r dist/config 

# server environment — official upstream nginx (NOT bitnami/nginx, whose free Docker Hub images are
# being sunset). The listen port is configurable via FRONTEND_CONTAINER_PORT (default 8080) so the
# installer's per-component exposePort (the chart's service.port) drives what the container binds —
# containerPort = service.port = targetPort = probe port all agree. Pin the current STABLE minor
# (1.30.x; even minor = stable in nginx's scheme) — auto-picks patch releases on rebuild, never
# jumps minors. (Mainline is 1.31.x.) The official image runs as root before dropping to the nginx
# worker user, so binding a privileged or unprivileged port both work.
FROM nginx:1.30-alpine
LABEL maintainer "Krateo <contact@krateo.io>"

# The SPA build output. The chart mounts the runtime config.json at /app/config, so the doc root
# (set in nginx.conf) is /app — keep the app files here so /config/config.json resolves.
COPY --from=react-build /app/dist /app

# Replace the stock server with ours (listen __NGINX_PORT__ + SPA try_files + the /autopilot/ A2A
# proxy). __NGINX_PORT__ and __NGINX_RESOLVER__ are substituted at boot by 40-krateo-resolver.sh.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Boot-time substitutions (listen port + DNS resolver). The official image's /docker-entrypoint.sh
# runs every /docker-entrypoint.d/*.sh (as root, before nginx) and then execs the default CMD
# (nginx -g 'daemon off;'), so we reuse the stock ENTRYPOINT/CMD and only drop in this hook.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-krateo-resolver.sh
RUN chmod +x /docker-entrypoint.d/40-krateo-resolver.sh

# Default listen port; the chart overrides this from .Values.service.port (installer exposePort).
ENV FRONTEND_CONTAINER_PORT=8080
EXPOSE 8080
