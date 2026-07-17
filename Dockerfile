FROM node:24.2.0-alpine3.22 as react-build
LABEL maintainer "Krateo <contact@krateo.io>"

ARG VERSION

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
# being sunset and which listens on 8080 as non-root; upstream listens on 80, matching the chart's
# containerPort = service.port = 80). Pin the current STABLE minor (1.30.x; even minor = stable in
# nginx's scheme) — auto-picks patch releases on rebuild, never jumps minors. (Mainline is 1.31.x.)
FROM nginx:1.30-alpine
LABEL maintainer "Krateo <contact@krateo.io>"

# The SPA build output. The chart mounts the runtime config.json at /app/config, so the doc root
# (set in nginx.conf) is /app — keep the app files here so /config/config.json resolves.
COPY --from=react-build /app/dist /app

# Replace the stock server with ours (listen 80 + SPA try_files + the /autopilot/ A2A proxy).
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Boot-time resolver injection. The official image's /docker-entrypoint.sh runs every
# /docker-entrypoint.d/*.sh (as root, before nginx) and then execs the default CMD (nginx -g
# 'daemon off;'), so we reuse the stock ENTRYPOINT/CMD and only drop in this hook.
COPY docker-entrypoint.sh /docker-entrypoint.d/40-krateo-resolver.sh
RUN chmod +x /docker-entrypoint.d/40-krateo-resolver.sh

EXPOSE 80
